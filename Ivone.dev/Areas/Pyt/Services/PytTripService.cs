using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Ivone.dev.Areas.Pyt.Dtos;
using Ivone.dev.Data.Models.Pyt;
using ivone.dev.Data.Contexts;
using Microsoft.EntityFrameworkCore;

namespace Ivone.dev.Areas.Pyt.Services;

public class PytTripService
{
    public static readonly IReadOnlyList<string> PurposePresets =
    [
        "Office -> Client",
        "Delivery",
        "Service",
        "Internal"
    ];

    private readonly AppDbContext _db;

    public PytTripService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PytTripBootstrapResponse> GetBootstrapAsync(int userId, int? selectedVehicleId)
    {
        var vehicles = await QueryVehiclesAsync();
        var drivers = await QueryDriversAsync();
        var locations = await QueryLocationsAsync();
        var defaults = await GetDefaultsAsync(userId, selectedVehicleId);

        return new PytTripBootstrapResponse
        {
            Vehicles = vehicles,
            Drivers = drivers,
            Locations = locations,
            PurposePresets = PurposePresets,
            Defaults = defaults
        };
    }

    public async Task<PytTripDefaultsResponse> GetDefaultsAsync(int userId, int? selectedVehicleId)
    {
        var preference = await _db.PytUserPreferences.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
        var userLastTrip = await _db.PytTrips.AsNoTracking()
            .Where(x => x.CreatedByUserId == userId)
            .OrderByDescending(x => x.EndDateTime)
            .FirstOrDefaultAsync();

        var vehicleId = selectedVehicleId
            ?? preference?.LastVehicleId
            ?? userLastTrip?.VehicleId
            ?? await _db.PytVehicles.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.Id).Select(x => (int?)x.Id).FirstOrDefaultAsync();

        var driverId = preference?.LastDriverId
            ?? userLastTrip?.DriverId
            ?? await _db.PytDrivers.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.Id).Select(x => (int?)x.Id).FirstOrDefaultAsync();

        var lastTripForVehicle = vehicleId.HasValue
            ? await _db.PytTrips.AsNoTracking().Where(x => x.VehicleId == vehicleId.Value).OrderByDescending(x => x.EndDateTime).FirstOrDefaultAsync()
            : null;

        var now = DateTime.UtcNow;
        var startDate = lastTripForVehicle is not null
            ? lastTripForVehicle.EndDateTime.Date.AddDays(1).AddHours(8)
            : now.Date.AddDays(-1).AddHours(8);

        var endDate = now.Date.AddHours(18);
        if (endDate < startDate)
        {
            endDate = startDate;
        }

        var selectedVehicle = vehicleId.HasValue
            ? await _db.PytVehicles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == vehicleId.Value)
            : null;

        var startMileage = lastTripForVehicle?.EndMileage
            ?? selectedVehicle?.LastMileage
            ?? 0;

        var typicalDistance = Math.Max(1, preference?.TypicalDistanceKm ?? 50);
        var endMileageSuggestion = startMileage + typicalDistance;

        var startLocationId = lastTripForVehicle?.EndLocationId
            ?? preference?.LastStartLocationId
            ?? await _db.PytLocations.AsNoTracking().Where(x => x.IsActive).OrderByDescending(x => x.IsFavorite).ThenBy(x => x.Name).Select(x => (int?)x.Id).FirstOrDefaultAsync();

        var purpose = !string.IsNullOrWhiteSpace(preference?.LastPurpose)
            ? preference!.LastPurpose!
            : userLastTrip?.Purpose ?? PurposePresets[0];

        return new PytTripDefaultsResponse
        {
            VehicleId = vehicleId,
            DriverId = driverId,
            StartDateTime = startDate,
            EndDateTime = endDate,
            StartLocationId = startLocationId,
            EndLocationId = startLocationId,
            StartMileage = startMileage,
            EndMileageSuggestion = endMileageSuggestion,
            Purpose = purpose,
            TypicalDistanceKm = typicalDistance,
            LastVehicleMileage = selectedVehicle?.LastMileage ?? lastTripForVehicle?.EndMileage
        };
    }

    public async Task<PytTripListResponse> GetTripsAsync(
        int userId,
        DateTime? from,
        DateTime? to,
        int? vehicleId,
        int? driverId)
    {
        var query = _db.PytTrips.AsNoTracking()
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .Include(x => x.StartLocation)
            .Include(x => x.EndLocation)
            .Where(x => x.CreatedByUserId == userId)
            .AsQueryable();

        if (from.HasValue)
        {
            query = query.Where(x => x.StartDateTime >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(x => x.EndDateTime <= to.Value);
        }

        if (vehicleId.HasValue)
        {
            query = query.Where(x => x.VehicleId == vehicleId.Value);
        }

        if (driverId.HasValue)
        {
            query = query.Where(x => x.DriverId == driverId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.StartDateTime)
            .Take(500)
            .Select(x => MapTrip(x))
            .ToListAsync();

        return new PytTripListResponse
        {
            Items = items,
            Count = items.Count
        };
    }

    public async Task<PytTripDto?> GetTripAsync(int userId, int tripId)
    {
        var trip = await _db.PytTrips.AsNoTracking()
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .Include(x => x.StartLocation)
            .Include(x => x.EndLocation)
            .FirstOrDefaultAsync(x => x.Id == tripId && x.CreatedByUserId == userId);

        return trip is null ? null : MapTrip(trip);
    }

    public async Task<PytTripCreateResponse> CreateTripAsync(int userId, PytTripUpsertRequest request)
    {
        await ValidateRequestAsync(request);

        var entity = new PytTrip
        {
            VehicleId = request.VehicleId,
            DriverId = request.DriverId,
            StartDateTime = request.StartDateTime,
            EndDateTime = request.EndDateTime,
            StartLocationId = request.StartLocationId,
            EndLocationId = request.EndLocationId,
            StartMileage = request.StartMileage,
            EndMileage = request.EndMileage,
            Purpose = request.Purpose.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = userId
        };

        _db.PytTrips.Add(entity);
        await _db.SaveChangesAsync();

        await UpdateVehicleLastMileageAsync(entity.VehicleId, entity.EndMileage);
        await UpdatePreferenceAsync(userId, entity);

        var created = await GetTripAsync(userId, entity.Id)
            ?? throw new InvalidOperationException("Created trip could not be loaded.");

        var warnings = BuildWarnings(entity).ToArray();
        var nextDefaults = BuildNextDefaults(entity, await GetTypicalDistanceAsync(userId));

        return new PytTripCreateResponse
        {
            Trip = created,
            Warnings = warnings,
            NextDefaults = nextDefaults
        };
    }

    public async Task<PytTripCreateResponse?> UpdateTripAsync(int userId, int tripId, PytTripUpsertRequest request)
    {
        await ValidateRequestAsync(request);

        var entity = await _db.PytTrips.FirstOrDefaultAsync(x => x.Id == tripId && x.CreatedByUserId == userId);
        if (entity is null)
        {
            return null;
        }

        entity.VehicleId = request.VehicleId;
        entity.DriverId = request.DriverId;
        entity.StartDateTime = request.StartDateTime;
        entity.EndDateTime = request.EndDateTime;
        entity.StartLocationId = request.StartLocationId;
        entity.EndLocationId = request.EndLocationId;
        entity.StartMileage = request.StartMileage;
        entity.EndMileage = request.EndMileage;
        entity.Purpose = request.Purpose.Trim();
        entity.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        await _db.SaveChangesAsync();

        await UpdateVehicleLastMileageAsync(entity.VehicleId, entity.EndMileage);
        await UpdatePreferenceAsync(userId, entity);

        var updated = await GetTripAsync(userId, entity.Id)
            ?? throw new InvalidOperationException("Updated trip could not be loaded.");

        return new PytTripCreateResponse
        {
            Trip = updated,
            Warnings = BuildWarnings(entity).ToArray(),
            NextDefaults = BuildNextDefaults(entity, await GetTypicalDistanceAsync(userId))
        };
    }

    public async Task<bool> DeleteTripAsync(int userId, int tripId)
    {
        var entity = await _db.PytTrips.FirstOrDefaultAsync(x => x.Id == tripId && x.CreatedByUserId == userId);
        if (entity is null)
        {
            return false;
        }

        _db.PytTrips.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<PytVehicleDto>> QueryVehiclesAsync(bool activeOnly = false)
    {
        var query = _db.PytVehicles.AsNoTracking().AsQueryable();
        if (activeOnly)
        {
            query = query.Where(x => x.IsActive);
        }

        var items = await query
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.PlateNumber)
            .Select(x => new PytVehicleDto
            {
                Id = x.Id,
                PlateNumber = x.PlateNumber,
                MakeModel = x.MakeModel,
                FuelType = x.FuelType,
                AvgConsumption = x.AvgConsumption,
                LastMileage = x.LastMileage,
                IsActive = x.IsActive,
                LastTripDate = _db.PytTrips
                    .Where(t => t.VehicleId == x.Id)
                    .OrderByDescending(t => t.EndDateTime)
                    .Select(t => (DateTime?)t.EndDateTime)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return items;
    }

    public async Task<IReadOnlyList<PytDriverDto>> QueryDriversAsync(bool activeOnly = false)
    {
        var query = _db.PytDrivers.AsNoTracking().AsQueryable();
        if (activeOnly)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.Name)
            .Select(x => new PytDriverDto
            {
                Id = x.Id,
                Name = x.Name,
                LicenseNumber = x.LicenseNumber,
                IsActive = x.IsActive
            })
            .ToListAsync();
    }

    public async Task<IReadOnlyList<PytLocationDto>> QueryLocationsAsync(bool activeOnly = false)
    {
        var query = _db.PytLocations.AsNoTracking().AsQueryable();
        if (activeOnly)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderByDescending(x => x.IsFavorite)
            .ThenByDescending(x => x.IsActive)
            .ThenBy(x => x.Name)
            .Select(x => new PytLocationDto
            {
                Id = x.Id,
                Name = x.Name,
                Address = x.Address,
                IsActive = x.IsActive,
                IsFavorite = x.IsFavorite
            })
            .ToListAsync();
    }

    private static PytTripDto MapTrip(PytTrip trip)
    {
        return new PytTripDto
        {
            Id = trip.Id,
            VehicleId = trip.VehicleId,
            VehicleLabel = $"{trip.Vehicle.PlateNumber} • {trip.Vehicle.MakeModel}",
            DriverId = trip.DriverId,
            DriverName = trip.Driver.Name,
            StartDateTime = trip.StartDateTime,
            EndDateTime = trip.EndDateTime,
            StartLocationId = trip.StartLocationId,
            StartLocationName = trip.StartLocation.Name,
            EndLocationId = trip.EndLocationId,
            EndLocationName = trip.EndLocation.Name,
            StartMileage = trip.StartMileage,
            EndMileage = trip.EndMileage,
            Distance = trip.EndMileage - trip.StartMileage,
            Purpose = trip.Purpose,
            Notes = trip.Notes,
            CreatedAt = trip.CreatedAt,
            CreatedByUserId = trip.CreatedByUserId
        };
    }

    private async Task ValidateRequestAsync(PytTripUpsertRequest request)
    {
        var errors = new List<string>();

        if (request.VehicleId <= 0)
        {
            errors.Add("Vehicle is required.");
        }

        if (request.DriverId <= 0)
        {
            errors.Add("Driver is required.");
        }

        if (request.EndMileage < request.StartMileage)
        {
            errors.Add("End mileage must be greater than or equal to start mileage.");
        }

        if (request.EndDateTime < request.StartDateTime)
        {
            errors.Add("End date must be greater than or equal to start date.");
        }

        if (string.IsNullOrWhiteSpace(request.Purpose))
        {
            errors.Add("Purpose is required.");
        }

        var vehicleExists = await _db.PytVehicles.AnyAsync(x => x.Id == request.VehicleId);
        if (!vehicleExists)
        {
            errors.Add("Selected vehicle does not exist.");
        }

        var driverExists = await _db.PytDrivers.AnyAsync(x => x.Id == request.DriverId);
        if (!driverExists)
        {
            errors.Add("Selected driver does not exist.");
        }

        var startLocationExists = await _db.PytLocations.AnyAsync(x => x.Id == request.StartLocationId);
        if (!startLocationExists)
        {
            errors.Add("Selected start location does not exist.");
        }

        var endLocationExists = await _db.PytLocations.AnyAsync(x => x.Id == request.EndLocationId);
        if (!endLocationExists)
        {
            errors.Add("Selected end location does not exist.");
        }

        if (errors.Count > 0)
        {
            throw new ArgumentException(string.Join(" ", errors));
        }
    }

    private static IEnumerable<PytTripWarning> BuildWarnings(PytTrip trip)
    {
        var distance = trip.EndMileage - trip.StartMileage;
        if (distance == 0)
        {
            yield return new PytTripWarning
            {
                Code = "DistanceZero",
                Message = "Distance is 0 km. Verify if this is expected."
            };
        }

        if (distance > 800)
        {
            yield return new PytTripWarning
            {
                Code = "LargeDistance",
                Message = "Distance looks unusually high. Please double-check mileage values."
            };
        }

        if (trip.EndDateTime > DateTime.UtcNow.AddDays(7))
        {
            yield return new PytTripWarning
            {
                Code = "FutureEndDate",
                Message = "End date is far in the future."
            };
        }
    }

    private static PytTripDefaultsResponse BuildNextDefaults(PytTrip trip, int typicalDistance)
    {
        var nextStartDate = trip.EndDateTime.Date.AddDays(1).AddHours(8);
        return new PytTripDefaultsResponse
        {
            VehicleId = trip.VehicleId,
            DriverId = trip.DriverId,
            StartDateTime = nextStartDate,
            EndDateTime = nextStartDate,
            StartLocationId = trip.EndLocationId,
            EndLocationId = trip.EndLocationId,
            StartMileage = trip.EndMileage,
            EndMileageSuggestion = trip.EndMileage + typicalDistance,
            Purpose = trip.Purpose,
            TypicalDistanceKm = typicalDistance,
            LastVehicleMileage = trip.EndMileage
        };
    }

    private async Task UpdateVehicleLastMileageAsync(int vehicleId, int endMileage)
    {
        var vehicle = await _db.PytVehicles.FirstOrDefaultAsync(x => x.Id == vehicleId);
        if (vehicle is null)
        {
            return;
        }

        vehicle.LastMileage = endMileage;
        await _db.SaveChangesAsync();
    }

    private async Task UpdatePreferenceAsync(int userId, PytTrip trip)
    {
        var preference = await _db.PytUserPreferences.FirstOrDefaultAsync(x => x.UserId == userId);
        if (preference is null)
        {
            preference = new PytUserPreference
            {
                UserId = userId
            };
            _db.PytUserPreferences.Add(preference);
        }

        preference.LastVehicleId = trip.VehicleId;
        preference.LastDriverId = trip.DriverId;
        preference.LastStartLocationId = trip.StartLocationId;
        preference.LastEndLocationId = trip.EndLocationId;
        preference.LastPurpose = trip.Purpose;
        preference.TypicalDistanceKm = await GetTypicalDistanceAsync(userId);
        preference.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    private async Task<int> GetTypicalDistanceAsync(int userId)
    {
        var averageDistance = await _db.PytTrips.AsNoTracking()
            .Where(x => x.CreatedByUserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .Select(x => x.EndMileage - x.StartMileage)
            .DefaultIfEmpty(50)
            .AverageAsync();

        var rounded = (int)Math.Round(averageDistance);
        return Math.Clamp(rounded, 1, 2000);
    }
}

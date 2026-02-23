using System;
using System.Collections.Generic;

namespace Ivone.dev.Areas.Pyt.Dtos;

public sealed class PytRegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int? OrganizationId { get; set; }
}

public sealed class PytLoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class PytAuthUserResponse
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public int? OrganizationId { get; set; }
}

public sealed class PytVehicleDto
{
    public int Id { get; set; }
    public string PlateNumber { get; set; } = string.Empty;
    public string MakeModel { get; set; } = string.Empty;
    public string FuelType { get; set; } = string.Empty;
    public decimal? AvgConsumption { get; set; }
    public int? LastMileage { get; set; }
    public DateTime? LastTripDate { get; set; }
    public bool IsActive { get; set; }
}

public sealed class PytVehicleUpsertRequest
{
    public string PlateNumber { get; set; } = string.Empty;
    public string MakeModel { get; set; } = string.Empty;
    public string FuelType { get; set; } = string.Empty;
    public decimal? AvgConsumption { get; set; }
    public int? LastMileage { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class PytDriverDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? LicenseNumber { get; set; }
    public bool IsActive { get; set; }
}

public sealed class PytDriverUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public string? LicenseNumber { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class PytLocationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool IsActive { get; set; }
    public bool IsFavorite { get; set; }
}

public sealed class PytLocationUpsertRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFavorite { get; set; }
}

public sealed class PytTripUpsertRequest
{
    public int VehicleId { get; set; }
    public int DriverId { get; set; }
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public int StartLocationId { get; set; }
    public int EndLocationId { get; set; }
    public int StartMileage { get; set; }
    public int EndMileage { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public sealed class PytTripDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string VehicleLabel { get; set; } = string.Empty;
    public int DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public int StartLocationId { get; set; }
    public string StartLocationName { get; set; } = string.Empty;
    public int EndLocationId { get; set; }
    public string EndLocationName { get; set; } = string.Empty;
    public int StartMileage { get; set; }
    public int EndMileage { get; set; }
    public int Distance { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public int CreatedByUserId { get; set; }
}

public sealed class PytTripWarning
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public sealed class PytTripDefaultsResponse
{
    public int? VehicleId { get; set; }
    public int? DriverId { get; set; }
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public int? StartLocationId { get; set; }
    public int? EndLocationId { get; set; }
    public int StartMileage { get; set; }
    public int? EndMileageSuggestion { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public int TypicalDistanceKm { get; set; }
    public int? LastVehicleMileage { get; set; }
}

public sealed class PytTripCreateResponse
{
    public PytTripDto Trip { get; set; } = null!;
    public IReadOnlyList<PytTripWarning> Warnings { get; set; } = Array.Empty<PytTripWarning>();
    public PytTripDefaultsResponse NextDefaults { get; set; } = null!;
}

public sealed class PytTripListResponse
{
    public IReadOnlyList<PytTripDto> Items { get; set; } = Array.Empty<PytTripDto>();
    public int Count { get; set; }
}

public sealed class PytTripBootstrapResponse
{
    public IReadOnlyList<PytVehicleDto> Vehicles { get; set; } = Array.Empty<PytVehicleDto>();
    public IReadOnlyList<PytDriverDto> Drivers { get; set; } = Array.Empty<PytDriverDto>();
    public IReadOnlyList<PytLocationDto> Locations { get; set; } = Array.Empty<PytLocationDto>();
    public IReadOnlyList<string> PurposePresets { get; set; } = Array.Empty<string>();
    public PytTripDefaultsResponse Defaults { get; set; } = null!;
}

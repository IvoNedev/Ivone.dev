using System;
using System.Linq;
using System.Threading.Tasks;
using Ivone.dev.Areas.Pyt.Auth;
using Ivone.dev.Areas.Pyt.Dtos;
using Ivone.dev.Areas.Pyt.Services;
using Ivone.dev.Data.Models.Pyt;
using ivone.dev.Data.Contexts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ivone.dev.Areas.Pyt.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = PytAuthenticationDefaults.Scheme)]
[Route("api/pyt/vehicles")]
public class PytVehiclesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PytTripService _tripService;

    public PytVehiclesController(AppDbContext db, PytTripService tripService)
    {
        _db = db;
        _tripService = tripService;
    }

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] bool activeOnly = false)
    {
        var items = await _tripService.QueryVehiclesAsync(activeOnly);
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<PytVehicleDto>> Create([FromBody] PytVehicleUpsertRequest request)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return validation;
        }

        var normalizedPlate = request.PlateNumber.Trim().ToUpperInvariant();
        var exists = await _db.PytVehicles.AnyAsync(x => x.PlateNumber == normalizedPlate);
        if (exists)
        {
            return Conflict("Vehicle with this plate number already exists.");
        }

        var entity = new PytVehicle
        {
            PlateNumber = normalizedPlate,
            MakeModel = request.MakeModel.Trim(),
            FuelType = request.FuelType.Trim(),
            AvgConsumption = request.AvgConsumption,
            LastMileage = request.LastMileage,
            IsActive = request.IsActive
        };

        _db.PytVehicles.Add(entity);
        await _db.SaveChangesAsync();

        var created = (await _tripService.QueryVehiclesAsync()).First(x => x.Id == entity.Id);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PytVehicleDto>> Update(int id, [FromBody] PytVehicleUpsertRequest request)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return validation;
        }

        var entity = await _db.PytVehicles.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        var normalizedPlate = request.PlateNumber.Trim().ToUpperInvariant();
        var exists = await _db.PytVehicles.AnyAsync(x => x.PlateNumber == normalizedPlate && x.Id != id);
        if (exists)
        {
            return Conflict("Vehicle with this plate number already exists.");
        }

        entity.PlateNumber = normalizedPlate;
        entity.MakeModel = request.MakeModel.Trim();
        entity.FuelType = request.FuelType.Trim();
        entity.AvgConsumption = request.AvgConsumption;
        entity.LastMileage = request.LastMileage;
        entity.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        var updated = (await _tripService.QueryVehiclesAsync()).First(x => x.Id == entity.Id);
        return Ok(updated);
    }

    [HttpPost("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var entity = await _db.PytVehicles.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok();
    }

    private ActionResult? Validate(PytVehicleUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PlateNumber))
        {
            return BadRequest("Plate number is required.");
        }

        if (string.IsNullOrWhiteSpace(request.MakeModel))
        {
            return BadRequest("Make/model is required.");
        }

        if (string.IsNullOrWhiteSpace(request.FuelType))
        {
            return BadRequest("Fuel type is required.");
        }

        if (request.LastMileage.HasValue && request.LastMileage.Value < 0)
        {
            return BadRequest("Last mileage cannot be negative.");
        }

        return null;
    }
}

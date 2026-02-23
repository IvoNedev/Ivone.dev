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
[Route("api/pyt/drivers")]
public class PytDriversController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PytTripService _tripService;

    public PytDriversController(AppDbContext db, PytTripService tripService)
    {
        _db = db;
        _tripService = tripService;
    }

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] bool activeOnly = false)
    {
        var items = await _tripService.QueryDriversAsync(activeOnly);
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<PytDriverDto>> Create([FromBody] PytDriverUpsertRequest request)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return validation;
        }

        var entity = new PytDriver
        {
            Name = request.Name.Trim(),
            LicenseNumber = string.IsNullOrWhiteSpace(request.LicenseNumber) ? null : request.LicenseNumber.Trim(),
            IsActive = request.IsActive
        };

        _db.PytDrivers.Add(entity);
        await _db.SaveChangesAsync();

        var created = (await _tripService.QueryDriversAsync()).First(x => x.Id == entity.Id);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PytDriverDto>> Update(int id, [FromBody] PytDriverUpsertRequest request)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return validation;
        }

        var entity = await _db.PytDrivers.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Name = request.Name.Trim();
        entity.LicenseNumber = string.IsNullOrWhiteSpace(request.LicenseNumber) ? null : request.LicenseNumber.Trim();
        entity.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        var updated = (await _tripService.QueryDriversAsync()).First(x => x.Id == entity.Id);
        return Ok(updated);
    }

    [HttpPost("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var entity = await _db.PytDrivers.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok();
    }

    private ActionResult? Validate(PytDriverUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Driver name is required.");
        }

        return null;
    }
}

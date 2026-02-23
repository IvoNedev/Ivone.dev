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
[Route("api/pyt/locations")]
public class PytLocationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PytTripService _tripService;

    public PytLocationsController(AppDbContext db, PytTripService tripService)
    {
        _db = db;
        _tripService = tripService;
    }

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] bool activeOnly = false)
    {
        var items = await _tripService.QueryLocationsAsync(activeOnly);
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<PytLocationDto>> Create([FromBody] PytLocationUpsertRequest request)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return validation;
        }

        var entity = new PytLocation
        {
            Name = request.Name.Trim(),
            Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
            IsActive = request.IsActive,
            IsFavorite = request.IsFavorite
        };

        _db.PytLocations.Add(entity);
        await _db.SaveChangesAsync();

        var created = (await _tripService.QueryLocationsAsync()).First(x => x.Id == entity.Id);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PytLocationDto>> Update(int id, [FromBody] PytLocationUpsertRequest request)
    {
        var validation = Validate(request);
        if (validation is not null)
        {
            return validation;
        }

        var entity = await _db.PytLocations.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Name = request.Name.Trim();
        entity.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        entity.IsActive = request.IsActive;
        entity.IsFavorite = request.IsFavorite;

        await _db.SaveChangesAsync();

        var updated = (await _tripService.QueryLocationsAsync()).First(x => x.Id == entity.Id);
        return Ok(updated);
    }

    [HttpPost("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var entity = await _db.PytLocations.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok();
    }

    private ActionResult? Validate(PytLocationUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Location name is required.");
        }

        return null;
    }
}

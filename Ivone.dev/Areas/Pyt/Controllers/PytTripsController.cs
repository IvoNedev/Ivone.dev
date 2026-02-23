using System;
using System.Threading.Tasks;
using Ivone.dev.Areas.Pyt.Auth;
using Ivone.dev.Areas.Pyt.Dtos;
using Ivone.dev.Areas.Pyt.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ivone.dev.Areas.Pyt.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = PytAuthenticationDefaults.Scheme)]
[Route("api/pyt/trips")]
public class PytTripsController : ControllerBase
{
    private readonly PytTripService _tripService;
    private readonly PytExportService _exportService;

    public PytTripsController(PytTripService tripService, PytExportService exportService)
    {
        _tripService = tripService;
        _exportService = exportService;
    }

    [HttpGet("bootstrap")]
    public async Task<ActionResult<PytTripBootstrapResponse>> Bootstrap([FromQuery] int? vehicleId = null)
    {
        var userId = PytUserContext.GetRequiredUserId(User);
        var payload = await _tripService.GetBootstrapAsync(userId, vehicleId);
        return Ok(payload);
    }

    [HttpGet("defaults")]
    public async Task<ActionResult<PytTripDefaultsResponse>> Defaults([FromQuery] int? vehicleId = null)
    {
        var userId = PytUserContext.GetRequiredUserId(User);
        var defaults = await _tripService.GetDefaultsAsync(userId, vehicleId);
        return Ok(defaults);
    }

    [HttpGet]
    public async Task<ActionResult<PytTripListResponse>> List(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? vehicleId = null,
        [FromQuery] int? driverId = null)
    {
        var userId = PytUserContext.GetRequiredUserId(User);
        var trips = await _tripService.GetTripsAsync(userId, from, to, vehicleId, driverId);
        return Ok(trips);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PytTripDto>> Get(int id)
    {
        var userId = PytUserContext.GetRequiredUserId(User);
        var trip = await _tripService.GetTripAsync(userId, id);
        return trip is null ? NotFound() : Ok(trip);
    }

    [HttpPost]
    public async Task<ActionResult<PytTripCreateResponse>> Create([FromBody] PytTripUpsertRequest request)
    {
        var userId = PytUserContext.GetRequiredUserId(User);

        try
        {
            var result = await _tripService.CreateTripAsync(userId, request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PytTripCreateResponse>> Update(int id, [FromBody] PytTripUpsertRequest request)
    {
        var userId = PytUserContext.GetRequiredUserId(User);

        try
        {
            var result = await _tripService.UpdateTripAsync(userId, id, request);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = PytUserContext.GetRequiredUserId(User);
        var removed = await _tripService.DeleteTripAsync(userId, id);
        return removed ? Ok() : NotFound();
    }

    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? vehicleId = null,
        [FromQuery] int? driverId = null)
    {
        var userId = PytUserContext.GetRequiredUserId(User);
        var trips = await _tripService.GetTripsAsync(userId, from, to, vehicleId, driverId);
        var bytes = _exportService.BuildExcel(trips.Items, from, to);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"pyt-trips-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx");
    }

    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? vehicleId = null,
        [FromQuery] int? driverId = null)
    {
        var userId = PytUserContext.GetRequiredUserId(User);
        var trips = await _tripService.GetTripsAsync(userId, from, to, vehicleId, driverId);
        var bytes = _exportService.BuildPdf(trips.Items, from, to);
        return File(bytes,
            "application/pdf",
            $"pyt-trips-{DateTime.UtcNow:yyyyMMddHHmmss}.pdf");
    }
}

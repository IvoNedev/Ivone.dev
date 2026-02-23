using Ivone.dev.Timer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Ivone.dev.Controllers;

[ApiController]
[Route("api/timer")]
public sealed class TimerController : ControllerBase
{
    private readonly ITimerConfigService _timerConfigService;
    private readonly IHubContext<LiveUpdateHub> _hubContext;
    private readonly ILogger<TimerController> _logger;

    public TimerController(
        ITimerConfigService timerConfigService,
        IHubContext<LiveUpdateHub> hubContext,
        ILogger<TimerController> logger)
    {
        _timerConfigService = timerConfigService;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpGet("status")]
    public async Task<ActionResult<TimerStatusResponse>> GetStatus(CancellationToken cancellationToken)
    {
        var response = await _timerConfigService.GetStatusAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost("access")]
    public async Task<ActionResult<TimerPublicConfigResponse>> Access(
        [FromBody] TimerPasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _timerConfigService.GetGuestConfigAsync(request?.Password, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return ToErrorResult(ex);
        }
    }

    [HttpPost("admin/load")]
    public async Task<ActionResult<TimerAdminConfigResponse>> LoadAdmin(
        [FromBody] TimerPasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _timerConfigService.LoadAdminConfigAsync(request?.Password, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return ToErrorResult(ex);
        }
    }

    [HttpPost("admin/save")]
    public async Task<ActionResult<TimerAdminConfigResponse>> SaveAdmin(
        [FromBody] TimerAdminSaveRequest request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new { message = "Request payload is required." });
        }

        try
        {
            var response = await _timerConfigService.SaveAdminConfigAsync(request, cancellationToken);
            await BroadcastTimerUpdateAsync(cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return ToErrorResult(ex);
        }
    }

    [HttpPost("admin/override/start")]
    public async Task<ActionResult<TimerAdminConfigResponse>> StartOverride(
        [FromBody] TimerOverrideStartRequest request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new { message = "Request payload is required." });
        }

        try
        {
            var response = await _timerConfigService.StartOverrideAsync(request, cancellationToken);
            await BroadcastTimerUpdateAsync(cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return ToErrorResult(ex);
        }
    }

    [HttpPost("admin/override/clear")]
    public async Task<ActionResult<TimerAdminConfigResponse>> ClearOverride(
        [FromBody] TimerPasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _timerConfigService.ClearOverrideAsync(request?.Password, cancellationToken);
            await BroadcastTimerUpdateAsync(cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return ToErrorResult(ex);
        }
    }

    private ActionResult ToErrorResult(Exception exception)
    {
        if (exception is TimerUnauthorizedException)
        {
            return Unauthorized(new { message = exception.Message });
        }

        if (exception is TimerValidationException)
        {
            return BadRequest(new { message = exception.Message });
        }

        if (exception is TimerConflictException)
        {
            return Conflict(new { message = exception.Message });
        }

        _logger.LogError(exception, "Unexpected timer API error.");
        return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unexpected timer error." });
    }

    private async Task BroadcastTimerUpdateAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync(
                "ReceiveUpdate",
                "timer-config-updated",
                DateTime.UtcNow.ToString("O"),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Timer update broadcast failed.");
        }
    }
}

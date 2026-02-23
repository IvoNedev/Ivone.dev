using Ivone.dev.Blackjack;
using Microsoft.AspNetCore.Mvc;

[Route("api/bj")]
[ApiController]
public class BlackjackController : ControllerBase
{
    private readonly BlackjackTrainerService _trainerService;

    public BlackjackController(BlackjackTrainerService trainerService)
    {
        _trainerService = trainerService;
    }

    [HttpPost("session")]
    public IActionResult CreateSession([FromBody] CreateBlackjackSessionRequest? request)
    {
        request ??= new CreateBlackjackSessionRequest();

        var config = new SessionConfig
        {
            Mode = request.Mode,
            Rules = request.Rules ?? new Rules(),
            Aids = request.Aids ?? new UiAids(),
            BetSpread = request.BetSpread,
            StartingBankrollUnits = request.StartingBankrollUnits
        };

        var snapshot = _trainerService.CreateSession(config);
        return Ok(snapshot);
    }

    [HttpGet("session/{gameId}")]
    public IActionResult GetSession(string gameId)
    {
        try
        {
            return Ok(_trainerService.GetSnapshot(gameId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("session/{gameId}/deal")]
    public IActionResult DealRound(string gameId, [FromBody] DealRequest? request)
    {
        request ??= new DealRequest();

        try
        {
            return Ok(_trainerService.DealRound(gameId, request.BetUnits));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("session/{gameId}/action")]
    public IActionResult ApplyAction(string gameId, [FromBody] ActionRequest request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Action))
        {
            return BadRequest(new { error = "Action is required." });
        }

        if (!Enum.TryParse<BlackjackAction>(request.Action, ignoreCase: true, out var action))
        {
            return BadRequest(new { error = $"Unknown action '{request.Action}'." });
        }

        try
        {
            return Ok(_trainerService.ApplyAction(gameId, action));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("session/{gameId}/count-guess")]
    public IActionResult SubmitCountGuess(string gameId, [FromBody] CountGuessRequest request)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        try
        {
            return Ok(_trainerService.SubmitCountGuess(gameId, request.RunningCountGuess, request.TrueCountGuess));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}

public sealed class CreateBlackjackSessionRequest
{
    public TrainingMode Mode { get; set; } = TrainingMode.Guided;
    public Rules? Rules { get; set; }
    public UiAids? Aids { get; set; }
    public int BetSpread { get; set; } = 8;
    public decimal StartingBankrollUnits { get; set; } = 200m;
}

public sealed class DealRequest
{
    public int BetUnits { get; set; } = 1;
}

public sealed class ActionRequest
{
    public string Action { get; set; } = string.Empty;
}

public sealed class CountGuessRequest
{
    public int RunningCountGuess { get; set; }
    public decimal TrueCountGuess { get; set; }
}

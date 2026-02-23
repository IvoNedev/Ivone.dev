using Ivone.dev.Poker;
using Microsoft.AspNetCore.Mvc;

[Route("api/poker")]
[ApiController]
public sealed class PokerController : ControllerBase
{
    private readonly PokerOddsService _pokerOddsService;

    public PokerController(PokerOddsService pokerOddsService)
    {
        _pokerOddsService = pokerOddsService;
    }

    [HttpPost("simulate")]
    public IActionResult Simulate([FromBody] PokerSimulationRequest? request)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        try
        {
            return Ok(_pokerOddsService.Simulate(request));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

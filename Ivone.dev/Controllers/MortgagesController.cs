using Microsoft.AspNetCore.Mvc;

[Route("api/[controller]")]
[ApiController]
public class MortgagesController : ControllerBase
{
    private readonly IMortgageScenarioService _service;

    public MortgagesController(IMortgageScenarioService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(data);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] MortgageScenario scenario)
    {
        await _service.AddAsync(scenario);
        return Ok();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] MortgageScenario scenario)
    {
        scenario.Id = id;
        await _service.UpdateAsync(scenario);
        return Ok();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return Ok();
    }
}

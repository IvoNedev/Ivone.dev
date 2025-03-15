using LifeInTheUK.Web.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LifeInTheUK.Web.Controllers
{
    [Route("api/tests")]
    [ApiController]
    public class TestController : ControllerBase
    {
        private readonly ITestService _testService;

        public TestController(ITestService testService)
        {
            _testService = testService;
        }

        [HttpGet]
        public async Task<IActionResult> GetTests()
        {
            IEnumerable<Test> tests = await _testService.GetAllTestsAsync();
            return Ok(tests);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTest(int id)
        {
            Test test = await _testService.GetTestByIdAsync(id);
            if (test == null)
                return NotFound();
            return Ok(test);
        }

        // New endpoint for endless mode: returns all questions in random order.
        [HttpGet("endless")]
        public async Task<IActionResult> GetEndlessTest()
        {
            IEnumerable<Question> questions = await _testService.GetEndlessTestAsync();
            return Ok(questions);
        }
    }
}

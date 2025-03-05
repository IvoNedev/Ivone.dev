using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.blazor.Pages
{

    public class CVModel : PageModel
    {
        private readonly IMortgageScenarioService _mortgageScenarioService;
        private readonly ILogger<CVModel> _logger;

        public CVModel(ILogger<CVModel> logger, IMortgageScenarioService mortgageScenarioService)
        {
            _logger = logger;
            _mortgageScenarioService = mortgageScenarioService;
        }
    }
}

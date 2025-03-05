using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.blazor.Pages
{

    public class MortgageModel : PageModel
    {
        private readonly IMortgageScenarioService _mortgageScenarioService;
        private readonly ILogger<MortgageModel> _logger;

        public MortgageModel(ILogger<MortgageModel> logger, IMortgageScenarioService mortgageScenarioService)
        {
            _logger = logger;
            _mortgageScenarioService = mortgageScenarioService;
        }

        public List<MortgageScenario> MortgageScenarios { get; set; }

        public async Task OnGetAsync()
        {
            // Fetch data from the service
            MortgageScenarios = await _mortgageScenarioService.GetAllAsync();
            string stop = "here";
        }
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.blazor.Pages
{

    public class IndexModel : PageModel
    {
        private readonly IMortgageScenarioService _mortgageScenarioService;
        private readonly ILogger<IndexModel> _logger;

        public IndexModel(ILogger<IndexModel> logger, IMortgageScenarioService mortgageScenarioService)
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

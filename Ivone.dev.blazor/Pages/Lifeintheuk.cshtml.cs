using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.blazor.Pages
{
    public class LifeintheukModel : PageModel
    {
        private readonly ILogger<LifeintheukModel> _logger;

        public LifeintheukModel(ILogger<LifeintheukModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {

        }
    }
}

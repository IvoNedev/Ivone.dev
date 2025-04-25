using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.Pages
{

    public class CVModel : PageModel
    {
        private readonly ILogger<CVModel> _logger;

        public CVModel(ILogger<CVModel> logger)
        {
            _logger = logger;
        }
    }
}

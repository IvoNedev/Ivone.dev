using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.Pages
{

    public class AcontoModel : PageModel
    {
        private readonly ILogger<AcontoModel> _logger;

        public AcontoModel(ILogger<AcontoModel> logger)
        {
            _logger = logger;
        }
    }
}

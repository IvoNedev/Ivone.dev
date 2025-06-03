using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.Pages
{

    public class MealPrepModel : PageModel
    {
        private readonly ILogger<MealPrepModel> _logger;

        public MealPrepModel(ILogger<MealPrepModel> logger)
        {
            _logger = logger;
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.Areas.Pyt.Pages;

[Authorize(AuthenticationSchemes = Ivone.dev.Areas.Pyt.Auth.PytAuthenticationDefaults.Scheme)]
public class IndexModel : PageModel
{
    public IActionResult OnGet()
    {
        return RedirectToPage("/Trips/Index");
    }
}

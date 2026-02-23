using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.Areas.Pyt.Pages.Vehicles;

[Authorize(AuthenticationSchemes = Ivone.dev.Areas.Pyt.Auth.PytAuthenticationDefaults.Scheme)]
public class IndexModel : PageModel
{
    public void OnGet()
    {
    }
}

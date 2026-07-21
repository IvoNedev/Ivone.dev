using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.Pages;

public sealed class TodoModel : PageModel
{
    public void OnGet()
    {
        Response.Headers.CacheControl = "no-store, no-cache, max-age=0";
        Response.Headers.Pragma = "no-cache";
    }
}

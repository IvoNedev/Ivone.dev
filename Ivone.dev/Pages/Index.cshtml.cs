using System.Globalization;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.Pages;

public sealed class IndexModel : PageModel
{
    private readonly IActionDescriptorCollectionProvider _actionDescriptorProvider;

    public IndexModel(IActionDescriptorCollectionProvider actionDescriptorProvider)
    {
        _actionDescriptorProvider = actionDescriptorProvider;
    }

    public IReadOnlyList<PageLink> PageLinks { get; private set; } = Array.Empty<PageLink>();

    public void OnGet()
    {
        var links = _actionDescriptorProvider.ActionDescriptors.Items
            .OfType<PageActionDescriptor>()
            .Where(IsNavigablePage)
            .Select(CreatePageLink)
            .Where(link => link is not null)
            .Cast<PageLink>()
            .GroupBy(link => link.Url, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .OrderBy(link => link.Title, StringComparer.OrdinalIgnoreCase)
            .ToList();

        PageLinks = links;
    }

    private static bool IsNavigablePage(PageActionDescriptor descriptor)
    {
        var viewPath = descriptor.ViewEnginePath ?? string.Empty;
        if (viewPath.StartsWith("/Shared", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (viewPath.StartsWith("/_", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }

    private static PageLink? CreatePageLink(PageActionDescriptor descriptor)
    {
        var url = BuildUrl(descriptor);
        if (string.IsNullOrWhiteSpace(url) || url.Contains('{'))
        {
            return null;
        }

        if (string.Equals(url, "/", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (ShouldHideUrl(url))
        {
            return null;
        }

        return new PageLink(GetDisplayTitle(url), url);
    }

    private static string BuildUrl(PageActionDescriptor descriptor)
    {
        var routeTemplate = descriptor.AttributeRouteInfo?.Template?.Trim();
        if (!string.IsNullOrWhiteSpace(routeTemplate))
        {
            var routedPath = routeTemplate.StartsWith('/') ? routeTemplate : $"/{routeTemplate}";
            return NormalizeIndexPath(routedPath);
        }

        var viewPath = descriptor.ViewEnginePath ?? "/";
        var pathWithArea = string.IsNullOrWhiteSpace(descriptor.AreaName)
            ? viewPath
            : $"/{descriptor.AreaName}{viewPath}";

        return NormalizeIndexPath(pathWithArea);
    }

    private static string NormalizeIndexPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "/";
        }

        var output = path.StartsWith('/') ? path : $"/{path}";

        if (output.Equals("/Index", StringComparison.OrdinalIgnoreCase))
        {
            return "/";
        }

        if (output.EndsWith("/Index", StringComparison.OrdinalIgnoreCase))
        {
            return output[..^"/Index".Length];
        }

        return output;
    }

    private static string BuildTitle(string url)
    {
        var normalized = url.Trim('/');
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return "Home";
        }

        var segments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var titleSegments = segments.Select(ToWords);
        return string.Join(" / ", titleSegments);
    }

    private static string ToWords(string segment)
    {
        if (string.IsNullOrWhiteSpace(segment))
        {
            return string.Empty;
        }

        var normalized = segment.Replace("-", " ").Replace("_", " ");
        var output = new List<char>(normalized.Length + 8);

        for (var i = 0; i < normalized.Length; i++)
        {
            var current = normalized[i];
            if (i > 0 &&
                char.IsUpper(current) &&
                char.IsLetter(normalized[i - 1]) &&
                !char.IsWhiteSpace(normalized[i - 1]))
            {
                output.Add(' ');
            }

            output.Add(current);
        }

        var words = new string(output.ToArray()).ToLowerInvariant();
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(words);
    }

    private static bool ShouldHideUrl(string url)
    {
        if (string.Equals(url, "/CV", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (string.Equals(url, "/Error", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (url.StartsWith("/Pyt/", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }

    private static string GetDisplayTitle(string url)
    {
        if (string.Equals(url, "/Bj", StringComparison.OrdinalIgnoreCase))
        {
            return "BlackJack";
        }

        return BuildTitle(url);
    }

    public sealed class PageLink
    {
        public PageLink(string title, string url)
        {
            Title = title;
            Url = url;
        }

        public string Title { get; }
        public string Url { get; }
    }
}

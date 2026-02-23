using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ivone.dev.Pages;

public class HelperXModel : PageModel
{
    private readonly IWebHostEnvironment _environment;

    public HelperXModel(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public IActionResult OnGetManifest()
    {
        var manifest = new HelperXManifest(BuildPhaseList(), BuildOrchestratorList());
        return new JsonResult(manifest);
    }

    private IReadOnlyList<PhaseDescriptor> BuildPhaseList()
    {
        var root = Path.Combine(_environment.WebRootPath ?? string.Empty, "HelperX", "Definitive");
        var phases = new List<PhaseDescriptor>();

        if (!Directory.Exists(root))
        {
            return phases;
        }

        foreach (var directory in Directory.GetDirectories(root))
        {
            var phaseName = Path.GetFileName(directory);
            if (string.IsNullOrWhiteSpace(phaseName) || !phaseName.StartsWith("Phase", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var readmes = Directory
                .GetFiles(directory, "*.md", SearchOption.TopDirectoryOnly)
                .Select(Path.GetFileName)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .OrderBy(name => ExtractNumber(Path.GetFileNameWithoutExtension(name)))
                .ThenBy(name => name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            phases.Add(new PhaseDescriptor(phaseName, readmes));
        }

        return phases
            .OrderBy(phase => ExtractNumber(phase.Name))
            .ThenBy(phase => phase.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static int ExtractNumber(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return int.MaxValue;
        }

        var digits = new string(value.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var number) ? number : int.MaxValue;
    }

    private IReadOnlyList<string> BuildOrchestratorList()
    {
        var root = Path.Combine(_environment.WebRootPath ?? string.Empty, "HelperX", "Definitive", "Orchestrators");
        if (!Directory.Exists(root))
        {
            return Array.Empty<string>();
        }

        return Directory
            .GetFiles(root, "*.md", SearchOption.TopDirectoryOnly)
            .Select(Path.GetFileName)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public sealed record HelperXManifest(IReadOnlyList<PhaseDescriptor> Phases, IReadOnlyList<string> Orchestrators);

    public sealed record PhaseDescriptor(string Name, IReadOnlyList<string> Readmes);
}

using System.Globalization;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Ivone.dev.ThreeDAnimation;

public sealed partial class ScenePlanner
{
    public ScenePlanResponse Plan(ScenePlanRequest request)
    {
        var prompt = request.Prompt?.Trim() ?? string.Empty;
        var normalized = prompt.ToLowerInvariant();
        var operations = new List<JsonObject>();
        var warnings = new List<string>();

        if (string.IsNullOrWhiteSpace(prompt))
        {
            warnings.Add("The prompt was empty.");
        }

        if (normalized.Contains("camera") &&
            (normalized.Contains("closer") || normalized.Contains("close")))
        {
            operations.Add(Operation("updateCamera",
                ("id", "camera_main"),
                ("framing", "closer")));
        }

        if (normalized.Contains("monochrome") ||
            normalized.Contains("black and white") ||
            normalized.Contains("grayscale"))
        {
            operations.Add(Operation("updateStyle", ("style", "monochrome")));
        }

        if ((normalized.Contains("add") || normalized.Contains("create")) &&
            normalized.Contains("cube"))
        {
            var color = normalized.Contains("red")
                ? "#D85A4F"
                : normalized.Contains("green")
                    ? "#5B9A68"
                    : "#5E80D5";
            operations.Add(Operation("addPrimitive",
                ("primitive", "box"),
                ("name", color == "#5E80D5" ? "Blue Cube" : "Cube"),
                ("color", color)));
        }

        if ((normalized.Contains("add") || normalized.Contains("create")) &&
            normalized.Contains("sphere"))
        {
            operations.Add(Operation("addPrimitive",
                ("primitive", "sphere"),
                ("name", "Sphere"),
                ("color", "#D6A954")));
        }

        if (normalized.Contains("robot") && normalized.Contains("slower"))
        {
            operations.Add(Operation("updateClip",
                ("clipId", "john_walk"),
                ("speedMultiplier", 0.7)));
        }

        var trimMatch = TrimPattern().Match(normalized);
        if (trimMatch.Success &&
            double.TryParse(trimMatch.Groups[1].Value, NumberStyles.Number, CultureInfo.InvariantCulture, out var end))
        {
            operations.Add(Operation("trimTimeline", ("end", Math.Clamp(end, 2, 14))));
        }

        if (operations.Count == 0 && !string.IsNullOrWhiteSpace(prompt))
        {
            if (normalized.Contains("stand") ||
                normalized.Contains("walk") ||
                normalized.Contains("door") ||
                normalized.Contains("leave"))
            {
                operations.Add(Operation("updateClip",
                    ("clipId", "john_speak"),
                    ("text", "We need to leave.")));
                operations.Add(Operation("addClip",
                    ("type", "Stand"),
                    ("entityId", "entity_john"),
                    ("start", 4)));
                operations.Add(Operation("addClip",
                    ("type", "WalkTo"),
                    ("entityId", "entity_john"),
                    ("target", "entity_door"),
                    ("start", 5.6)));
                operations.Add(Operation("addClip",
                    ("type", "Open"),
                    ("entityId", "entity_door"),
                    ("start", 9)));
                operations.Add(Operation("updateCamera",
                    ("type", "CameraFollow"),
                    ("target", "entity_john")));
            }
            else
            {
                warnings.Add("No supported scene command could be resolved from this prompt.");
            }
        }

        return new ScenePlanResponse(
            $"patch_{Guid.NewGuid():N}",
            operations,
            warnings,
            "deterministic-rule-planner-v1",
            DateTimeOffset.UtcNow);
    }

    private static JsonObject Operation(string op, params (string Name, object? Value)[] values)
    {
        var operation = new JsonObject { ["op"] = op };
        foreach (var (name, value) in values)
        {
            operation[name] = JsonValue.Create(value);
        }

        return operation;
    }

    [GeneratedRegex(@"remove everything after\s+(\d+(?:\.\d+)?)\s*(?:seconds?|s)?", RegexOptions.CultureInvariant)]
    private static partial Regex TrimPattern();
}

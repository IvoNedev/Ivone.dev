using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;

namespace Ivone.dev.ThreeDAnimation;

public sealed class ScenePlanner
{
    private const string PlannerVersion = "canonical-action-planner-v2";

    public ScenePlanResponse Plan(ScenePlanRequest request)
    {
        var prompt = request.Prompt?.Trim() ?? string.Empty;
        var previousPrompt = request.PreviousPrompt?.Trim() ?? string.Empty;
        var normalized = Normalize(prompt);
        var normalizedPrevious = Normalize(previousPrompt);
        var inputHash = BuildInputHash(
            normalized,
            normalizedPrevious,
            request.Scene.GetRawText());
        var changes = NaturalLanguageActionCompiler.AnalyzeChanges(previousPrompt, prompt);

        if (string.IsNullOrWhiteSpace(prompt))
        {
            return new ScenePlanResponse(
                $"patch_{inputHash[..24]}",
                [],
                ["The prompt was empty."],
                PlannerVersion,
                changes);
        }

        if (!string.IsNullOrWhiteSpace(previousPrompt) &&
            string.Equals(normalized, normalizedPrevious, StringComparison.Ordinal))
        {
            return new ScenePlanResponse(
                $"patch_{inputHash[..24]}",
                [],
                ["The prompt is unchanged from the latest applied version."],
                PlannerVersion,
                changes);
        }

        var result = NaturalLanguageActionCompiler.Compile(
            prompt,
            request.Scene,
            inputHash);
        return new ScenePlanResponse(
            $"patch_{inputHash[..24]}",
            result.Operations,
            result.Warnings,
            PlannerVersion,
            changes);
    }

    private static string BuildInputHash(
        string normalizedPrompt,
        string normalizedPreviousPrompt,
        string sceneJson)
    {
        var scene = JsonNode.Parse(sceneJson) as JsonObject;
        scene?.Remove("currentPrompt");
        scene?.Remove("promptHistory");
        var plannerSceneJson = scene?.ToJsonString() ?? sceneJson;
        var input =
            $"{PlannerVersion}\n{normalizedPreviousPrompt}\n{normalizedPrompt}\n{plannerSceneJson}";
        return Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes(input)))
            .ToLowerInvariant();
    }

    private static string Normalize(string value) =>
        string.Join(' ', value
            .Replace("**", string.Empty)
            .ToLowerInvariant()
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}

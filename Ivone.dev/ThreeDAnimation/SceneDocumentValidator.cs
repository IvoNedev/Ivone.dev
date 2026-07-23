using System.Text.Json;

namespace Ivone.dev.ThreeDAnimation;

public static class SceneDocumentValidator
{
    public static SceneValidationResponse Validate(JsonElement document)
    {
        var errors = new List<string>();
        var warnings = new List<string>();

        if (document.ValueKind != JsonValueKind.Object)
        {
            errors.Add("The scene document must be a JSON object.");
            return new SceneValidationResponse(false, errors, warnings);
        }

        RequireObject(document, "scene", errors);
        RequireObject(document, "environment", errors);
        RequireArray(document, "entities", errors);
        RequireObject(document, "timeline", errors);

        if (document.TryGetProperty("schemaVersion", out var schemaVersion))
        {
            if (schemaVersion.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(schemaVersion.GetString()))
            {
                errors.Add("schemaVersion must be a non-empty string.");
            }
        }
        else
        {
            errors.Add("schemaVersion is required.");
        }

        var entityIds = new HashSet<string>(StringComparer.Ordinal);
        if (document.TryGetProperty("entities", out var entities) &&
            entities.ValueKind == JsonValueKind.Array)
        {
            foreach (var entity in entities.EnumerateArray())
            {
                if (entity.ValueKind != JsonValueKind.Object ||
                    !entity.TryGetProperty("id", out var idElement) ||
                    idElement.ValueKind != JsonValueKind.String ||
                    string.IsNullOrWhiteSpace(idElement.GetString()))
                {
                    errors.Add("Every entity must have a non-empty string id.");
                    continue;
                }

                var id = idElement.GetString()!;
                if (!entityIds.Add(id))
                {
                    errors.Add($"Duplicate entity id '{id}'.");
                }

                if (!entity.TryGetProperty("position", out var position) ||
                    !IsNumberArray(position, 3))
                {
                    errors.Add($"Entity '{id}' must have a three-number position.");
                }

                if (!entity.TryGetProperty("rotation", out var rotation) ||
                    !IsNumberArray(rotation, 3))
                {
                    errors.Add($"Entity '{id}' must have a three-number rotation.");
                }

                if (!entity.TryGetProperty("scale", out var scale) ||
                    !IsNumberArray(scale, 3))
                {
                    errors.Add($"Entity '{id}' must have a three-number scale.");
                }
            }
        }

        if (document.TryGetProperty("timeline", out var timeline) &&
            timeline.ValueKind == JsonValueKind.Object &&
            timeline.TryGetProperty("tracks", out var tracks) &&
            tracks.ValueKind == JsonValueKind.Array)
        {
            foreach (var track in tracks.EnumerateArray())
            {
                if (track.TryGetProperty("entityId", out var entityId) &&
                    entityId.ValueKind == JsonValueKind.String &&
                    !entityIds.Contains(entityId.GetString()!))
                {
                    warnings.Add($"Timeline track references missing entity '{entityId.GetString()}'.");
                }
            }
        }

        return new SceneValidationResponse(errors.Count == 0, errors, warnings);
    }

    private static void RequireObject(JsonElement document, string property, ICollection<string> errors)
    {
        if (!document.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Object)
        {
            errors.Add($"{property} must be an object.");
        }
    }

    private static void RequireArray(JsonElement document, string property, ICollection<string> errors)
    {
        if (!document.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Array)
        {
            errors.Add($"{property} must be an array.");
        }
    }

    private static bool IsNumberArray(JsonElement value, int length) =>
        value.ValueKind == JsonValueKind.Array &&
        value.GetArrayLength() == length &&
        value.EnumerateArray().All(item => item.ValueKind == JsonValueKind.Number);
}

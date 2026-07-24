using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Ivone.dev.ThreeDAnimation;

public static partial class NaturalLanguageActionCompiler
{
    private const string Blue = "#5E80D5";
    private const string Red = "#D85A4F";
    private const string Green = "#5B9A68";
    private const string Yellow = "#D6A954";

    private static readonly string[] VerbVocabulary =
    [
        "add", "create", "place", "move", "moves", "step", "walk", "run",
        "jump", "duck", "crouch", "stand", "sit", "rotate", "turn", "face",
        "look", "open", "close", "follow", "fall", "falls", "drop", "scale",
        "grow", "shrink", "say", "says", "speak", "remove", "hide", "show"
    ];

    private static readonly string[] NounVocabulary =
    [
        "character", "person", "john", "robot", "box", "cube", "sphere",
        "door", "desk", "chair", "camera", "light", "room", "ground", "screen"
    ];

    public static CompileResult Compile(
        string prompt,
        JsonElement scene,
        string inputHash)
    {
        var normalized = Normalize(prompt);
        var warnings = new List<string>();
        var operations = new List<JsonObject>();
        var actions = new List<JsonObject>();
        var entities = ReadEntities(scene);

        if (normalized.Contains("monochrome") ||
            normalized.Contains("black and white") ||
            normalized.Contains("grayscale"))
        {
            operations.Add(Operation("updateStyle", ("style", "monochrome")));
        }

        var target = ResolveTarget(normalized, entities);
        var primitive = ResolvePrimitive(normalized);
        if (target is null && primitive is not null)
        {
            var entityId = $"entity_generated_{inputHash[..16]}_00";
            var initialColor = InitialColor(normalized);
            var position = InitialPosition(normalized, primitive);
            target = new EntityInfo(
                entityId,
                $"{ColorName(initialColor)} {Title(primitive)}".Trim(),
                primitive,
                position,
                [0, 0, 0],
                [1, 1, 1],
                initialColor);
            entities.Add(target);
            operations.Add(Operation("addPrimitive",
                ("entityId", entityId),
                ("primitive", primitive),
                ("name", target.Name),
                ("color", initialColor),
                ("position", position)));
        }

        if (target is null)
        {
            if (!string.IsNullOrWhiteSpace(prompt))
            {
                warnings.Add("No scene entity could be resolved from the prompt.");
            }

            return new CompileResult(operations, actions, warnings);
        }

        if (target.Type is "character" or "robot" &&
            ContainsCharacterAction(normalized))
        {
            CompileCharacterSequence(prompt, normalized, target, entities, actions);
        }
        else
        {
            CompileGenericSequence(prompt, normalized, target, actions);
        }

        if (normalized.Contains("camera") &&
            normalized.Contains("follow") &&
            actions.All(action => action["type"]?.GetValue<string>() != "cameraFollow"))
        {
            var camera = entities.FirstOrDefault(entity => entity.Type == "camera");
            if (camera is not null)
            {
                var movement = actions.FirstOrDefault(action =>
                    action["type"]?.GetValue<string>() is "moveBy" or "moveTo");
                var start = movement?["start"]?.GetValue<double>() ?? 0;
                var end = actions.Count == 0
                    ? start + ParseDuration(prompt, normalized, 3)
                    : actions.Max(action =>
                        (action["start"]?.GetValue<double>() ?? 0) +
                        (action["duration"]?.GetValue<double>() ?? 0));
                actions.Add(Action("cameraFollow", camera.Id, start, Math.Max(1, end - start),
                    ("targetId", target.Id),
                    ("offset", new[] { 3.7, 2.9, 4.8 })));
            }
        }

        if (actions.Count == 0)
        {
            warnings.Add("The entity was resolved, but no supported action could be compiled.");
        }
        else
        {
            for (var index = 0; index < actions.Count; index++)
            {
                actions[index]["id"] = $"action_{inputHash[..16]}_{index:D2}";
            }

            operations.Add(new JsonObject
            {
                ["op"] = "setActionPlan",
                ["actions"] = new JsonArray(actions.Select(action => action.DeepClone()).ToArray())
            });
        }

        return new CompileResult(operations, actions, warnings);
    }

    public static IReadOnlyList<PromptChange> AnalyzeChanges(
        string? previousPrompt,
        string currentPrompt)
    {
        var previous = SplitClauses(previousPrompt ?? string.Empty);
        var current = SplitClauses(currentPrompt);
        var previousKeys = previous.Select(Normalize).ToHashSet(StringComparer.Ordinal);
        var currentKeys = current.Select(Normalize).ToHashSet(StringComparer.Ordinal);
        var changes = new List<PromptChange>();

        foreach (var clause in current.Where(clause => !previousKeys.Contains(Normalize(clause))))
        {
            changes.Add(Classify("added", clause));
        }

        foreach (var clause in previous.Where(clause => !currentKeys.Contains(Normalize(clause))))
        {
            changes.Add(Classify("removed", clause));
        }

        return changes;
    }

    private static void CompileGenericSequence(
        string prompt,
        string normalized,
        EntityInfo target,
        ICollection<JsonObject> actions)
    {
        var cursor = 0d;
        var currentPosition = target.Position.ToArray();
        var initialPosition = currentPosition.ToArray();

        if (ContainsScreenAnchor(normalized) || CoordinatePattern().IsMatch(prompt))
        {
            var placed = InitialPosition(normalized, target.Type);
            var coordinates = CoordinatePattern().Match(prompt);
            if (coordinates.Success)
            {
                placed =
                [
                    ParseDouble(coordinates.Groups["x"].Value, placed[0]),
                    ParseDouble(coordinates.Groups["y"].Value, placed[1]),
                    ParseDouble(coordinates.Groups["z"].Value, placed[2])
                ];
            }

            actions.Add(Action("place", target.Id, 0, 0,
                ("from", initialPosition),
                ("to", placed)));
            currentPosition = placed;
        }

        var events = new List<(int Index, string Type, Match Match)>();
        events.AddRange(MovePhrasePattern().Matches(prompt)
            .Cast<Match>()
            .Select(match => (match.Index, "move", match)));
        events.AddRange(RotatePattern().Matches(prompt)
            .Cast<Match>()
            .Select(match => (match.Index, "rotate", match)));
        events.AddRange(ScalePattern().Matches(prompt)
            .Cast<Match>()
            .Select(match => (match.Index, "scale", match)));
        events.AddRange(ColorChangePattern().Matches(prompt)
            .Cast<Match>()
            .Select(match => (match.Index, "color", match)));
        events.AddRange(FallDurationPattern().Matches(prompt)
            .Cast<Match>()
            .Select(match => (match.Index, "fall", match)));
        events.AddRange(OpenClosePattern().Matches(prompt)
            .Cast<Match>()
            .Select(match => (match.Index, "interaction", match)));

        foreach (var sceneEvent in events.OrderBy(sceneEvent => sceneEvent.Index))
        {
            var match = sceneEvent.Match;
            switch (sceneEvent.Type)
            {
                case "move":
                {
                    var duration = ParseDuration(match.Groups["body"].Value, normalized, 1);
                    var body = Normalize(match.Groups["body"].Value);
                    var distance = ParseDistance(body, 1);
                    var destination = currentPosition.ToArray();
                    if (body.Contains("left")) destination[0] -= distance;
                    if (body.Contains("right")) destination[0] += body.Contains("screen") ? 6 : distance;
                    if (body.Contains("up")) destination[1] += body.Contains("half") ? 2.5 : distance;
                    if (body.Contains("down")) destination[1] -= distance;
                    if (body.Contains("forward")) destination[2] -= distance;
                    if (body.Contains("back")) destination[2] += distance;
                    actions.Add(Action("moveTo", target.Id, cursor, duration,
                        ("from", currentPosition),
                        ("to", destination),
                        ("direction", PrimaryDirection(body))));
                    currentPosition = destination;
                    cursor += duration;
                    break;
                }
                case "rotate":
                {
                    var degrees = ParseDouble(match.Groups["degrees"].Value, 90);
                    var direction = match.Groups["direction"].Value.ToLowerInvariant();
                    if (direction == "right") degrees *= -1;
                    var duration = ParseDouble(match.Groups["duration"].Value, 0.5);
                    actions.Add(Action("rotateBy", target.Id, cursor, duration,
                        ("axis", "y"),
                        ("degrees", degrees),
                        ("direction", direction)));
                    cursor += duration;
                    break;
                }
                case "scale":
                {
                    var amount = ParseDouble(match.Groups["amount"].Value,
                        normalized.Contains("shrink") ? 0.5 : 1.5);
                    var duration = ParseDouble(match.Groups["duration"].Value, 0.5);
                    actions.Add(Action("scaleTo", target.Id, cursor, duration,
                        ("scale", amount)));
                    cursor += duration;
                    break;
                }
                case "color":
                {
                    var color = NamedColor(match.Groups["color"].Value);
                    actions.Add(Action("setColor", target.Id, cursor, 0,
                        ("color", color),
                        ("colorName", ColorName(color))));
                    break;
                }
                case "fall":
                {
                    var duration = ParseDouble(match.Groups["duration"].Value, 1.25);
                    var ground = target.Type is "box" or "sphere"
                        ? 0.5 * target.Scale[1]
                        : target.Position[1];
                    var destination = new[] { currentPosition[0], ground, currentPosition[2] };
                    actions.Add(Action("fallToGround", target.Id, cursor, duration,
                        ("from", currentPosition),
                        ("to", destination),
                        ("easing", "gravity")));
                    currentPosition = destination;
                    cursor += duration;
                    break;
                }
                case "interaction":
                {
                    var duration = ParseDouble(match.Groups["duration"].Value, 0.8);
                    var type = match.Groups["verb"].Value.StartsWith(
                        "close",
                        StringComparison.OrdinalIgnoreCase)
                        ? "close"
                        : "open";
                    actions.Add(Action(type, target.Id, cursor, duration));
                    cursor += duration;
                    break;
                }
            }
        }
    }

    private static void CompileCharacterSequence(
        string prompt,
        string normalized,
        EntityInfo character,
        IReadOnlyList<EntityInfo> entities,
        ICollection<JsonObject> actions)
    {
        var cursor = 1.1d;
        var position = character.Position.ToArray();
        var dialogue = DialoguePattern().Match(prompt);
        if (dialogue.Success || normalized.Contains("say") || normalized.Contains("speak"))
        {
            actions.Add(Action("speak", character.Id, cursor, 2.7,
                ("text", dialogue.Success
                    ? dialogue.Groups["text"].Value.Trim()
                    : "We need to leave.")));
            cursor = 4;
        }

        if (normalized.Contains("stand"))
        {
            actions.Add(Action("stand", character.Id, cursor, 1.2));
            cursor += 1.2;
        }

        if ((normalized.Contains("step") || normalized.Contains("move")) &&
            (normalized.Contains("left") || normalized.Contains("right")))
        {
            var direction = normalized.Contains("left") ? "left" : "right";
            var destination = position.ToArray();
            destination[0] += direction == "left" ? -0.65 : 0.65;
            actions.Add(Action("moveTo", character.Id, cursor, 0.9,
                ("from", position),
                ("to", destination),
                ("direction", direction),
                ("locomotion", "walk")));
            position = destination;
            cursor += 0.9;
        }

        if (normalized.Contains("duck") || normalized.Contains("crouch"))
        {
            actions.Add(Action("duck", character.Id, cursor, 1.15));
            cursor += 1.15;
        }

        var door = entities.FirstOrDefault(entity => entity.Type == "door");
        double? walkStart = null;
        if (normalized.Contains("walk") && normalized.Contains("door") && door is not null)
        {
            walkStart = cursor;
            var destination = new[] { door.Position[0] - 0.7, position[1], door.Position[2] + 0.14 };
            actions.Add(Action("moveTo", character.Id, cursor, 3.2,
                ("from", position),
                ("to", destination),
                ("targetId", door.Id),
                ("locomotion", "walk")));
            position = destination;
            cursor += 3.2;
        }

        if (normalized.Contains("open") && normalized.Contains("door") && door is not null)
        {
            actions.Add(Action("open", door.Id, Math.Max(0, cursor - 0.25), 1.2,
                ("actorId", character.Id)));
            cursor += 0.75;
        }

        if ((normalized.Contains("exit") || normalized.Contains("leave")) && door is not null)
        {
            var destination = new[] { door.Position[0] + 1.1, position[1], door.Position[2] + 0.14 };
            actions.Add(Action("moveTo", character.Id, cursor, 2.2,
                ("from", position),
                ("to", destination),
                ("locomotion", "walk")));
            cursor += 2.2;
        }

        if (normalized.Contains("camera") && normalized.Contains("follow"))
        {
            var camera = entities.FirstOrDefault(entity => entity.Type == "camera");
            if (camera is not null)
            {
                var start = walkStart ?? 0;
                actions.Add(Action("cameraFollow", camera.Id, start, Math.Max(1, cursor - start),
                    ("targetId", character.Id),
                    ("offset", new[] { 3.7, 2.9, 4.8 })));
            }
        }

        var rotate = RotatePattern().Match(prompt);
        if (rotate.Success)
        {
            var degrees = ParseDouble(rotate.Groups["degrees"].Value, 90);
            if (rotate.Groups["direction"].Value.Equals("right", StringComparison.OrdinalIgnoreCase))
            {
                degrees *= -1;
            }

            actions.Add(Action("rotateBy", character.Id, cursor,
                ParseDouble(rotate.Groups["duration"].Value, 0.5),
                ("axis", "y"),
                ("degrees", degrees),
                ("direction", rotate.Groups["direction"].Value.ToLowerInvariant())));
        }
    }

    private static EntityInfo? ResolveTarget(string normalized, IReadOnlyList<EntityInfo> entities)
    {
        var named = entities
            .Where(entity => normalized.Contains(Normalize(entity.Name)))
            .OrderByDescending(entity => entity.Name.Length)
            .FirstOrDefault();
        if (named is not null) return named;

        foreach (var type in new[] { "box", "sphere", "character", "robot", "door", "camera", "desk", "chair" })
        {
            if (!normalized.Contains(type) && !(type == "box" && normalized.Contains("cube"))) continue;
            var matches = entities.Where(entity => entity.Type == type).ToArray();
            if (matches.Length == 1) return matches[0];
        }

        return null;
    }

    private static string? ResolvePrimitive(string normalized)
    {
        if (normalized.Contains("box") || normalized.Contains("cube")) return "box";
        if (normalized.Contains("sphere") || normalized.Contains("ball")) return "sphere";
        return null;
    }

    private static List<EntityInfo> ReadEntities(JsonElement scene)
    {
        var result = new List<EntityInfo>();
        if (!scene.TryGetProperty("entities", out var entities) ||
            entities.ValueKind != JsonValueKind.Array)
        {
            return result;
        }

        foreach (var entity in entities.EnumerateArray())
        {
            var id = entity.GetProperty("id").GetString() ?? string.Empty;
            var name = entity.TryGetProperty("name", out var nameElement)
                ? nameElement.GetString() ?? id
                : id;
            var type = entity.TryGetProperty("type", out var typeElement)
                ? typeElement.GetString() ?? "entity"
                : "entity";
            result.Add(new EntityInfo(
                id,
                name,
                type,
                ReadVector(entity, "position", [0, 0, 0]),
                ReadVector(entity, "rotation", [0, 0, 0]),
                ReadVector(entity, "scale", [1, 1, 1]),
                entity.TryGetProperty("color", out var color) ? color.GetString() ?? "#888888" : "#888888"));
        }

        return result;
    }

    private static double[] ReadVector(JsonElement entity, string property, double[] fallback) =>
        entity.TryGetProperty(property, out var value) &&
        value.ValueKind == JsonValueKind.Array &&
        value.GetArrayLength() == 3
            ? value.EnumerateArray().Select(item => item.GetDouble()).ToArray()
            : fallback;

    private static JsonObject Action(
        string type,
        string entityId,
        double start,
        double duration,
        params (string Name, object? Value)[] values)
    {
        var action = new JsonObject
        {
            ["type"] = type,
            ["entityId"] = entityId,
            ["start"] = Math.Round(start, 3),
            ["duration"] = Math.Round(duration, 3)
        };
        foreach (var (name, value) in values)
        {
            action[name] = ToNode(value);
        }

        return action;
    }

    private static JsonObject Operation(string op, params (string Name, object? Value)[] values)
    {
        var operation = new JsonObject { ["op"] = op };
        foreach (var (name, value) in values)
        {
            operation[name] = ToNode(value);
        }

        return operation;
    }

    private static JsonNode? ToNode(object? value) => value switch
    {
        null => null,
        JsonNode node => node.DeepClone(),
        string text => JsonValue.Create(text),
        bool boolean => JsonValue.Create(boolean),
        int number => JsonValue.Create(number),
        double number => JsonValue.Create(number),
        double[] numbers => new JsonArray(numbers
            .Select(number => (JsonNode?)JsonValue.Create(number))
            .ToArray()),
        _ => JsonValue.Create(value.ToString())
    };

    private static string[] SplitClauses(string prompt) =>
        ClauseSplitPattern()
            .Split(prompt.Replace("**", string.Empty))
            .Select(clause => clause.Trim())
            .Where(clause => clause.Length > 1)
            .ToArray();

    private static PromptChange Classify(string changeType, string text)
    {
        var normalized = Normalize(text);
        var verbs = VerbVocabulary.Where(word => WordPresent(normalized, word)).Distinct().ToArray();
        var nouns = NounVocabulary.Where(word => WordPresent(normalized, word)).Distinct().ToArray();
        var intent = verbs.Any(verb => verb is "move" or "moves" or "step" or "walk" or "run" or "jump" or "fall" or "falls")
            ? "transform"
            : verbs.Any(verb => verb is "rotate" or "turn" or "face" or "look")
                ? "rotation"
                : verbs.Any(verb => verb is "open" or "close")
                    ? "interaction"
                    : verbs.Any(verb => verb is "say" or "says" or "speak")
                        ? "speech"
                        : nouns.Length > 0 ? "entity" : "modifier";
        return new PromptChange(changeType, text, verbs, nouns, intent);
    }

    private static bool WordPresent(string text, string word) =>
        Regex.IsMatch(text, $@"\b{Regex.Escape(word)}\b", RegexOptions.CultureInvariant);

    private static bool ContainsCharacterAction(string normalized) =>
        new[] { "say", "speak", "stand", "step", "duck", "crouch", "walk", "exit", "leave" }
            .Any(normalized.Contains);

    private static bool ContainsScreenAnchor(string normalized) =>
        normalized.Contains("bottom left") ||
        normalized.Contains("left bottom") ||
        normalized.Contains("top left") ||
        normalized.Contains("top right") ||
        normalized.Contains("bottom right");

    private static double[] InitialPosition(string normalized, string type)
    {
        var ground = type is "box" or "sphere" ? 0.5 : 0;
        if (normalized.Contains("bottom left") || normalized.Contains("left bottom")) return [-3, ground, 0];
        if (normalized.Contains("bottom right") || normalized.Contains("right bottom")) return [3, ground, 0];
        if (normalized.Contains("top left") || normalized.Contains("left top")) return [-3, 3, 0];
        if (normalized.Contains("top right") || normalized.Contains("right top")) return [3, 3, 0];
        return [0, ground, 0];
    }

    private static string InitialColor(string normalized)
    {
        if (normalized.Contains("blue box") || normalized.Contains("blue cube") || normalized.Contains("blue sphere")) return Blue;
        if (normalized.Contains("green box") || normalized.Contains("green cube") || normalized.Contains("green sphere")) return Green;
        if (normalized.Contains("yellow box") || normalized.Contains("yellow cube") || normalized.Contains("yellow sphere")) return Yellow;
        if (normalized.Contains("red box") || normalized.Contains("red cube") || normalized.Contains("red sphere")) return Red;
        return Blue;
    }

    private static string NamedColor(string name) => name.ToLowerInvariant() switch
    {
        "red" => Red,
        "green" => Green,
        "yellow" => Yellow,
        _ => Blue
    };

    private static string ColorName(string color) => color switch
    {
        Blue => "Blue",
        Red => "Red",
        Green => "Green",
        Yellow => "Yellow",
        _ => string.Empty
    };

    private static string Title(string value) =>
        CultureInfo.InvariantCulture.TextInfo.ToTitleCase(value);

    private static double ParseDuration(string localText, string fullText, double fallback)
    {
        var match = DurationPattern().Match(localText);
        if (!match.Success) match = DurationPattern().Match(fullText);
        return match.Success ? ParseDouble(match.Groups["duration"].Value, fallback) : fallback;
    }

    private static double ParseDistance(string text, double fallback)
    {
        var match = DistancePattern().Match(text);
        return match.Success ? ParseDouble(match.Groups["distance"].Value, fallback) : fallback;
    }

    private static string PrimaryDirection(string text) =>
        new[] { "left", "right", "up", "down", "forward", "backward", "back" }
            .FirstOrDefault(text.Contains) ?? string.Empty;

    private static double ParseDouble(string value, double fallback) =>
        double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : fallback;

    private static string Normalize(string value) =>
        Regex.Replace(value.Replace("**", string.Empty).ToLowerInvariant(), @"\s+", " ").Trim();

    public sealed record CompileResult(
        IReadOnlyList<JsonObject> Operations,
        IReadOnlyList<JsonObject> Actions,
        IReadOnlyList<string> Warnings);

    private sealed record EntityInfo(
        string Id,
        string Name,
        string Type,
        double[] Position,
        double[] Rotation,
        double[] Scale,
        string Color);

    [GeneratedRegex(@"(?:says?|speaks?)\s+[“""'](?<text>[^”""']+)[”""']", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex DialoguePattern();

    [GeneratedRegex(@"(?<body>(?:moves?|move|travels?|travel|slides?|slide)\b[^,.;]*(?:\d+(?:\.\d+)?\s*(?:s|sec|secs|second|seconds))?)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex MovePhrasePattern();

    [GeneratedRegex(@"(?:rotates?|turns?)\s+(?<direction>left|right)(?:\s+(?<degrees>\d+(?:\.\d+)?)\s*(?:deg|degree|degrees))?(?:\s+(?:over|for)\s+(?<duration>\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds))?", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RotatePattern();

    [GeneratedRegex(@"(?:scales?(?:\s+to)?|grows?(?:\s+to)?|shrinks?(?:\s+to)?)\s*(?<amount>\d+(?:\.\d+)?)?(?:\s*x)?(?:\s+(?:over|for)\s+(?<duration>\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds))?", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ScalePattern();

    [GeneratedRegex(@"(?:over|for)\s+(?<duration>\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex DurationPattern();

    [GeneratedRegex(@"(?<distance>\d+(?:\.\d+)?)\s*(?:block|blocks|m|meter|meters|unit|units)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex DistancePattern();

    [GeneratedRegex(@"falls?(?:\s+to\s+the\s+ground)?(?:\s+(?:over|for)\s+(?<duration>\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds))?", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex FallDurationPattern();

    [GeneratedRegex(@"\b(?:turns?|turning|becomes?|change(?:s|d)?(?:\s+\w+)?\s+to)\s+(?<color>red|blue|green|yellow)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ColorChangePattern();

    [GeneratedRegex(@"\b(?<verb>opens?|closes?)(?:\s+(?:over|for)\s+(?<duration>\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds))?", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex OpenClosePattern();

    [GeneratedRegex(@"\bX\s*=\s*(?<x>-?\d+(?:\.\d+)?)\s*[, ]+\s*Y\s*=\s*(?<y>-?\d+(?:\.\d+)?)\s*[, ]+\s*Z\s*=\s*(?<z>-?\d+(?:\.\d+)?)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex CoordinatePattern();

    [GeneratedRegex(@"[.!?;\r\n]+|,\s*|\bthen\b|\bwhile\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ClauseSplitPattern();
}

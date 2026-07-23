using System.Text.Json;
using System.Text.Json.Nodes;

namespace Ivone.dev.ThreeDAnimation;

public sealed record ScenePlanRequest(string Prompt, JsonElement Scene);

public sealed record ScenePlanResponse(
    string PatchId,
    IReadOnlyList<JsonObject> Operations,
    IReadOnlyList<string> Warnings,
    string Planner,
    DateTimeOffset CreatedAt);

public sealed record SceneValidationResponse(
    bool IsValid,
    IReadOnlyList<string> Errors,
    IReadOnlyList<string> Warnings);

public sealed record SceneVersionSummary(
    string Id,
    DateTimeOffset CreatedAt,
    long Bytes);

public sealed record ImportedAssetResponse(
    string AssetId,
    string Name,
    string Format,
    long Bytes,
    string Uri,
    JsonObject Manifest);

public sealed record StoredSceneDocument(string Json, string ETag);

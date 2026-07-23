using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Ivone.dev.ThreeDAnimation;

public sealed partial class ThreeDAnimationStore
{
    public const int MaximumSceneBytes = 4 * 1024 * 1024;
    public const long MaximumAssetBytes = 50L * 1024 * 1024;

    private readonly string _projectsPath;
    private readonly string _assetsPath;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public ThreeDAnimationStore(IWebHostEnvironment environment, IConfiguration configuration)
    {
        var configuredRoot = configuration["ThreeDAnimation:StoragePath"];
        var root = string.IsNullOrWhiteSpace(configuredRoot)
            ? Path.Combine(environment.ContentRootPath, "App_Data", "3dAnimation")
            : Path.GetFullPath(Path.IsPathRooted(configuredRoot)
                ? configuredRoot
                : Path.Combine(environment.ContentRootPath, configuredRoot));

        _projectsPath = Path.Combine(root, "projects");
        _assetsPath = Path.Combine(root, "assets");
        Directory.CreateDirectory(_projectsPath);
        Directory.CreateDirectory(_assetsPath);
    }

    public bool IsValidId(string? value) =>
        !string.IsNullOrWhiteSpace(value) && IdPattern().IsMatch(value);

    public async Task<StoredSceneDocument?> ReadProjectAsync(string projectId, CancellationToken cancellationToken)
    {
        var path = ProjectPath(projectId);
        var documentLock = _locks.GetOrAdd(path, _ => new SemaphoreSlim(1, 1));
        await documentLock.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(path))
            {
                return null;
            }

            var json = await File.ReadAllTextAsync(path, cancellationToken);
            return new StoredSceneDocument(json, BuildETag(json));
        }
        finally
        {
            documentLock.Release();
        }
    }

    public async Task<string> WriteProjectAsync(
        string projectId,
        JsonElement document,
        CancellationToken cancellationToken)
    {
        var validation = SceneDocumentValidator.Validate(document);
        if (!validation.IsValid)
        {
            throw new InvalidDataException(string.Join(" ", validation.Errors));
        }

        var json = JsonSerializer.Serialize(document, new JsonSerializerOptions { WriteIndented = true });
        if (Encoding.UTF8.GetByteCount(json) > MaximumSceneBytes)
        {
            throw new InvalidDataException("The scene document is too large.");
        }

        var projectPath = ProjectPath(projectId);
        var versionDirectory = VersionDirectory(projectId);
        var documentLock = _locks.GetOrAdd(projectPath, _ => new SemaphoreSlim(1, 1));
        await documentLock.WaitAsync(cancellationToken);
        try
        {
            Directory.CreateDirectory(versionDirectory);
            if (File.Exists(projectPath))
            {
                var existing = await File.ReadAllTextAsync(projectPath, cancellationToken);
                var versionName = $"{DateTimeOffset.UtcNow:yyyyMMddTHHmmssfffZ}-{BuildHash(existing)[..10]}.json";
                await File.WriteAllTextAsync(
                    Path.Combine(versionDirectory, versionName),
                    existing,
                    Encoding.UTF8,
                    cancellationToken);
            }

            var temporaryPath = $"{projectPath}.{Guid.NewGuid():N}.tmp";
            try
            {
                await File.WriteAllTextAsync(temporaryPath, json, Encoding.UTF8, cancellationToken);
                File.Move(temporaryPath, projectPath, true);
            }
            finally
            {
                if (File.Exists(temporaryPath))
                {
                    File.Delete(temporaryPath);
                }
            }

            return BuildETag(json);
        }
        finally
        {
            documentLock.Release();
        }
    }

    public IReadOnlyList<SceneVersionSummary> ListVersions(string projectId)
    {
        var directory = VersionDirectory(projectId);
        if (!Directory.Exists(directory))
        {
            return Array.Empty<SceneVersionSummary>();
        }

        return Directory.EnumerateFiles(directory, "*.json")
            .Select(path =>
            {
                var info = new FileInfo(path);
                return new SceneVersionSummary(
                    Path.GetFileNameWithoutExtension(path),
                    info.LastWriteTimeUtc,
                    info.Length);
            })
            .OrderByDescending(version => version.CreatedAt)
            .Take(50)
            .ToList();
    }

    public async Task<StoredSceneDocument?> ReadVersionAsync(
        string projectId,
        string versionId,
        CancellationToken cancellationToken)
    {
        if (!IsValidId(versionId))
        {
            return null;
        }

        var path = Path.Combine(VersionDirectory(projectId), $"{versionId}.json");
        if (!File.Exists(path))
        {
            return null;
        }

        var json = await File.ReadAllTextAsync(path, cancellationToken);
        return new StoredSceneDocument(json, BuildETag(json));
    }

    public async Task<ImportedAssetResponse> SaveAssetAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not ".glb" and not ".gltf")
        {
            throw new InvalidDataException("Only GLB and glTF assets are supported.");
        }

        if (file.Length <= 0 || file.Length > MaximumAssetBytes)
        {
            throw new InvalidDataException($"Assets must be between 1 byte and {MaximumAssetBytes / 1024 / 1024} MB.");
        }

        var assetId = $"asset_{Guid.NewGuid():N}";
        var assetPath = Path.Combine(_assetsPath, $"{assetId}{extension}");
        await using (var stream = new FileStream(
            assetPath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            81920,
            FileOptions.Asynchronous | FileOptions.SequentialScan))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var safeName = Path.GetFileNameWithoutExtension(file.FileName);
        var capabilities = new System.Text.Json.Nodes.JsonArray();
        capabilities.Add("Movable");
        var manifest = new System.Text.Json.Nodes.JsonObject
        {
            ["assetId"] = assetId,
            ["format"] = extension.TrimStart('.'),
            ["version"] = 1,
            ["source"] = new System.Text.Json.Nodes.JsonObject
            {
                ["name"] = Path.GetFileName(file.FileName),
                ["bytes"] = file.Length
            },
            ["semantic"] = new System.Text.Json.Nodes.JsonObject
            {
                ["category"] = "unclassified",
                ["tags"] = new System.Text.Json.Nodes.JsonArray()
            },
            ["capabilities"] = capabilities
        };

        await File.WriteAllTextAsync(
            Path.Combine(_assetsPath, $"{assetId}.manifest.json"),
            manifest.ToJsonString(new JsonSerializerOptions { WriteIndented = true }),
            cancellationToken);

        return new ImportedAssetResponse(
            assetId,
            safeName,
            extension.TrimStart('.'),
            file.Length,
            $"/api/3d-animation/assets/{assetId}",
            manifest);
    }

    public (string Path, string ContentType)? FindAsset(string assetId)
    {
        if (!IsValidId(assetId))
        {
            return null;
        }

        var glb = Path.Combine(_assetsPath, $"{assetId}.glb");
        if (File.Exists(glb))
        {
            return (glb, "model/gltf-binary");
        }

        var gltf = Path.Combine(_assetsPath, $"{assetId}.gltf");
        return File.Exists(gltf) ? (gltf, "model/gltf+json") : null;
    }

    private string ProjectPath(string projectId) =>
        Path.Combine(_projectsPath, $"{projectId}.json");

    private string VersionDirectory(string projectId) =>
        Path.Combine(_projectsPath, $"{projectId}.versions");

    private static string BuildETag(string json) => $"\"{BuildHash(json)}\"";

    private static string BuildHash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    [GeneratedRegex("^[A-Za-z0-9_-]{3,128}$", RegexOptions.CultureInvariant)]
    private static partial Regex IdPattern();
}

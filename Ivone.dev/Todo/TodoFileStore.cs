using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Ivone.dev.Todo;

public sealed partial class TodoFileStore
{
    public const int MaximumDocumentBytes = 2 * 1024 * 1024;

    private readonly string _storagePath;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _documentLocks = new();

    public TodoFileStore(IWebHostEnvironment environment, IConfiguration configuration)
    {
        var configuredPath = configuration["Todo:StoragePath"];
        _storagePath = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(environment.ContentRootPath, "App_Data", "Todo")
            : Path.GetFullPath(Path.IsPathRooted(configuredPath)
                ? configuredPath
                : Path.Combine(environment.ContentRootPath, configuredPath));
        Directory.CreateDirectory(_storagePath);
    }

    public bool IsValidKey(string? syncKey) =>
        !string.IsNullOrWhiteSpace(syncKey) && SyncKeyPattern().IsMatch(syncKey);

    public async Task<TodoStoredDocument?> ReadAsync(string syncKey, CancellationToken cancellationToken)
    {
        var path = GetDocumentPath(syncKey);
        var documentLock = _documentLocks.GetOrAdd(path, _ => new SemaphoreSlim(1, 1));

        await documentLock.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(path))
            {
                return null;
            }

            var json = await File.ReadAllTextAsync(path, cancellationToken);
            return new TodoStoredDocument(json, BuildETag(json));
        }
        finally
        {
            documentLock.Release();
        }
    }

    public async Task<string> WriteAsync(
        string syncKey,
        JsonElement document,
        string? ifMatch,
        bool createOnly,
        CancellationToken cancellationToken)
    {
        if (document.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidDataException("The todo document must be a JSON object.");
        }

        var json = document.GetRawText();
        if (Encoding.UTF8.GetByteCount(json) > MaximumDocumentBytes)
        {
            throw new InvalidDataException("The todo document is too large.");
        }

        var path = GetDocumentPath(syncKey);
        var documentLock = _documentLocks.GetOrAdd(path, _ => new SemaphoreSlim(1, 1));
        var temporaryPath = $"{path}.{Guid.NewGuid():N}.tmp";

        await documentLock.WaitAsync(cancellationToken);
        try
        {
            var exists = File.Exists(path);
            if (createOnly && exists)
            {
                throw new TodoPreconditionFailedException();
            }

            if (ifMatch is not null)
            {
                if (!exists)
                {
                    throw new TodoPreconditionFailedException();
                }

                var existingJson = await File.ReadAllTextAsync(path, cancellationToken);
                if (!string.Equals(ifMatch, BuildETag(existingJson), StringComparison.Ordinal))
                {
                    throw new TodoPreconditionFailedException();
                }
            }

            await File.WriteAllTextAsync(temporaryPath, json, Encoding.UTF8, cancellationToken);
            File.Move(temporaryPath, path, true);
            return BuildETag(json);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }

            documentLock.Release();
        }
    }

    private string GetDocumentPath(string syncKey)
    {
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(syncKey)));
        return Path.Combine(_storagePath, $"{hash}.json");
    }

    private static string BuildETag(string json) =>
        $"\"{Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)))}\"";

    [GeneratedRegex("^[A-Za-z0-9_-]{24,128}$", RegexOptions.CultureInvariant)]
    private static partial Regex SyncKeyPattern();
}

public sealed record TodoStoredDocument(string Json, string ETag);

public sealed class TodoPreconditionFailedException : Exception
{
}

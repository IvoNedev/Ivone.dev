using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;

namespace Ivone.dev.Timer;

public sealed class TimerConfigService : ITimerConfigService
{
    private const string ClockModeDigital = "digital";
    private const string ClockModeAnalog = "analog";
    private const int DefaultShowBeforeNextActivityMinutes = 0;
    private const int MaxShowBeforeNextActivityMinutes = 180;
    private const string DefaultMessage = "What is happening now?";
    private const string DefaultTextColor = "#133447";
    private const string DefaultBackgroundColor = "#FFF3D6";
    private const int MaxMessageLength = 160;
    private const int MaxColorLength = 32;
    private const int MaxUrlLength = 500;

    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly string _configPath;
    private readonly ILogger<TimerConfigService> _logger;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true
    };

    public TimerConfigService(IWebHostEnvironment environment, ILogger<TimerConfigService> logger)
    {
        _logger = logger;
        _configPath = Path.Combine(environment.ContentRootPath, "App_Data", "timer-config.json");
    }

    public async Task<TimerStatusResponse> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var store = await ReadUnsafeAsync(cancellationToken);
            var changed = false;
            foreach (var host in store.Hosts)
            {
                if (RemoveExpiredOverride(host))
                {
                    changed = true;
                }
            }

            if (changed)
            {
                store.UpdatedAtUtc = DateTime.UtcNow;
                await WriteUnsafeAsync(store, cancellationToken);
            }

            return new TimerStatusResponse
            {
                HasPassword = store.Hosts.Count > 0,
                HasActiveOverride = store.Hosts.Any(x => x.Override is not null),
                RuleCount = store.Hosts.Sum(x => x.Rules.Count),
                UpdatedAtUtc = store.UpdatedAtUtc
            };
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<TimerPublicConfigResponse> GetGuestConfigAsync(string? password, CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var store = await ReadUnsafeAsync(cancellationToken);
            if (store.Hosts.Count == 0)
            {
                throw new TimerConflictException("No timer hosts exist yet. Open /timer-admin first.");
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                throw new TimerUnauthorizedException("Password is required.");
            }

            var host = FindHostByPassword(store, password);
            if (host is null)
            {
                throw new TimerUnauthorizedException("Password is incorrect.");
            }

            if (RemoveExpiredOverride(host))
            {
                store.UpdatedAtUtc = DateTime.UtcNow;
                await WriteUnsafeAsync(store, cancellationToken);
            }

            return ToPublicResponse(host);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<TimerAdminConfigResponse> LoadAdminConfigAsync(string? password, CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var store = await ReadUnsafeAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(password))
            {
                throw new TimerValidationException("Password is required.");
            }

            var host = FindHostByPassword(store, password);
            if (host is null)
            {
                return new TimerAdminConfigResponse
                {
                    HasPassword = false,
                    Settings = ToPublicResponse(CreateDefaultHost())
                };
            }

            if (RemoveExpiredOverride(host))
            {
                store.UpdatedAtUtc = DateTime.UtcNow;
                await WriteUnsafeAsync(store, cancellationToken);
            }

            return new TimerAdminConfigResponse
            {
                HasPassword = true,
                Settings = ToPublicResponse(host)
            };
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<TimerAdminConfigResponse> SaveAdminConfigAsync(TimerAdminSaveRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            throw new TimerValidationException("Request payload is required.");
        }

        if (request.Settings is null)
        {
            throw new TimerValidationException("Settings payload is required.");
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            var store = await ReadUnsafeAsync(cancellationToken);

            var host = FindHostByPassword(store, request.Password);
            var hostExisted = host is not null;

            if (host is null)
            {
                var createPassword = !string.IsNullOrWhiteSpace(request.Password)
                    ? request.Password
                    : request.NewPassword;

                if (string.IsNullOrWhiteSpace(createPassword))
                {
                    throw new TimerValidationException("Enter a password to create or update a host.");
                }

                var existingViaCreatePassword = FindHostByPassword(store, createPassword);
                if (existingViaCreatePassword is not null)
                {
                    host = existingViaCreatePassword;
                    hostExisted = true;
                }
                else
                {
                    host = CreateDefaultHost();
                    SetPassword(host, createPassword);
                    store.Hosts.Add(host);
                }
            }

            if (hostExisted && !string.IsNullOrWhiteSpace(request.NewPassword))
            {
                var conflicting = FindHostByPassword(store, request.NewPassword);
                if (conflicting is not null && !ReferenceEquals(conflicting, host))
                {
                    throw new TimerConflictException("Another host already uses this password.");
                }

                SetPassword(host, request.NewPassword);
            }

            ApplySettings(host, request.Settings);
            RemoveExpiredOverride(host);
            host.UpdatedAtUtc = DateTime.UtcNow;
            store.UpdatedAtUtc = host.UpdatedAtUtc;
            await WriteUnsafeAsync(store, cancellationToken);

            return new TimerAdminConfigResponse
            {
                HasPassword = true,
                Settings = ToPublicResponse(host)
            };
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<TimerAdminConfigResponse> StartOverrideAsync(TimerOverrideStartRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            throw new TimerValidationException("Request payload is required.");
        }

        if (request.DurationMinutes < 1 || request.DurationMinutes > 720)
        {
            throw new TimerValidationException("Override duration must be between 1 and 720 minutes.");
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            var store = await ReadUnsafeAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(request.Password))
            {
                throw new TimerUnauthorizedException("Password is required.");
            }

            var host = FindHostByPassword(store, request.Password);
            if (host is null)
            {
                throw new TimerUnauthorizedException("Password is incorrect.");
            }

            var utcNow = DateTime.UtcNow;
            host.Override = new TimerOverrideDocument
            {
                Label = NormalizeMessage(request.Label, "Timer", 80),
                StartedAtUtc = utcNow,
                EndsAtUtc = utcNow.AddMinutes(request.DurationMinutes)
            };
            host.UpdatedAtUtc = utcNow;
            store.UpdatedAtUtc = utcNow;

            await WriteUnsafeAsync(store, cancellationToken);
            return new TimerAdminConfigResponse
            {
                HasPassword = true,
                Settings = ToPublicResponse(host)
            };
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<TimerAdminConfigResponse> ClearOverrideAsync(string? password, CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var store = await ReadUnsafeAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(password))
            {
                throw new TimerUnauthorizedException("Password is required.");
            }

            var host = FindHostByPassword(store, password);
            if (host is null)
            {
                throw new TimerUnauthorizedException("Password is incorrect.");
            }

            host.Override = null;
            host.UpdatedAtUtc = DateTime.UtcNow;
            store.UpdatedAtUtc = host.UpdatedAtUtc;
            await WriteUnsafeAsync(store, cancellationToken);

            return new TimerAdminConfigResponse
            {
                HasPassword = true,
                Settings = ToPublicResponse(host)
            };
        }
        finally
        {
            _lock.Release();
        }
    }

    private static void ApplySettings(TimerHostDocument host, TimerDisplaySettingsInput settings)
    {
        host.ClockMode = NormalizeClockMode(settings.ClockMode);
        host.ShowMinutesBeforeNextActivity = NormalizeShowBeforeNextActivityMinutes(settings.ShowMinutesBeforeNextActivity);
        host.DefaultMessage = NormalizeMessage(settings.DefaultMessage, DefaultMessage, MaxMessageLength);
        host.DefaultTextColor = NormalizeColor(settings.DefaultTextColor, DefaultTextColor);
        host.DefaultBackgroundColor = NormalizeColor(settings.DefaultBackgroundColor, DefaultBackgroundColor);
        host.DefaultImageUrl = NormalizeUrl(settings.DefaultImageUrl);
        host.Rules = NormalizeRules(settings.Rules);
    }

    private static List<TimerScheduleRuleDocument> NormalizeRules(IEnumerable<TimerScheduleRuleInput>? source)
    {
        var output = new List<TimerScheduleRuleDocument>();
        if (source is null)
        {
            return output;
        }

        var index = 0;
        foreach (var rawRule in source)
        {
            index++;
            if (rawRule is null)
            {
                continue;
            }

            var start = NormalizeTime(rawRule.Start, $"Rule {index} start time");
            var end = NormalizeTime(rawRule.End, $"Rule {index} end time");

            output.Add(new TimerScheduleRuleDocument
            {
                Start = start,
                End = end,
                Message = NormalizeMessage(rawRule.Message, "Scheduled event", MaxMessageLength),
                TextColor = NormalizeColor(rawRule.TextColor, DefaultTextColor),
                BackgroundColor = NormalizeColor(rawRule.BackgroundColor, DefaultBackgroundColor),
                ImageUrl = NormalizeUrl(rawRule.ImageUrl)
            });
        }

        return output;
    }

    private static string NormalizeTime(string? raw, string fieldName)
    {
        var candidate = raw?.Trim();
        if (string.IsNullOrWhiteSpace(candidate))
        {
            throw new TimerValidationException($"{fieldName} is required.");
        }

        if (!TimeSpan.TryParseExact(candidate, @"hh\:mm", CultureInfo.InvariantCulture, out var parsed))
        {
            throw new TimerValidationException($"{fieldName} must use HH:mm format.");
        }

        if (parsed < TimeSpan.Zero || parsed >= TimeSpan.FromDays(1))
        {
            throw new TimerValidationException($"{fieldName} must be between 00:00 and 23:59.");
        }

        return $"{(int)parsed.TotalHours:00}:{parsed.Minutes:00}";
    }

    private static string NormalizeMessage(string? raw, string fallback, int maxLength)
    {
        var value = string.IsNullOrWhiteSpace(raw) ? fallback : raw.Trim();
        if (value.Length > maxLength)
        {
            value = value[..maxLength];
        }

        return value;
    }

    private static string NormalizeColor(string? raw, string fallback)
    {
        var value = raw?.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        if (value.Length > MaxColorLength)
        {
            return fallback;
        }

        if (value.Contains('<') || value.Contains('>') || value.Contains('"') || value.Contains('\''))
        {
            return fallback;
        }

        return value;
    }

    private static string NormalizeClockMode(string? raw)
    {
        var value = raw?.Trim();
        if (string.Equals(value, ClockModeAnalog, StringComparison.OrdinalIgnoreCase))
        {
            return ClockModeAnalog;
        }

        return ClockModeDigital;
    }

    private static int NormalizeShowBeforeNextActivityMinutes(int? raw)
    {
        if (!raw.HasValue)
        {
            return DefaultShowBeforeNextActivityMinutes;
        }

        if (raw.Value < 0)
        {
            return DefaultShowBeforeNextActivityMinutes;
        }

        return Math.Min(raw.Value, MaxShowBeforeNextActivityMinutes);
    }

    private static string? NormalizeUrl(string? raw)
    {
        var value = raw?.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (value.Length > MaxUrlLength)
        {
            return null;
        }

        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return null;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return uri.ToString();
    }

    private static TimerPublicConfigResponse ToPublicResponse(TimerHostDocument host)
    {
        return new TimerPublicConfigResponse
        {
            ClockMode = host.ClockMode,
            ShowMinutesBeforeNextActivity = host.ShowMinutesBeforeNextActivity,
            DefaultMessage = host.DefaultMessage,
            DefaultTextColor = host.DefaultTextColor,
            DefaultBackgroundColor = host.DefaultBackgroundColor,
            DefaultImageUrl = host.DefaultImageUrl,
            Rules = host.Rules.Select(rule => new TimerScheduleRuleResponse
            {
                Start = rule.Start,
                End = rule.End,
                Message = rule.Message,
                TextColor = rule.TextColor,
                BackgroundColor = rule.BackgroundColor,
                ImageUrl = rule.ImageUrl
            }).ToList(),
            Override = host.Override is null
                ? null
                : new TimerOverrideResponse
                {
                    Label = host.Override.Label,
                    StartedAtUtc = host.Override.StartedAtUtc,
                    EndsAtUtc = host.Override.EndsAtUtc
                },
            UpdatedAtUtc = host.UpdatedAtUtc
        };
    }

    private static bool RemoveExpiredOverride(TimerHostDocument host)
    {
        if (host.Override is null)
        {
            return false;
        }

        if (host.Override.EndsAtUtc > DateTime.UtcNow)
        {
            return false;
        }

        host.Override = null;
        host.UpdatedAtUtc = DateTime.UtcNow;
        return true;
    }

    private async Task<TimerStoreDocument> ReadUnsafeAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_configPath))
        {
            return CreateEmptyStore();
        }

        try
        {
            await using var file = File.OpenRead(_configPath);
            using var jsonDocument = await JsonDocument.ParseAsync(file, cancellationToken: cancellationToken);

            if (jsonDocument.RootElement.ValueKind != JsonValueKind.Object)
            {
                return CreateEmptyStore();
            }

            if (jsonDocument.RootElement.TryGetProperty("hosts", out _))
            {
                var store = jsonDocument.RootElement.Deserialize<TimerStoreDocument>(_jsonOptions);
                return CoerceStore(store);
            }

            var legacyHost = jsonDocument.RootElement.Deserialize<TimerHostDocument>(_jsonOptions);
            var storeFromLegacy = CreateEmptyStore();
            var coercedLegacyHost = CoerceHost(legacyHost);
            if (HasPassword(coercedLegacyHost))
            {
                storeFromLegacy.Hosts.Add(coercedLegacyHost);
                storeFromLegacy.UpdatedAtUtc = coercedLegacyHost.UpdatedAtUtc;
            }

            return storeFromLegacy;
        }
        catch (Exception ex) when (ex is IOException or JsonException or NotSupportedException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex, "Falling back to default timer config because existing file could not be read.");
            return CreateEmptyStore();
        }
    }

    private async Task WriteUnsafeAsync(TimerStoreDocument store, CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(_configPath);
        if (string.IsNullOrWhiteSpace(directory))
        {
            throw new InvalidOperationException("Timer config directory path is invalid.");
        }

        Directory.CreateDirectory(directory);
        await using var file = File.Create(_configPath);
        await JsonSerializer.SerializeAsync(file, store, _jsonOptions, cancellationToken);
    }

    private static bool HasPassword(TimerHostDocument host)
    {
        return !string.IsNullOrWhiteSpace(host.PasswordHash) && !string.IsNullOrWhiteSpace(host.PasswordSalt);
    }

    private static TimerHostDocument? FindHostByPassword(TimerStoreDocument store, string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return null;
        }

        foreach (var host in store.Hosts)
        {
            if (!HasPassword(host))
            {
                continue;
            }

            if (VerifyPassword(password, host.PasswordHash!, host.PasswordSalt!))
            {
                return host;
            }
        }

        return null;
    }

    private static void SetPassword(TimerHostDocument host, string rawPassword)
    {
        var password = rawPassword.Trim();
        if (password.Length < 1)
        {
            throw new TimerValidationException("Password must be at least 1 character.");
        }

        var salt = RandomNumberGenerator.GetBytes(16);
        host.PasswordSalt = Convert.ToBase64String(salt);
        host.PasswordHash = HashPassword(password, salt);
    }

    private static string HashPassword(string password, byte[] salt)
    {
        using var derive = new Rfc2898DeriveBytes(password, salt, 100_000, HashAlgorithmName.SHA256);
        var hash = derive.GetBytes(32);
        return Convert.ToBase64String(hash);
    }

    private static bool VerifyPassword(string password, string hashBase64, string saltBase64)
    {
        try
        {
            var expectedHash = Convert.FromBase64String(hashBase64);
            var salt = Convert.FromBase64String(saltBase64);

            using var derive = new Rfc2898DeriveBytes(password.Trim(), salt, 100_000, HashAlgorithmName.SHA256);
            var actualHash = derive.GetBytes(expectedHash.Length);
            return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
        }
        catch
        {
            return false;
        }
    }

    private static TimerStoreDocument CreateEmptyStore()
    {
        return new TimerStoreDocument
        {
            UpdatedAtUtc = DateTime.UtcNow,
            Hosts = new List<TimerHostDocument>()
        };
    }

    private static TimerHostDocument CreateDefaultHost()
    {
        return new TimerHostDocument
        {
            ClockMode = ClockModeDigital,
            ShowMinutesBeforeNextActivity = DefaultShowBeforeNextActivityMinutes,
            DefaultMessage = DefaultMessage,
            DefaultTextColor = DefaultTextColor,
            DefaultBackgroundColor = DefaultBackgroundColor,
            UpdatedAtUtc = DateTime.UtcNow,
            Rules = new List<TimerScheduleRuleDocument>()
        };
    }

    private static TimerStoreDocument CoerceStore(TimerStoreDocument? source)
    {
        if (source is null)
        {
            return CreateEmptyStore();
        }

        var output = CreateEmptyStore();
        if (source.Hosts is not null)
        {
            foreach (var rawHost in source.Hosts)
            {
                var host = CoerceHost(rawHost);
                if (HasPassword(host))
                {
                    output.Hosts.Add(host);
                }
            }
        }

        if (source.UpdatedAtUtc != default)
        {
            output.UpdatedAtUtc = source.UpdatedAtUtc;
        }
        else if (output.Hosts.Count > 0)
        {
            output.UpdatedAtUtc = output.Hosts.Max(x => x.UpdatedAtUtc);
        }

        return output;
    }

    private static TimerHostDocument CoerceHost(TimerHostDocument? source)
    {
        if (source is null)
        {
            return CreateDefaultHost();
        }

        var output = new TimerHostDocument
        {
            PasswordHash = source.PasswordHash,
            PasswordSalt = source.PasswordSalt,
            ClockMode = NormalizeClockMode(source.ClockMode),
            ShowMinutesBeforeNextActivity = NormalizeShowBeforeNextActivityMinutes(source.ShowMinutesBeforeNextActivity),
            DefaultMessage = NormalizeMessage(source.DefaultMessage, DefaultMessage, MaxMessageLength),
            DefaultTextColor = NormalizeColor(source.DefaultTextColor, DefaultTextColor),
            DefaultBackgroundColor = NormalizeColor(source.DefaultBackgroundColor, DefaultBackgroundColor),
            DefaultImageUrl = NormalizeUrl(source.DefaultImageUrl),
            UpdatedAtUtc = source.UpdatedAtUtc == default ? DateTime.UtcNow : source.UpdatedAtUtc,
            Rules = new List<TimerScheduleRuleDocument>()
        };

        if (source.Rules is not null)
        {
            foreach (var rule in source.Rules)
            {
                if (!TryNormalizeTime(rule?.Start, out var start))
                {
                    continue;
                }

                if (!TryNormalizeTime(rule?.End, out var end))
                {
                    continue;
                }

                output.Rules.Add(new TimerScheduleRuleDocument
                {
                    Start = start,
                    End = end,
                    Message = NormalizeMessage(rule?.Message, "Scheduled event", MaxMessageLength),
                    TextColor = NormalizeColor(rule?.TextColor, DefaultTextColor),
                    BackgroundColor = NormalizeColor(rule?.BackgroundColor, DefaultBackgroundColor),
                    ImageUrl = NormalizeUrl(rule?.ImageUrl)
                });
            }
        }

        if (source.Override is not null && source.Override.EndsAtUtc > source.Override.StartedAtUtc)
        {
            output.Override = new TimerOverrideDocument
            {
                Label = NormalizeMessage(source.Override.Label, "Timer", 80),
                StartedAtUtc = source.Override.StartedAtUtc,
                EndsAtUtc = source.Override.EndsAtUtc
            };
        }

        return output;
    }

    private static bool TryNormalizeTime(string? raw, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        if (!TimeSpan.TryParseExact(raw.Trim(), @"hh\:mm", CultureInfo.InvariantCulture, out var parsed))
        {
            return false;
        }

        if (parsed < TimeSpan.Zero || parsed >= TimeSpan.FromDays(1))
        {
            return false;
        }

        normalized = $"{(int)parsed.TotalHours:00}:{parsed.Minutes:00}";
        return true;
    }

    public sealed class TimerStoreDocument
    {
        public TimerStoreDocument()
        {
        }

        public List<TimerHostDocument> Hosts { get; set; } = new();
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }

    public sealed class TimerHostDocument
    {
        public TimerHostDocument()
        {
        }

        public string? PasswordHash { get; set; }
        public string? PasswordSalt { get; set; }
        public string ClockMode { get; set; } = ClockModeDigital;
        public int ShowMinutesBeforeNextActivity { get; set; } = TimerConfigService.DefaultShowBeforeNextActivityMinutes;
        public string DefaultMessage { get; set; } = TimerConfigService.DefaultMessage;
        public string DefaultTextColor { get; set; } = TimerConfigService.DefaultTextColor;
        public string DefaultBackgroundColor { get; set; } = TimerConfigService.DefaultBackgroundColor;
        public string? DefaultImageUrl { get; set; }
        public List<TimerScheduleRuleDocument> Rules { get; set; } = new();
        public TimerOverrideDocument? Override { get; set; }
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }

    public sealed class TimerScheduleRuleDocument
    {
        public TimerScheduleRuleDocument()
        {
        }

        public string Start { get; set; } = "00:00";
        public string End { get; set; } = "00:00";
        public string Message { get; set; } = "Scheduled event";
        public string TextColor { get; set; } = TimerConfigService.DefaultTextColor;
        public string BackgroundColor { get; set; } = TimerConfigService.DefaultBackgroundColor;
        public string? ImageUrl { get; set; }
    }

    public sealed class TimerOverrideDocument
    {
        public TimerOverrideDocument()
        {
        }

        public string Label { get; set; } = "Timer";
        public DateTime StartedAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace Ivone.dev.Timer;

public interface ITimerConfigService
{
    Task<TimerStatusResponse> GetStatusAsync(CancellationToken cancellationToken = default);
    Task<TimerPublicConfigResponse> GetGuestConfigAsync(string? password, CancellationToken cancellationToken = default);
    Task<TimerAdminConfigResponse> LoadAdminConfigAsync(string? password, CancellationToken cancellationToken = default);
    Task<TimerAdminConfigResponse> SaveAdminConfigAsync(TimerAdminSaveRequest request, CancellationToken cancellationToken = default);
    Task<TimerAdminConfigResponse> StartOverrideAsync(TimerOverrideStartRequest request, CancellationToken cancellationToken = default);
    Task<TimerAdminConfigResponse> ClearOverrideAsync(string? password, CancellationToken cancellationToken = default);
}

public sealed class TimerStatusResponse
{
    public bool HasPassword { get; set; }
    public bool HasActiveOverride { get; set; }
    public int RuleCount { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class TimerPasswordRequest
{
    public string? Password { get; set; }
}

public sealed class TimerAdminSaveRequest
{
    public string? Password { get; set; }
    public string? NewPassword { get; set; }
    [Required]
    public TimerDisplaySettingsInput? Settings { get; set; }
}

public sealed class TimerOverrideStartRequest
{
    public string? Password { get; set; }
    public string? Label { get; set; }
    public int DurationMinutes { get; set; }
}

public sealed class TimerDisplaySettingsInput
{
    public string? ClockMode { get; set; }
    public int? ShowMinutesBeforeNextActivity { get; set; }
    public string? DefaultMessage { get; set; }
    public string? DefaultTextColor { get; set; }
    public string? DefaultBackgroundColor { get; set; }
    public string? DefaultImageUrl { get; set; }
    public List<TimerScheduleRuleInput>? Rules { get; set; }
}

public sealed class TimerScheduleRuleInput
{
    public string? Start { get; set; }
    public string? End { get; set; }
    public string? Message { get; set; }
    public string? TextColor { get; set; }
    public string? BackgroundColor { get; set; }
    public string? ImageUrl { get; set; }
}

public sealed class TimerAdminConfigResponse
{
    public bool HasPassword { get; set; }
    public TimerPublicConfigResponse Settings { get; set; } = new();
}

public sealed class TimerPublicConfigResponse
{
    public string ClockMode { get; set; } = "digital";
    public int ShowMinutesBeforeNextActivity { get; set; }
    public string DefaultMessage { get; set; } = string.Empty;
    public string DefaultTextColor { get; set; } = string.Empty;
    public string DefaultBackgroundColor { get; set; } = string.Empty;
    public string? DefaultImageUrl { get; set; }
    public List<TimerScheduleRuleResponse> Rules { get; set; } = new();
    public TimerOverrideResponse? Override { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class TimerScheduleRuleResponse
{
    public string Start { get; set; } = string.Empty;
    public string End { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string TextColor { get; set; } = string.Empty;
    public string BackgroundColor { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public sealed class TimerOverrideResponse
{
    public string Label { get; set; } = string.Empty;
    public DateTime StartedAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
}

public sealed class TimerUnauthorizedException : Exception
{
    public TimerUnauthorizedException(string message) : base(message)
    {
    }
}

public sealed class TimerValidationException : Exception
{
    public TimerValidationException(string message) : base(message)
    {
    }
}

public sealed class TimerConflictException : Exception
{
    public TimerConflictException(string message) : base(message)
    {
    }
}

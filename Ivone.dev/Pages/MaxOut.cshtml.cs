using System.Text.Json;
using ivone.dev.Data.Contexts;
using Ivone.dev.Data.Models.Fitness;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Ivone.dev.Pages;

public class MaxOutModel : PageModel
{
    private const int SharedFitnessUserId = 1;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public MaxOutModel(AppDbContext db, IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    public string RequestVerificationToken { get; private set; } = string.Empty;

    public void OnGet()
    {
        RequestVerificationToken = _antiforgery.GetAndStoreTokens(HttpContext).RequestToken ?? string.Empty;
    }

    public async Task<IActionResult> OnGetStateAsync(int userId)
    {
        return await WithFitnessSchemaGuardAsync(async () =>
        {
            if (userId <= 0)
            {
                return BadRequest(new ErrorResponse("Enter a valid user id."));
            }

            var userExists = await _db.FitnessUsers.AnyAsync(x => x.Id == userId);
            if (!userExists)
            {
                return NotFound(new ErrorResponse("That MaxOut id was not found."));
            }

            return new JsonResult(await BuildStateAsync(userId), JsonOptions);
        });
    }

    public async Task<IActionResult> OnPostRecoverAsync()
    {
        return await WithFitnessSchemaGuardAsync(async () =>
        {
            var request = await ReadRequestAsync<RecoverRequest>();
            if (request is null || request.UserId <= 0)
            {
                return BadRequest(new ErrorResponse("Enter a valid user id."));
            }

            var userExists = await _db.FitnessUsers.AnyAsync(x => x.Id == request.UserId);
            if (!userExists)
            {
                return NotFound(new ErrorResponse("That MaxOut id was not found."));
            }

            return new JsonResult(await BuildStateAsync(request.UserId, "Recovered MaxOut data."), JsonOptions);
        });
    }

    public async Task<IActionResult> OnPostCreateUserAsync()
    {
        return await WithFitnessSchemaGuardAsync(async () =>
        {
            var request = await ReadRequestAsync<CreateUserRequest>();
            var user = new FitnessUser
            {
                DeviceLabel = string.IsNullOrWhiteSpace(request?.DeviceLabel) ? "Prototype device" : request.DeviceLabel.Trim(),
                CreatedOnUtc = DateTime.UtcNow,
                UpdatedOnUtc = DateTime.UtcNow
            };

            _db.FitnessUsers.Add(user);
            await _db.SaveChangesAsync();

            return new JsonResult(await BuildStateAsync(user.Id, "Backup ID created."), JsonOptions);
        });
    }

    public async Task<IActionResult> OnPostSaveWorkoutAsync()
    {
        return await WithFitnessSchemaGuardAsync(async () =>
        {
            var request = await ReadRequestAsync<SaveWorkoutRequest>();
            if (request is null || request.UserId <= 0 || request.Workout is null)
            {
                return BadRequest(new ErrorResponse("Workout payload is missing."));
            }

            var userExists = await _db.FitnessUsers.AnyAsync(x => x.Id == request.UserId);
            if (!userExists)
            {
                return NotFound(new ErrorResponse("That MaxOut id was not found."));
            }

            if (!HasTrackableExercises(request.Workout))
            {
                await RemoveEmptyDraftAsync(request.UserId, request.Workout.Id);
                await _db.SaveChangesAsync();
                return new JsonResult(await BuildStateAsync(request.UserId), JsonOptions);
            }

            var workout = await UpsertWorkoutAsync(request.UserId, request.Workout, complete: false);
            await _db.SaveChangesAsync();

            return new JsonResult(await BuildStateAsync(request.UserId, "Workout saved.", workout.Id), JsonOptions);
        });
    }

    public async Task<IActionResult> OnPostEndWorkoutAsync()
    {
        return await WithFitnessSchemaGuardAsync(async () =>
        {
            var request = await ReadRequestAsync<SaveWorkoutRequest>();
            if (request is null || request.UserId <= 0 || request.Workout is null)
            {
                return BadRequest(new ErrorResponse("Workout payload is missing."));
            }

            var userExists = await _db.FitnessUsers.AnyAsync(x => x.Id == request.UserId);
            if (!userExists)
            {
                return NotFound(new ErrorResponse("That MaxOut id was not found."));
            }

            if (!HasTrackableExercises(request.Workout))
            {
                return BadRequest(new ErrorResponse("Add an exercise or activity before ending the workout."));
            }

            var workout = await UpsertWorkoutAsync(request.UserId, request.Workout, complete: true);
            await _db.SaveChangesAsync();

            return new JsonResult(await BuildStateAsync(request.UserId, "Workout archived.", workout.Id), JsonOptions);
        });
    }

    public async Task<IActionResult> OnPostUpdateWorkoutAsync()
    {
        return await WithFitnessSchemaGuardAsync(async () =>
        {
            var request = await ReadRequestAsync<SaveWorkoutRequest>();
            if (request is null || request.UserId <= 0 || request.Workout?.Id is not > 0)
            {
                return BadRequest(new ErrorResponse("Choose a completed workout to update."));
            }
            if (!HasTrackableExercises(request.Workout))
            {
                return BadRequest(new ErrorResponse("A completed workout must contain at least one exercise or activity."));
            }

            var exists = await _db.FitnessWorkouts.AnyAsync(x =>
                x.Id == request.Workout.Id.Value &&
                x.Status == "Completed" &&
                (request.UserId == SharedFitnessUserId || x.FitnessUserId == request.UserId));
            if (!exists)
            {
                return NotFound(new ErrorResponse("That completed workout was not found."));
            }

            var workout = await UpsertWorkoutAsync(
                request.UserId,
                request.Workout,
                complete: true,
                preserveCompletedOnUtc: true);
            await _db.SaveChangesAsync();

            return new JsonResult(await BuildStateAsync(request.UserId, "Workout updated.", workout.Id), JsonOptions);
        });
    }

    public async Task<IActionResult> OnPostDeleteWorkoutAsync()
    {
        return await WithFitnessSchemaGuardAsync(async () =>
        {
            var request = await ReadRequestAsync<DeleteWorkoutRequest>();
            if (request is null || request.UserId <= 0 || request.WorkoutId <= 0)
            {
                return BadRequest(new ErrorResponse("Choose a completed workout to delete."));
            }

            var workout = await _db.FitnessWorkouts.FirstOrDefaultAsync(x =>
                x.Id == request.WorkoutId &&
                x.Status == "Completed" &&
                (request.UserId == SharedFitnessUserId || x.FitnessUserId == request.UserId));
            if (workout is null)
            {
                return NotFound(new ErrorResponse("That completed workout was not found."));
            }

            _db.FitnessWorkouts.Remove(workout);
            await _db.SaveChangesAsync();
            return new JsonResult(await BuildStateAsync(request.UserId, "Workout deleted."), JsonOptions);
        });
    }

    private static async Task<IActionResult> WithFitnessSchemaGuardAsync(Func<Task<IActionResult>> action)
    {
        try
        {
            return await action();
        }
        catch (SqlException ex) when (IsFitnessSchemaException(ex))
        {
            return new BadRequestObjectResult(new ErrorResponse("Run scripts/create-fitness-schema.sql before using MaxOut."));
        }
    }

    private static bool IsFitnessSchemaException(SqlException ex)
    {
        return ex.Number switch
        {
            207 => ex.Message.Contains("ExerciseCategory", StringComparison.OrdinalIgnoreCase) ||
                   ex.Message.Contains("ActivityDataJson", StringComparison.OrdinalIgnoreCase),
            208 => ex.Message.Contains("fitness.", StringComparison.OrdinalIgnoreCase),
            _ => false
        };
    }

    private static bool HasTrackableExercises(WorkoutRequest workout)
    {
        return workout.Exercises?.Any(x => !string.IsNullOrWhiteSpace(x.Name)) == true;
    }

    private async Task RemoveEmptyDraftAsync(int userId, int? workoutId)
    {
        if (!workoutId.HasValue || workoutId.Value <= 0)
        {
            return;
        }

        var workout = await _db.FitnessWorkouts.FirstOrDefaultAsync(x =>
            x.Id == workoutId.Value &&
            x.Status == "InProgress" &&
            (userId == SharedFitnessUserId || x.FitnessUserId == userId));
        if (workout is not null)
        {
            _db.FitnessWorkouts.Remove(workout);
        }
    }

    private async Task<FitnessWorkout> UpsertWorkoutAsync(
        int userId,
        WorkoutRequest workoutRequest,
        bool complete,
        bool preserveCompletedOnUtc = false)
    {
        FitnessWorkout? workout = null;
        if (workoutRequest.Id.HasValue && workoutRequest.Id.Value > 0)
        {
            workout = await _db.FitnessWorkouts
                .Include(x => x.Exercises)
                .ThenInclude(x => x.Sets)
                .FirstOrDefaultAsync(x =>
                    x.Id == workoutRequest.Id.Value &&
                    (userId == SharedFitnessUserId || x.FitnessUserId == userId));
        }

        if (workout is null)
        {
            workout = new FitnessWorkout
            {
                FitnessUserId = userId,
                StartedOnUtc = DateTime.UtcNow,
                CreatedOnUtc = DateTime.UtcNow
            };
            _db.FitnessWorkouts.Add(workout);
        }

        var previousCompletedOnUtc = workout.CompletedOnUtc;
        workout.FitnessUserId = userId;
        workout.Status = complete ? "Completed" : "InProgress";
        workout.WeightUnit = NormalizeUnit(workoutRequest.WeightUnit);
        workout.StartedOnUtc = NormalizeWorkoutStart(workoutRequest.StartedOnUtc, workout.StartedOnUtc);
        workout.CompletedOnUtc = complete
            ? (preserveCompletedOnUtc && previousCompletedOnUtc.HasValue
                ? previousCompletedOnUtc
                : NormalizeWorkoutCompletion(workoutRequest))
            : null;
        workout.UpdatedOnUtc = DateTime.UtcNow;

        _db.FitnessWorkoutSets.RemoveRange(workout.Exercises.SelectMany(x => x.Sets));
        _db.FitnessWorkoutExercises.RemoveRange(workout.Exercises);
        workout.Exercises.Clear();

        var exercises = (workoutRequest.Exercises ?? [])
            .Where(x => !string.IsNullOrWhiteSpace(x.Name))
            .Select((exercise, index) => new FitnessWorkoutExercise
            {
                ExerciseName = exercise.Name!.Trim(),
                ExerciseCategory = string.IsNullOrWhiteSpace(exercise.Category) ? null : exercise.Category.Trim(),
                ActivityDataJson = SerializeActivity(exercise.Activity),
                SortOrder = index,
                Sets = (exercise.Sets ?? [])
                    .Select((set, setIndex) => new FitnessWorkoutSet
                    {
                        SetNumber = setIndex + 1,
                        Reps = Math.Max(0, set.Reps),
                        MaxKg = Math.Max(0, decimal.Round(set.MaxKg, 2))
                    })
                    .ToList()
            })
            .ToList();

        foreach (var exercise in exercises)
        {
            workout.Exercises.Add(exercise);
        }

        return workout;
    }

    private async Task<StateResponse> BuildStateAsync(int userId, string? message = null, int? focusWorkoutId = null)
    {
        var workouts = await _db.FitnessWorkouts
            .AsNoTracking()
            .Include(x => x.Exercises)
            .ThenInclude(x => x.Sets)
            .Where(x => userId == SharedFitnessUserId || x.FitnessUserId == userId)
            .OrderByDescending(x => x.CompletedOnUtc ?? x.StartedOnUtc)
            .ThenByDescending(x => x.Id)
            .ToListAsync();

        var active = workouts
            .Where(x => x.Status == "InProgress" && x.Exercises.Count > 0)
            .OrderByDescending(x => x.UpdatedOnUtc)
            .ThenByDescending(x => x.Id)
            .Select(ToWorkoutDto)
            .FirstOrDefault();

        var history = workouts
            .Where(x => x.Status == "Completed")
            .Select(ToWorkoutDto)
            .ToList();

        return new StateResponse(userId, active, history, focusWorkoutId, message);
    }

    private static WorkoutDto ToWorkoutDto(FitnessWorkout workout)
    {
        return new WorkoutDto(
            workout.Id,
            AsUtc(workout.StartedOnUtc),
            workout.CompletedOnUtc.HasValue ? AsUtc(workout.CompletedOnUtc.Value) : null,
            workout.Status,
            workout.WeightUnit,
            workout.Exercises
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Id)
                .Select(x => new WorkoutExerciseDto(
                    x.Id,
                    x.ExerciseName,
                    x.ExerciseCategory,
                    DeserializeActivity(x.ActivityDataJson),
                    x.Sets
                        .OrderBy(s => s.SetNumber)
                        .ThenBy(s => s.Id)
                        .Select(s => new WorkoutSetDto(s.SetNumber, s.Reps, s.MaxKg))
                        .ToList()))
                .ToList());
    }

    private async Task<T?> ReadRequestAsync<T>()
    {
        try
        {
            return await JsonSerializer.DeserializeAsync<T>(Request.Body, JsonOptions);
        }
        catch (JsonException)
        {
            return default;
        }
    }

    private static string NormalizeUnit(string? unit)
    {
        return string.Equals(unit, "lb", StringComparison.OrdinalIgnoreCase) ? "lb" : "kg";
    }

    private static DateTime NormalizeWorkoutStart(DateTime? requested, DateTime fallback)
    {
        if (!requested.HasValue)
        {
            return fallback == default ? DateTime.UtcNow : fallback;
        }

        var utc = requested.Value.Kind == DateTimeKind.Utc
            ? requested.Value
            : requested.Value.ToUniversalTime();
        var earliest = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        return utc >= earliest && utc <= DateTime.UtcNow.AddDays(1)
            ? utc
            : (fallback == default ? DateTime.UtcNow : fallback);
    }

    private static DateTime AsUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static DateTime NormalizeWorkoutCompletion(WorkoutRequest workout)
    {
        var activityEnd = workout.Exercises?
            .Select(x => NormalizeOptionalUtc(x.Activity?.EndedOnUtc))
            .Where(x => x.HasValue)
            .OrderByDescending(x => x)
            .FirstOrDefault();
        return activityEnd.HasValue
            ? activityEnd.Value
            : DateTime.UtcNow;
    }

    private static string? SerializeActivity(ActivityMetricsDto? activity)
    {
        var normalized = NormalizeActivity(activity);
        return normalized is null ? null : JsonSerializer.Serialize(normalized, JsonOptions);
    }

    private static ActivityMetricsDto? DeserializeActivity(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return NormalizeActivity(JsonSerializer.Deserialize<ActivityMetricsDto>(json, JsonOptions));
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static ActivityMetricsDto? NormalizeActivity(ActivityMetricsDto? activity)
    {
        if (activity is null)
        {
            return null;
        }

        var started = NormalizeOptionalUtc(activity.StartedOnUtc);
        var ended = NormalizeOptionalUtc(activity.EndedOnUtc);
        if (started.HasValue && ended.HasValue && ended < started)
        {
            ended = null;
        }

        return new ActivityMetricsDto(
            TrimTo(activity.SourceFileName, 255),
            started,
            ended,
            ClampDecimal(activity.DistanceKm, 100000m, 3),
            ClampInt(activity.ElapsedSeconds, 60 * 60 * 24 * 31),
            ClampInt(activity.MovingSeconds, 60 * 60 * 24 * 31),
            ClampDecimal(activity.ElevationGainM, 100000m, 1),
            ClampDecimal(activity.ElevationLossM, 100000m, 1),
            ClampDecimal(activity.AverageSpeedKph, 500m, 2),
            ClampDecimal(activity.MaximumSpeedKph, 500m, 2),
            ClampInt(activity.AverageHeartRateBpm, 300),
            ClampInt(activity.MaximumHeartRateBpm, 300),
            ClampDecimal(activity.AverageCadenceRpm, 300m, 1),
            ClampDecimal(activity.MaximumCadenceRpm, 300m, 1),
            ClampInt(activity.TrackPointCount, 2_000_000));
    }

    private static DateTime? NormalizeOptionalUtc(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        var utc = value.Value.Kind == DateTimeKind.Utc ? value.Value : value.Value.ToUniversalTime();
        var earliest = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        return utc >= earliest && utc <= DateTime.UtcNow.AddDays(1) ? utc : null;
    }

    private static decimal? ClampDecimal(decimal? value, decimal maximum, int decimals)
    {
        return value.HasValue && value.Value >= 0
            ? decimal.Round(Math.Min(value.Value, maximum), decimals)
            : null;
    }

    private static int? ClampInt(int? value, int maximum)
    {
        return value.HasValue && value.Value >= 0 ? Math.Min(value.Value, maximum) : null;
    }

    private static string? TrimTo(string? value, int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maximumLength ? trimmed : trimmed[..maximumLength];
    }

    private sealed record RecoverRequest(int UserId);
    private sealed record CreateUserRequest(string? DeviceLabel);
    private sealed record SaveWorkoutRequest(int UserId, WorkoutRequest? Workout);
    private sealed record DeleteWorkoutRequest(int UserId, int WorkoutId);
    private sealed record WorkoutRequest(int? Id, DateTime? StartedOnUtc, string? WeightUnit, List<ExerciseRequest>? Exercises);
    private sealed record ExerciseRequest(string? Name, string? Category, ActivityMetricsDto? Activity, List<SetRequest>? Sets);
    private sealed record SetRequest(int Reps, decimal MaxKg);
    private sealed record ErrorResponse(string Message);
    private sealed record StateResponse(int UserId, WorkoutDto? ActiveWorkout, List<WorkoutDto> History, int? FocusWorkoutId, string? Message);
    private sealed record WorkoutDto(int Id, DateTime StartedOnUtc, DateTime? CompletedOnUtc, string Status, string WeightUnit, List<WorkoutExerciseDto> Exercises);
    private sealed record WorkoutExerciseDto(int Id, string Name, string? Category, ActivityMetricsDto? Activity, List<WorkoutSetDto> Sets);
    private sealed record WorkoutSetDto(int SetNumber, int Reps, decimal MaxKg);
    private sealed record ActivityMetricsDto(
        string? SourceFileName,
        DateTime? StartedOnUtc,
        DateTime? EndedOnUtc,
        decimal? DistanceKm,
        int? ElapsedSeconds,
        int? MovingSeconds,
        decimal? ElevationGainM,
        decimal? ElevationLossM,
        decimal? AverageSpeedKph,
        decimal? MaximumSpeedKph,
        int? AverageHeartRateBpm,
        int? MaximumHeartRateBpm,
        decimal? AverageCadenceRpm,
        decimal? MaximumCadenceRpm,
        int? TrackPointCount);
}

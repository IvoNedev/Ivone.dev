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

            var workout = await UpsertWorkoutAsync(request.UserId, request.Workout, complete: true);
            await _db.SaveChangesAsync();

            return new JsonResult(await BuildStateAsync(request.UserId, "Workout archived.", workout.Id), JsonOptions);
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
            207 => ex.Message.Contains("ExerciseCategory", StringComparison.OrdinalIgnoreCase),
            208 => ex.Message.Contains("fitness.", StringComparison.OrdinalIgnoreCase),
            _ => false
        };
    }

    private async Task<FitnessWorkout> UpsertWorkoutAsync(int userId, WorkoutRequest workoutRequest, bool complete)
    {
        FitnessWorkout? workout = null;
        if (workoutRequest.Id.HasValue && workoutRequest.Id.Value > 0)
        {
            workout = await _db.FitnessWorkouts
                .Include(x => x.Exercises)
                .ThenInclude(x => x.Sets)
                .FirstOrDefaultAsync(x => x.Id == workoutRequest.Id.Value && x.FitnessUserId == userId);
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

        workout.Status = complete ? "Completed" : "InProgress";
        workout.WeightUnit = NormalizeUnit(workoutRequest.WeightUnit);
        workout.CompletedOnUtc = complete ? DateTime.UtcNow : null;
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
            .Where(x => x.FitnessUserId == userId)
            .OrderByDescending(x => x.CompletedOnUtc ?? x.StartedOnUtc)
            .ThenByDescending(x => x.Id)
            .ToListAsync();

        var active = workouts
            .Where(x => x.Status == "InProgress")
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
            workout.StartedOnUtc,
            workout.CompletedOnUtc,
            workout.Status,
            workout.WeightUnit,
            workout.Exercises
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Id)
                .Select(x => new WorkoutExerciseDto(
                    x.Id,
                    x.ExerciseName,
                    x.ExerciseCategory,
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

    private sealed record RecoverRequest(int UserId);
    private sealed record CreateUserRequest(string? DeviceLabel);
    private sealed record SaveWorkoutRequest(int UserId, WorkoutRequest? Workout);
    private sealed record WorkoutRequest(int? Id, string? WeightUnit, List<ExerciseRequest>? Exercises);
    private sealed record ExerciseRequest(string? Name, string? Category, List<SetRequest>? Sets);
    private sealed record SetRequest(int Reps, decimal MaxKg);
    private sealed record ErrorResponse(string Message);
    private sealed record StateResponse(int UserId, WorkoutDto? ActiveWorkout, List<WorkoutDto> History, int? FocusWorkoutId, string? Message);
    private sealed record WorkoutDto(int Id, DateTime StartedOnUtc, DateTime? CompletedOnUtc, string Status, string WeightUnit, List<WorkoutExerciseDto> Exercises);
    private sealed record WorkoutExerciseDto(int Id, string Name, string? Category, List<WorkoutSetDto> Sets);
    private sealed record WorkoutSetDto(int SetNumber, int Reps, decimal MaxKg);
}

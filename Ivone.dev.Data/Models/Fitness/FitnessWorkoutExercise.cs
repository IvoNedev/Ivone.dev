namespace Ivone.dev.Data.Models.Fitness;

public class FitnessWorkoutExercise
{
    public int Id { get; set; }
    public int FitnessWorkoutId { get; set; }
    public string ExerciseName { get; set; } = string.Empty;
    public string? ExerciseCategory { get; set; }
    public int SortOrder { get; set; }
    public FitnessWorkout? Workout { get; set; }
    public ICollection<FitnessWorkoutSet> Sets { get; set; } = new List<FitnessWorkoutSet>();
}

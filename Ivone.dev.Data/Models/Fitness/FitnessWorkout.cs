namespace Ivone.dev.Data.Models.Fitness;

public class FitnessWorkout
{
    public int Id { get; set; }
    public int FitnessUserId { get; set; }
    public DateTime StartedOnUtc { get; set; }
    public DateTime? CompletedOnUtc { get; set; }
    public string Status { get; set; } = "InProgress";
    public string WeightUnit { get; set; } = "kg";
    public DateTime CreatedOnUtc { get; set; }
    public DateTime UpdatedOnUtc { get; set; }
    public FitnessUser? User { get; set; }
    public ICollection<FitnessWorkoutExercise> Exercises { get; set; } = new List<FitnessWorkoutExercise>();
}

namespace Ivone.dev.Data.Models.Fitness;

public class FitnessWorkoutSet
{
    public int Id { get; set; }
    public int FitnessWorkoutExerciseId { get; set; }
    public int SetNumber { get; set; }
    public int Reps { get; set; }
    public decimal MaxKg { get; set; }
    public FitnessWorkoutExercise? Exercise { get; set; }
}

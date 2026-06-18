namespace Ivone.dev.Data.Models.Fitness;

public class FitnessUser
{
    public int Id { get; set; }
    public string? DeviceLabel { get; set; }
    public DateTime CreatedOnUtc { get; set; }
    public DateTime UpdatedOnUtc { get; set; }
    public ICollection<FitnessWorkout> Workouts { get; set; } = new List<FitnessWorkout>();
}

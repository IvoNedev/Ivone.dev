public class UserTimeline
{
    public int Id { get; set; }

    // Foreign key to User (assumed to exist in your Users table)
    public int UserId { get; set; }
    // Foreign key to Timeline
    public int TimelineId { get; set; }

    // Navigation properties (optional)
    public User User { get; set; }
    public Timeline Timeline { get; set; }
}

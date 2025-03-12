using System;

public class TimelineEvent
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public string Title { get; set; }
    public string Notes { get; set; }
    public string? Address { get; set; } // can be null

    // New: link to a Timeline
    public int TimelineId { get; set; }
    public Timeline Timeline { get; set; }
}

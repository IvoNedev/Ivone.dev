using System;
using System.Text.Json.Serialization;

public class TimelineEvent
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public string Title { get; set; }
    public string Notes { get; set; }
    public string? Address { get; set; }
    public string? Url { get; set; }
    public string? MediaUrls { get; set; }
    public string? DatePrecision { get; set; }

    // Link to a Timeline
    public int TimelineId { get; set; }
    [JsonIgnore]
    public Timeline Timeline { get; set; }
}

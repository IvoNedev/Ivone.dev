using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

public class Timeline
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OwnerId { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public ICollection<TimelineEvent> TimelineEvents { get; set; } = new List<TimelineEvent>();

    [JsonIgnore]
    public ICollection<UserTimeline> UserTimelines { get; set; } = new List<UserTimeline>();
}

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

public class Timeline
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int OwnerId { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public ICollection<TimelineEvent> TimelineEvents { get; set; }

    [JsonIgnore]
    public ICollection<UserTimeline> UserTimelines { get; set; }
}

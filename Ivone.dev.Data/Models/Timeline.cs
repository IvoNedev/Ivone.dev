using System;
using System.Collections.Generic;

public class Timeline
{
    public int Id { get; set; }
    public string Name { get; set; } // e.g., "My Personal Timeline"
    public int OwnerId { get; set; } // FK to Users table
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<TimelineEvent> TimelineEvents { get; set; }
    public ICollection<UserTimeline> UserTimelines { get; set; }
}

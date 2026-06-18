using System;
using System.Collections.Generic;

namespace Ivone.dev.Data.Models.Track;

public class TrackTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>"Daily" creates one card per day; "Weekly" creates one card per ISO week.</summary>
    public string Cadence { get; set; } = "Daily";

    public bool IsDefault { get; set; }
    public DateTime CreatedOnUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedOnUtc { get; set; } = DateTime.UtcNow;

    public ICollection<TrackTemplateItem> Items { get; set; } = new List<TrackTemplateItem>();
    public ICollection<TrackTemplateBand> Bands { get; set; } = new List<TrackTemplateBand>();
    public ICollection<TrackNote> Notes { get; set; } = new List<TrackNote>();
}

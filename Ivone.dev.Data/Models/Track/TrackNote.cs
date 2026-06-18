using System;
using System.Collections.Generic;

namespace Ivone.dev.Data.Models.Track;

public class TrackNote
{
    public int Id { get; set; }
    public int? TrackTemplateId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string TemplateNameSnapshot { get; set; } = string.Empty;

    /// <summary>"Daily" = card for a single day; "Weekly" = card for an ISO week (TrackDate is that week's Monday).</summary>
    public string PeriodType { get; set; } = "Daily";

    public DateOnly TrackDate { get; set; }
    public DateTime CreatedOnUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedOnUtc { get; set; } = DateTime.UtcNow;

    public int HardCount { get; set; }
    public int EasyCount { get; set; }

    public TrackTemplate? Template { get; set; }
    public ICollection<TrackNoteItem> Items { get; set; } = new List<TrackNoteItem>();
    public ICollection<TrackNoteBand> Bands { get; set; } = new List<TrackNoteBand>();
}

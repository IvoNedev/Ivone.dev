using System;

namespace Ivone.dev.Data.Models.Track;

public class TrackNoteItem
{
    public int Id { get; set; }
    public int TrackNoteId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Points { get; set; } = 1;
    public bool IsChecked { get; set; }
    public DateTime? CheckedOnUtc { get; set; }
    public int SortOrder { get; set; }

    // Measurable items: TargetValue is baked in at creation (already scaled for this week),
    // ActualValue is what you logged. Null TargetValue means a plain checkbox item.
    // TargetKind: "Amount" (more = better) or "TimeBefore" (values are minutes; earlier = better).
    public string TargetKind { get; set; } = "Amount";
    public string? Unit { get; set; }
    public decimal? TargetValue { get; set; }
    public decimal? ActualValue { get; set; }

    public TrackNote Note { get; set; } = null!;
}

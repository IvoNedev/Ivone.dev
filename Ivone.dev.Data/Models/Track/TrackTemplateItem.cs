namespace Ivone.dev.Data.Models.Track;

public class TrackTemplateItem
{
    public int Id { get; set; }
    public int TrackTemplateId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Points { get; set; } = 1;
    public int SortOrder { get; set; }

    // Progression ("1% better"): when BaseTarget is set the item is measurable
    // and its target grows every week the template has been running.
    // TargetKind: "Amount" (log a number, more = better) or "TimeBefore"
    // (BaseTarget is minutes-since-midnight; logging at/before it is good).
    public string TargetKind { get; set; } = "Amount";
    public string? Unit { get; set; }
    public decimal? BaseTarget { get; set; }

    /// <summary>"None", "Percent" (compound % per week) or "Step" (fixed amount per week).</summary>
    public string GrowthMode { get; set; } = "None";
    public decimal GrowthValue { get; set; }

    public TrackTemplate Template { get; set; } = null!;
}

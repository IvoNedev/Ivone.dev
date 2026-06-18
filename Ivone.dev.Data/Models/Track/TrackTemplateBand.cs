namespace Ivone.dev.Data.Models.Track;

public class TrackTemplateBand
{
    public int Id { get; set; }
    public int TrackTemplateId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int MinPoints { get; set; }
    public int? MaxPoints { get; set; }
    public string ColorHex { get; set; } = "#ef4444";
    public int SortOrder { get; set; }

    public TrackTemplate Template { get; set; } = null!;
}

namespace Ivone.dev.Data.Models.Track;

public class TrackNoteBand
{
    public int Id { get; set; }
    public int TrackNoteId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int MinPoints { get; set; }
    public int? MaxPoints { get; set; }
    public string ColorHex { get; set; } = "#ef4444";
    public int SortOrder { get; set; }

    public TrackNote Note { get; set; } = null!;
}

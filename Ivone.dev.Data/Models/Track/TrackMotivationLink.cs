using System;

namespace Ivone.dev.Data.Models.Track;

public class TrackMotivationLink
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string Provider { get; set; } = "Link";
    public string? EmbedUrl { get; set; }
    public DateTime CreatedOnUtc { get; set; } = DateTime.UtcNow;
}

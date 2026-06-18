using System;

namespace Ivone.dev.Data.Models.Track;

public class TrackProfitEntry
{
    public int Id { get; set; }
    public string EntryType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? Memo { get; set; }
    public DateOnly EntryDate { get; set; }
    public DateTime CreatedOnUtc { get; set; } = DateTime.UtcNow;
}

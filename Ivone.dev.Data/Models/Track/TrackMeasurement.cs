using System;

namespace Ivone.dev.Data.Models.Track;

public class TrackMeasurement
{
    public int Id { get; set; }
    public DateOnly MeasurementDate { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Belly { get; set; }
    public decimal? Chest { get; set; }
    public decimal? Arm { get; set; }
    public decimal? Leg { get; set; }
    public DateTime CreatedOnUtc { get; set; } = DateTime.UtcNow;
}

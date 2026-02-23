using System;

namespace Ivone.dev.Data.Models.Pyt;

public class PytUserPreference
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public PytUser User { get; set; } = null!;

    public int? LastVehicleId { get; set; }
    public PytVehicle? LastVehicle { get; set; }

    public int? LastDriverId { get; set; }
    public PytDriver? LastDriver { get; set; }

    public int? LastStartLocationId { get; set; }
    public PytLocation? LastStartLocation { get; set; }

    public int? LastEndLocationId { get; set; }
    public PytLocation? LastEndLocation { get; set; }

    public string? LastPurpose { get; set; }

    public int TypicalDistanceKm { get; set; } = 50;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ivone.dev.Data.Models.Pyt;

public class PytTrip
{
    public int Id { get; set; }

    public int VehicleId { get; set; }
    public PytVehicle Vehicle { get; set; } = null!;

    public int DriverId { get; set; }
    public PytDriver Driver { get; set; } = null!;

    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }

    public int StartLocationId { get; set; }
    public PytLocation StartLocation { get; set; } = null!;

    public int EndLocationId { get; set; }
    public PytLocation EndLocation { get; set; } = null!;

    public int StartMileage { get; set; }
    public int EndMileage { get; set; }

    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int CreatedByUserId { get; set; }
    public PytUser CreatedByUser { get; set; } = null!;

    [NotMapped]
    public int Distance => EndMileage - StartMileage;
}

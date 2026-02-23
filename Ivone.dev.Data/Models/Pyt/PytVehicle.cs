using System.Collections.Generic;

namespace Ivone.dev.Data.Models.Pyt;

public class PytVehicle
{
    public int Id { get; set; }
    public string PlateNumber { get; set; } = string.Empty;
    public string MakeModel { get; set; } = string.Empty;
    public string FuelType { get; set; } = string.Empty;
    public decimal? AvgConsumption { get; set; }
    public int? LastMileage { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<PytTrip> Trips { get; set; } = new List<PytTrip>();
    public ICollection<PytUserPreference> PreferredByUsers { get; set; } = new List<PytUserPreference>();
}

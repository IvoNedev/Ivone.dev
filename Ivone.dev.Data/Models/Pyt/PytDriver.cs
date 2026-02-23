using System.Collections.Generic;

namespace Ivone.dev.Data.Models.Pyt;

public class PytDriver
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? LicenseNumber { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<PytTrip> Trips { get; set; } = new List<PytTrip>();
    public ICollection<PytUserPreference> PreferredByUsers { get; set; } = new List<PytUserPreference>();
}

using System.Collections.Generic;

namespace Ivone.dev.Data.Models.Pyt;

public class PytLocation
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFavorite { get; set; }

    public ICollection<PytTrip> StartTrips { get; set; } = new List<PytTrip>();
    public ICollection<PytTrip> EndTrips { get; set; } = new List<PytTrip>();
    public ICollection<PytUserPreference> PreferredAsStartByUsers { get; set; } = new List<PytUserPreference>();
    public ICollection<PytUserPreference> PreferredAsEndByUsers { get; set; } = new List<PytUserPreference>();
}

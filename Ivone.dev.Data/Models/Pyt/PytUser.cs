using System;
using System.Collections.Generic;

namespace Ivone.dev.Data.Models.Pyt;

public class PytUser
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int? OrganizationId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PytTrip> Trips { get; set; } = new List<PytTrip>();
    public PytUserPreference? Preference { get; set; }
}

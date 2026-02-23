using System.Text.Json.Serialization;

namespace NPOB.Data.Entities;

public class FinanceCategory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public bool IsDefault { get; set; }
}



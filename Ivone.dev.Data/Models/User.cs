using System.ComponentModel.DataAnnotations;

public class User
{
    [Key] // Marks 'Id' as the Primary Key
    public int Id { get; set; }

    [Required] // Makes 'Email' a required field
    [EmailAddress] // Ensures valid email format
    public string Email { get; set; }

    public bool IsGoogle { get; set; }
    public bool IsFacebook { get; set; }
    public bool IsLinkedIn { get; set; } // Fixed spelling: "LinkedIn"
    public bool IsLocal { get; set; }
    public bool HasPaid { get; set; }

    [Required] // Ensures 'CreatedOn' is always set
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow; // Default to today in UTC
}
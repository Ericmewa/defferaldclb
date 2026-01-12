namespace MyApi.Models;

public class ChecklistItem
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Status { get; set; } = "Pending"; // Pending | Approved | Rejected

    public int ChecklistId { get; set; }
}

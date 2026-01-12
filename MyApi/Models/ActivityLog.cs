namespace MyApi.Models;

public class ActivityLog
{
    public int Id { get; set; }
    public string Message { get; set; }
    public string UserId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public int ChecklistId { get; set; }
}

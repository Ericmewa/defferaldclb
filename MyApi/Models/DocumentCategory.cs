namespace MyApi.Models;

public class DocumentCategory
{
    public int Id { get; set; }
    public string Category { get; set; }

    public List<Document> DocList { get; set; } = new();

    public int ChecklistId { get; set; }
}

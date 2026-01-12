namespace MyApi.Models;

public class Document
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Category { get; set; }
    public string Status { get; set; } = "pending";

    public string RmAction { get; set; }
    public string RmStatus { get; set; }
    public string RmComment { get; set; }
    public string RmFile { get; set; }

    public List<FileItem> CoCreatorFiles { get; set; } = new();

    public string FileUrl { get; set; }

    public string Action { get; set; }
    public string Comment { get; set; }

    public string DeferralReason { get; set; }
    public bool DeferralRequested { get; set; }

    public int DocumentCategoryId { get; set; }
}

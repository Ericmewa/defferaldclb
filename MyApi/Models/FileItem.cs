namespace MyApi.Models;

public class FileItem
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Url { get; set; }

    public int DocumentId { get; set; }
}

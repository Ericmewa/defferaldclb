namespace MyApi.Models
{
    public class UpdateDclStatusRequest
    {
        public string Status { get; set; }
        public string CheckerComment { get; set; }
        public int? CheckerId { get; set; }
    }

    public class ApproveDclRequest
    {
        public string CheckerComment { get; set; }
    }

    public class RejectDclRequest
    {
        public string Remarks { get; set; }
    }
}

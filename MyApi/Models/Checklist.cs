// namespace MyApi.Models;

// public class Checklist
// {
//     public int Id { get; set; }
//     public string DclNo { get; set; }

//     public string CustomerId { get; set; }
//     public string CustomerNo { get; set; }
//     public string CustomerNumber { get; set; }
//     public string CustomerName { get; set; }
//     public string Product { get; set; }
//     public string LoanType { get; set; }

//     public string Rm { get; set; }
//     public string AssignedToRM { get; set; }
//     public string AssignedToCoChecker { get; set; }
//     public string CreatedBy { get; set; }

//     public List<ChecklistItem> ChecklistItems { get; set; } = new();

//     public string Status { get; set; } = "co_creator_review";

//     public int Progress { get; set; } = 0;
//     public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
//     public bool SubmittedToCoChecker { get; set; }

//     public string RmComment { get; set; }
//     public string CoComment { get; set; }

//     public List<DocumentCategory> Documents { get; set; } = new();

//     public List<ActivityLog> Logs { get; set; } = new();

//     public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
//     public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
// }


using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyApi.Models
{
    public class Checklist
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Status { get; set; }

        public string CheckerComment { get; set; }

        public string Remarks { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Relations
        public int? CreatedById { get; set; }
        [ForeignKey("CreatedById")]
        public User CreatedBy { get; set; }

        public int? AssignedToRMId { get; set; }
        [ForeignKey("AssignedToRMId")]
        public User AssignedToRM { get; set; }

        public int? AssignedToCheckerId { get; set; }
        [ForeignKey("AssignedToCheckerId")]
        public User AssignedToChecker { get; set; }

        public ICollection<ChecklistLog> Logs { get; set; } = new List<ChecklistLog>();
    }

    public class ChecklistLog
    {
        [Key]
        public int Id { get; set; }
        public string Message { get; set; }
        public string UserId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class Notification
    {
        [Key]
        public int Id { get; set; }
        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User User { get; set; }

        public string Title { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class User
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
    }
}

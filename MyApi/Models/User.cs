using System.ComponentModel.DataAnnotations;

namespace MyApi.Models
{
    public enum Role { Admin, RM, CoCreator, CoChecker, Customer }

    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        [Required, EmailAddress]
        public string Email { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        [Required]
        public Role Role { get; set; } = Role.Admin;

        public bool IsActive { get; set; } = true;
        public bool IsArchived { get; set; } = false;

        public string CustomerId { get; set; }
        public string CustomerNumber { get; set; }
        public string RmId { get; set; }
    }
}

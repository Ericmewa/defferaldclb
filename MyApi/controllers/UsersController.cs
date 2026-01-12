using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApi.Dtos;
using MyApi.Models;
using MyApi.Services;
using MyApi.Helpers;
using System.Threading.Tasks;

namespace MyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly UserService _userService;

        public UsersController(UserService userService)
        {
            _userService = userService;
        }

        // Create user (Admin only)
        [HttpPost("create-user")]
        [AuthorizeRoles("Admin")]
        public async Task<IActionResult> CreateUser([FromBody] RegisterDto dto)
        {
            if (!Enum.TryParse<Role>(dto.Role, true, out var role))
                return BadRequest(new { message = "Invalid role" });

            var user = await _userService.CreateUser(dto.Name, dto.Email, dto.Password, role);
            if (user == null) return BadRequest(new { message = "User already exists" });

            return Ok(user);
        }

        // Toggle active status
        [HttpPatch("toggle-active/{id}")]
        [AuthorizeRoles("Admin")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var user = await _userService.ToggleActive(id);
            if (user == null) return NotFound(new { message = "User not found" });
            return Ok(user);
        }

        // Archive user
        [HttpPatch("archive-user/{id}")]
        [AuthorizeRoles("Admin")]
        public async Task<IActionResult> ArchiveUser(int id)
        {
            var user = await _userService.ArchiveUser(id);
            if (user == null) return NotFound(new { message = "User not found" });
            return Ok(new { message = "User archived" });
        }

        // Transfer role
        [HttpPatch("transfer-role/{id}")]
        [AuthorizeRoles("Admin")]
        public async Task<IActionResult> TransferRole(int id, [FromBody] string newRole)
        {
            if (!Enum.TryParse<Role>(newRole, true, out var role))
                return BadRequest(new { message = "Invalid role" });

            var user = await _userService.TransferRole(id, role);
            if (user == null) return NotFound(new { message = "User not found" });

            return Ok(user);
        }

        // Optional: Get all users (Admin only)
        [HttpGet]
        [AuthorizeRoles("Admin")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userService.GetAllUsers();
            return Ok(users);
        }
    }
}

// POST /api/users/create-user

// PATCH /api/users/toggle-active/{id}

// PATCH /api/users/archive-user/{id}

// PATCH /api/users/transfer-role/{id}

// GET /api/users
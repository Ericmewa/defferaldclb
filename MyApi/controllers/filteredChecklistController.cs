using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApi.Data;
using MyApi.Models;
using MyApi.Constants;
using MyApi.DTOs;

namespace YourApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChecklistController : ControllerBase
{
    private readonly AppDbContext _db;
    public ChecklistController(AppDbContext db) => _db = db;

    // Helper: read userId & role from claims if present, otherwise from query params
    private (string? userId, string? role) GetUserContext()
    {
        var userId = User?.Claims?.FirstOrDefault(c => c.Type == "sub")?.Value;
        var role = User?.Claims?.FirstOrDefault(c => c.Type == "role")?.Value;

        // fallback to query params if auth not configured
        if (string.IsNullOrEmpty(userId)) userId = HttpContext.Request.Query["userId"].FirstOrDefault();
        if (string.IsNullOrEmpty(role)) role = HttpContext.Request.Query["role"].FirstOrDefault();

        return (userId, role);
    }

    /* ======================================================
       FILTERS
    ====================================================== */

    // GET api/checklist/active?userId=xxx&role=rm
    [HttpGet("active")]
    public async Task<IActionResult> GetActive([FromQuery] string? userIdQuery = null, [FromQuery] string? roleQuery = null)
    {
        var (userId, role) = GetUserContext();
        userId ??= userIdQuery;
        role ??= roleQuery;

        IQueryable<Checklist> q = _db.Checklists
            .Include(c => c.ChecklistItems)
            .Include(c => c.Documents).ThenInclude(dc => dc.DocList)
            .Include(c => c.Logs)
            .AsNoTracking();

        // role-specific active filters
        if (string.Equals(role, "rm", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("userId required for rm role");
            q = q.Where(c => c.AssignedToRM == userId &&
                             (c.Status == ChecklistStatus.PendingRm || c.Status == ChecklistStatus.RmUploading || c.Status == ChecklistStatus.PendingCoCreatorReview));
        }
        else if (string.Equals(role, "cocreator", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("userId required for cocreator role");
            q = q.Where(c => c.CreatedBy == userId && c.Status != ChecklistStatus.Completed);
        }
        else if (string.Equals(role, "checker", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("userId required for checker role");
            q = q.Where(c => c.AssignedToCoChecker == userId && c.Status == ChecklistStatus.PendingChecker);
        }
        else
        {
            // generic active dcls (admin or unspecified)
            q = q.Where(c => c.Status != ChecklistStatus.Completed);
        }

        var results = await q.OrderByDescending(c => c.UpdatedAt).ToListAsync();
        return Ok(results);
    }

    // GET api/checklist/completed?userId=xxx&role=rm
    [HttpGet("completed")]
    public async Task<IActionResult> GetCompleted([FromQuery] string? userIdQuery = null, [FromQuery] string? roleQuery = null)
    {
        var (userId, role) = GetUserContext();
        userId ??= userIdQuery;
        role ??= roleQuery;

        IQueryable<Checklist> q = _db.Checklists
            .Include(c => c.ChecklistItems)
            .Include(c => c.Documents).ThenInclude(dc => dc.DocList)
            .Include(c => c.Logs)
            .AsNoTracking();

        if (!string.IsNullOrEmpty(role))
        {
            if (string.Equals(role, "rm", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(userId)) return BadRequest("userId required for rm role");
                q = q.Where(c => c.AssignedToRM == userId && c.Status == ChecklistStatus.Completed);
            }
            else if (string.Equals(role, "cocreator", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(userId)) return BadRequest("userId required for cocreator role");
                q = q.Where(c => c.CreatedBy == userId && c.Status == ChecklistStatus.Completed);
            }
            else if (string.Equals(role, "checker", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(userId)) return BadRequest("userId required for checker role");
                q = q.Where(c => c.AssignedToCoChecker == userId && c.Status == ChecklistStatus.Completed);
            }
            else
            {
                q = q.Where(c => c.Status == ChecklistStatus.Completed);
            }
        }
        else
        {
            q = q.Where(c => c.Status == ChecklistStatus.Completed);
        }

        var results = await q.OrderByDescending(c => c.UpdatedAt).ToListAsync();
        return Ok(results);
    }

    // GET api/checklist/myqueue?userId=xxx&role=rm
    [HttpGet("myqueue")]
    public async Task<IActionResult> GetMyQueue([FromQuery] string? userIdQuery = null, [FromQuery] string? roleQuery = null)
    {
        var (userId, role) = GetUserContext();
        userId ??= userIdQuery;
        role ??= roleQuery;

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(role))
            return BadRequest("userId and role are required");

        IQueryable<Checklist> q = _db.Checklists
            .Include(c => c.ChecklistItems)
            .Include(c => c.Documents).ThenInclude(dc => dc.DocList)
            .Include(c => c.Logs)
            .AsNoTracking();

        if (string.Equals(role, "rm", StringComparison.OrdinalIgnoreCase))
        {
            q = q.Where(c => c.AssignedToRM == userId && (c.Status == ChecklistStatus.PendingRm || c.Status == ChecklistStatus.RmUploading));
        }
        else if (string.Equals(role, "cocreator", StringComparison.OrdinalIgnoreCase))
        {
            q = q.Where(c => c.CreatedBy == userId && (c.Status == ChecklistStatus.ReturnedByRm || c.Status == ChecklistStatus.PendingCoCreatorReview));
        }
        else if (string.Equals(role, "checker", StringComparison.OrdinalIgnoreCase))
        {
            q = q.Where(c => c.AssignedToCoChecker == userId && c.Status == ChecklistStatus.PendingChecker);
        }
        else
        {
            return Forbid();
        }

        var results = await q.OrderBy(c => c.LastUpdated).ToListAsync();
        return Ok(results);
    }

    // GET api/checklist/reports?start=2025-01-01&end=2025-12-31
    [HttpGet("reports")]
    public async Task<IActionResult> GetReports([FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        var s = start ?? DateTime.UtcNow.AddMonths(-1);
        var e = (end ?? DateTime.UtcNow).Date.AddDays(1).AddTicks(-1);

        var results = await _db.Checklists
            .Include(c => c.Logs)
            .Where(c => c.CreatedAt >= s && c.CreatedAt <= e)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(results);
    }

    /* ======================================================
       WORKFLOW ACTIONS
    ====================================================== */

    // POST api/checklist/{id}/send-to-rm
    [HttpPost("{id}/send-to-rm")]
    public async Task<IActionResult> SendToRm(int id, [FromBody] SendToRmDto dto)
    {
        var dcl = await _db.Checklists.Include(c => c.Logs).FirstOrDefaultAsync(c => c.Id == id);
        if (dcl == null) return NotFound();

        dcl.AssignedToRM = dto.AssignedRmId;
        dcl.Status = ChecklistStatus.PendingRm;
        dcl.LastUpdated = DateTime.UtcNow;

        dcl.Logs.Add(new ActivityLog { Message = $"Sent to RM ({dto.AssignedRmId})", UserId = dcl.CreatedBy, Timestamp = DateTime.UtcNow });

        await _db.SaveChangesAsync();
        return Ok(dcl);
    }

    // POST api/checklist/{id}/rm-upload
    [HttpPost("{id}/rm-upload")]
    public async Task<IActionResult> RmUpload(int id, [FromBody] RmUploadDto dto)
    {
        var dcl = await _db.Checklists
            .Include(c => c.Documents).ThenInclude(dc => dc.DocList)
            .Include(c => c.Logs)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (dcl == null) return NotFound();

        // enforce RM only if auth exists
        var (userId, role) = GetUserContext();
        if (!string.IsNullOrEmpty(role) && string.Equals(role, "rm", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrEmpty(dcl.AssignedToRM) && dcl.AssignedToRM != userId)
                return Forbid("This DCL is not assigned to you.");
        }

        // append documents if provided
        if (dto.Documents != null && dto.Documents.Any())
        {
            // find or create category container(s)
            foreach (var nd in dto.Documents)
            {
                var cat = dcl.Documents.FirstOrDefault(x => x.Category == nd.Category);
                if (cat == null)
                {
                    cat = new DocumentCategory { Category = nd.Category, DocList = new List<Document>() };
                    dcl.Documents.Add(cat);
                }

                cat.DocList.Add(new Document
                {
                    Name = nd.Name,
                    Category = nd.Category,
                    FileUrl = nd.FileUrl,
                    Status = ChecklistStatus.RmUploading
                });
            }
        }

        dcl.RmComment = dto.RmComment;
        dcl.Status = ChecklistStatus.RmUploading;
        dcl.LastUpdated = DateTime.UtcNow;
        dcl.Logs.Add(new ActivityLog { Message = "RM uploaded documents", UserId = userId ?? dcl.AssignedToRM, Timestamp = DateTime.UtcNow });

        await _db.SaveChangesAsync();
        return Ok(dcl);
    }

    // POST api/checklist/{id}/return-to-cocreator
    [HttpPost("{id}/return-to-cocreator")]
    public async Task<IActionResult> ReturnToCoCreator(int id, [FromBody] ReturnToCoCreatorDto dto)
    {
        var dcl = await _db.Checklists.Include(c => c.Logs).FirstOrDefaultAsync(c => c.Id == id);
        if (dcl == null) return NotFound();

        // RM only guard
        var (userId, role) = GetUserContext();
        if (!string.IsNullOrEmpty(role) && string.Equals(role, "rm", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrEmpty(dcl.AssignedToRM) && dcl.AssignedToRM != userId)
                return Forbid("This DCL is not assigned to you.");
        }

        dcl.Status = ChecklistStatus.ReturnedByRm;
        dcl.RmComment = dto.Comment;
        dcl.LastUpdated = DateTime.UtcNow;
        dcl.Logs.Add(new ActivityLog { Message = $"Returned to co-creator: {dto.Comment}", UserId = userId ?? dcl.AssignedToRM, Timestamp = DateTime.UtcNow });

        await _db.SaveChangesAsync();
        return Ok(dcl);
    }

    // POST api/checklist/{id}/confirm-by-cocreator
    [HttpPost("{id}/confirm-by-cocreator")]
    public async Task<IActionResult> ConfirmByCoCreator(int id, [FromBody] ConfirmByCoCreatorDto dto)
    {
        var dcl = await _db.Checklists.Include(c => c.Logs).FirstOrDefaultAsync(c => c.Id == id);
        if (dcl == null) return NotFound();

        var (userId, role) = GetUserContext();
        if (!string.IsNullOrEmpty(role) && string.Equals(role, "cocreator", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrEmpty(dcl.CreatedBy) && dcl.CreatedBy != userId)
                return Forbid("This DCL was not created by you.");
        }

        // co-creator validated uploads, send to co-checker
        dcl.Status = ChecklistStatus.PendingChecker;
        dcl.SubmittedToCoChecker = true;
        dcl.LastUpdated = DateTime.UtcNow;
        dcl.Logs.Add(new ActivityLog { Message = $"Co-creator confirmed uploads and submitted to co-checker: {dto.Comment}", UserId = userId ?? dcl.CreatedBy, Timestamp = DateTime.UtcNow });

        await _db.SaveChangesAsync();
        return Ok(dcl);
    }

    // POST api/checklist/{id}/complete
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        var dcl = await _db.Checklists.Include(c => c.Logs).FirstOrDefaultAsync(c => c.Id == id);
        if (dcl == null) return NotFound();

        // optional: only checker or admin can complete
        var (userId, role) = GetUserContext();
        if (!string.IsNullOrEmpty(role) && string.Equals(role, "checker", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrEmpty(dcl.AssignedToCoChecker) && dcl.AssignedToCoChecker != userId)
                return Forbid("This DCL is not assigned to you.");
        }

        dcl.Status = ChecklistStatus.Completed;
        dcl.LastUpdated = DateTime.UtcNow;
        dcl.Logs.Add(new ActivityLog { Message = "Checklist marked as completed", UserId = userId, Timestamp = DateTime.UtcNow });

        await _db.SaveChangesAsync();
        return Ok(dcl);
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BankSystem.Data;
using BankSystem.Models;

namespace BankSystem.Controllers
{
    [ApiController]
    [Route("api/checker")]
    public class CheckerController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CheckerController(AppDbContext db)
        {
            _db = db;
        }

        // -----------------------------
        // 1. Active DCLs (CoCreator stage)
        // -----------------------------
        [HttpGet("active-dcls")]
        public async Task<IActionResult> GetCheckerActiveDCLs()
        {
            var dcls = await _db.Checklists
                .Include(c => c.AssignedToRM)
                .Include(c => c.CreatedBy)
                .Where(c => c.Status == "co_creator_review")
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return Ok(dcls);
        }

        // -----------------------------
        // 2. My Queue
        // -----------------------------
        [HttpGet("my-queue/{checkerId}")]
        public async Task<IActionResult> GetCheckerMyQueue(int checkerId)
        {
            var dcls = await _db.Checklists
                .Include(c => c.AssignedToRM)
                .Include(c => c.CreatedBy)
                .Where(c => c.AssignedToCheckerId == checkerId && c.Status == "in_progress")
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            return Ok(dcls);
        }

        // -----------------------------
        // 3. Completed DCLs
        // -----------------------------
        [HttpGet("completed/{checkerId}")]
        public async Task<IActionResult> GetCompletedDCLsForChecker(int checkerId)
        {
            var dcls = await _db.Checklists
                .Include(c => c.AssignedToRM)
                .Include(c => c.CreatedBy)
                .Include(c => c.AssignedToChecker)
                .Where(c => c.AssignedToCheckerId == checkerId && c.Status == "approved")
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            return Ok(dcls);
        }

        // -----------------------------
        // 4. Get Single DCL
        // -----------------------------
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCheckerDclById(int id)
        {
            var dcl = await _db.Checklists
                .Include(c => c.AssignedToRM)
                .Include(c => c.CreatedBy)
                .Include(c => c.AssignedToChecker)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (dcl == null) return NotFound(new { error = "DCL not found" });
            return Ok(dcl);
        }

        // -----------------------------
        // 5. Update DCL Status
        // -----------------------------
        [HttpPatch("{id}/update-status")]
        public async Task<IActionResult> UpdateCheckerDclStatus(int id, [FromBody] UpdateDclStatusRequest request)
        {
            var dcl = await _db.Checklists.FindAsync(id);
            if (dcl == null) return NotFound(new { error = "DCL not found" });

            if (!string.IsNullOrEmpty(request.Status)) dcl.Status = request.Status;
            if (!string.IsNullOrEmpty(request.CheckerComment)) dcl.CheckerComment = request.CheckerComment;
            if (request.CheckerId.HasValue) dcl.AssignedToCheckerId = request.CheckerId;

            dcl.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(dcl);
        }

        // -----------------------------
        // 6. Approve DCL + Notifications
        // -----------------------------
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveCheckerDcl(int id, [FromBody] ApproveDclRequest request)
        {
            var dcl = await _db.Checklists.FindAsync(id);
            if (dcl == null) return NotFound(new { error = "DCL not found" });

            dcl.Status = "approved";
            dcl.CheckerComment = request.CheckerComment ?? "";
            dcl.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var notifications = new List<Notification>
            {
                new Notification
                {
                    UserId = dcl.CreatedById.Value,
                    Title = "DCL Approved",
                    Message = $"Your DCL ({dcl.Id}) has been approved."
                }
            };
            if (dcl.AssignedToRMId.HasValue)
            {
                notifications.Add(new Notification
                {
                    UserId = dcl.AssignedToRMId.Value,
                    Title = "DCL Approved",
                    Message = $"A DCL assigned to you ({dcl.Id}) has been approved."
                });
            }

            await _db.Notifications.AddRangeAsync(notifications);
            await _db.SaveChangesAsync();

            return Ok(new { message = "DCL approved and notifications sent", dcl });
        }

        // -----------------------------
        // 7. Reject DCL + Notifications
        // -----------------------------
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectCheckerDcl(int id, [FromBody] RejectDclRequest request)
        {
            var dcl = await _db.Checklists.FindAsync(id);
            if (dcl == null) return NotFound(new { error = "DCL not found" });

            dcl.Status = "rejected";
            dcl.Remarks = request.Remarks ?? "";
            dcl.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var notifications = new List<Notification>
            {
                new Notification
                {
                    UserId = dcl.CreatedById.Value,
                    Title = "DCL Rejected",
                    Message = $"Your DCL ({dcl.Id}) was rejected. Reason: {dcl.Remarks}"
                }
            };
            if (dcl.AssignedToRMId.HasValue)
            {
                notifications.Add(new Notification
                {
                    UserId = dcl.AssignedToRMId.Value,
                    Title = "DCL Rejected",
                    Message = $"A DCL assigned to you ({dcl.Id}) was rejected."
                });
            }

            await _db.Notifications.AddRangeAsync(notifications);
            await _db.SaveChangesAsync();

            return Ok(new { message = "DCL rejected and notifications sent", dcl });
        }

        // -----------------------------
        // 8. Checker Reports (Counts)
        // -----------------------------
        [HttpGet("reports/{checkerId}")]
        public async Task<IActionResult> GetCheckerReports(int checkerId)
        {
            var myQueueCount = await _db.Checklists.CountAsync(c => c.AssignedToCheckerId == checkerId && c.Status == "in_progress");
            var activeDclsCount = await _db.Checklists.CountAsync(c => c.Status == "co_creator_review");
            var completedCount = await _db.Checklists.CountAsync(c => c.AssignedToCheckerId == checkerId && c.Status == "approved");

            return Ok(new
            {
                myQueue = myQueueCount,
                activeDcls = activeDclsCount,
                completed = completedCount
            });
        }

        // -----------------------------
        // 9. Auto-Move My Queue → Completed
        // -----------------------------
        [HttpGet("auto-move/{checkerId}")]
        public async Task<IActionResult> GetAutoMovedCheckerMyQueue(int checkerId)
        {
            var dcls = await _db.Checklists
                .Include(c => c.AssignedToRM)
                .Include(c => c.CreatedBy)
                .Where(c => c.AssignedToCheckerId == checkerId && c.Status != "approved")
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            return Ok(dcls);
        }
    }
}

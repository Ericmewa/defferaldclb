using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyApi.Models;
using MyApi.Data;


namespace MyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChecklistController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChecklistController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _db.Checklists
            .Include(c => c.ChecklistItems)
            .Include(c => c.Documents).ThenInclude(d => d.DocList)
            .Include(c => c.Logs)
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _db.Checklists
            .Include(c => c.ChecklistItems)
            .Include(c => c.Documents).ThenInclude(d => d.DocList)
            .Include(c => c.Logs)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Checklist checklist)
    {
        await _db.Checklists.AddAsync(checklist);
        await _db.SaveChangesAsync();
        return Ok(checklist);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Checklist updated)
    {
        var existing = await _db.Checklists.FindAsync(id);
        if (existing == null) return NotFound();

        updated.Id = id;
        _db.Entry(existing).CurrentValues.SetValues(updated);
        await _db.SaveChangesAsync();

        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var checklist = await _db.Checklists.FindAsync(id);
        if (checklist == null) return NotFound();

        _db.Checklists.Remove(checklist);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Deleted successfully" });
    }

    [HttpGet("active")]
public async Task<IActionResult> GetActive()
{
    var data = await _db.Checklists
        .Where(c => c.Status == ChecklistStatus.Active || 
                    c.Status == ChecklistStatus.CoCreatorReview ||
                    c.Status == ChecklistStatus.RmReview)
        .Include(c => c.ChecklistItems)
        .ToListAsync();

    return Ok(data);
},

// get completed dcls
[HttpGet("completed")]
public async Task<IActionResult> GetCompleted()
{
    var data = await _db.Checklists
        .Where(c => c.Status == ChecklistStatus.Completed)
        .Include(c => c.ChecklistItems)
        .ToListAsync();

    return Ok(data);
},

// get for rms only
[HttpGet("my-queue/{rmId}")]
public async Task<IActionResult> GetMyQueue(string rmId)
{
    var data = await _db.Checklists
        .Where(c => c.AssignedToRM == rmId &&
                    c.Status == ChecklistStatus.RmReview)
        .Include(c => c.Documents).ThenInclude(d => d.DocList)
        .ToListAsync();

    return Ok(data);
},

// reports
[HttpGet("reports")]
public async Task<IActionResult> GetReports(DateTime startDate, DateTime endDate)
{
    var data = await _db.Checklists
        .Where(c => c.CreatedAt >= startDate && c.CreatedAt <= endDate)
        .Include(c => c.Logs)
        .ToListAsync();

    return Ok(data);
},

// Co-Creator → Send to RM
[HttpPost("{id}/send-to-rm")]
public async Task<IActionResult> SendToRm(int id)
{
    var dcl = await _db.Checklists.FindAsync(id);
    if (dcl == null) return NotFound();

    dcl.Status = ChecklistStatus.RmReview;
    dcl.LastUpdated = DateTime.UtcNow;

    dcl.Logs.Add(new ActivityLog {
        Message = "Checklist sent to RM for review",
        Timestamp = DateTime.UtcNow
    });

    await _db.SaveChangesAsync();
    return Ok(dcl);
},

// RM → Uploads Documents

[HttpPost("{id}/rm-upload")]
public async Task<IActionResult> RmUpload(int id, [FromBody] RmUpdateDto dto)
{
    var dcl = await _db.Checklists
        .Include(c => c.Documents)
        .ThenInclude(d => d.DocList)
        .FirstOrDefaultAsync(c => c.Id == id);

    if (dcl == null) return NotFound();

    dcl.RmComment = dto.Comment;
    dcl.LastUpdated = DateTime.UtcNow;

    dcl.Logs.Add(new ActivityLog {
        Message = "RM uploaded documents",
        Timestamp = DateTime.UtcNow
    });

    await _db.SaveChangesAsync();
    return Ok(dcl);
},

// RM → Return to Co-Creator (If Not Complete)
[HttpPost("{id}/return-to-cocreator")]
public async Task<IActionResult> ReturnToCoCreator(int id, [FromBody] string comment)
{
    var dcl = await _db.Checklists.FindAsync(id);
    if (dcl == null) return NotFound();

    dcl.Status = ChecklistStatus.ReturnedByRM;
    dcl.RmComment = comment;
    dcl.LastUpdated = DateTime.UtcNow;

    dcl.Logs.Add(new ActivityLog {
        Message = "Returned by RM: " + comment,
        Timestamp = DateTime.UtcNow
    });

    await _db.SaveChangesAsync();
    return Ok(dcl);
}
,

// Co-Creator Confirms All Uploaded → Approves → Sends to Co-Checker

[HttpPost("{id}/send-to-cochecker")]
public async Task<IActionResult> SubmitToCoChecker(int id)
{
    var dcl = await _db.Checklists.FindAsync(id);
    if (dcl == null) return NotFound();

    dcl.Status = ChecklistStatus.SubmittedToCoChecker;
    dcl.SubmittedToCoChecker = true;
    dcl.LastUpdated = DateTime.UtcNow;

    dcl.Logs.Add(new ActivityLog {
        Message = "DCL submitted to Co-Checker",
        Timestamp = DateTime.UtcNow
    });

    await _db.SaveChangesAsync();
    return Ok(dcl);
}
,
// Final Approval — Mark as Completed

[HttpPost("{id}/complete")]
public async Task<IActionResult> CompleteDcl(int id)
{
    var dcl = await _db.Checklists.FindAsync(id);
    if (dcl == null) return NotFound();

    dcl.Status = ChecklistStatus.Completed;
    dcl.LastUpdated = DateTime.UtcNow;

    dcl.Logs.Add(new ActivityLog {
        Message = "DCL marked as completed",
        Timestamp = DateTime.UtcNow
    });

    await _db.SaveChangesAsync();
    return Ok(dcl);
}

// 

}




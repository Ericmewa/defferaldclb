using Microsoft.EntityFrameworkCore;
using MyApi.Models;

namespace MyApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Checklist> Checklists { get; set; }
    public DbSet<DocumentCategory> DocumentCategories { get; set; }
    public DbSet<Document> Documents { get; set; }
    public DbSet<ChecklistItem> ChecklistItems { get; set; }
    public DbSet<ActivityLog> ActivityLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DocumentCategory>()
            .HasMany(c => c.DocList)
            .WithOne()
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Checklist>()
            .HasMany(c => c.ChecklistItems)
            .WithOne()
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Checklist>()
            .HasMany(c => c.Documents)
            .WithOne()
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Checklist>()
            .HasMany(c => c.Logs)
            .WithOne()
            .OnDelete(DeleteBehavior.Cascade);
    }
}

using Microsoft.EntityFrameworkCore;
using MyWatchState.Domain.Entities;

namespace MyWatchState.Infrastructure.Data;

public class AppDbContext : DbContext {
  public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

  public DbSet<User> Users => Set<User>();
  public DbSet<Video> Videos => Set<Video>();
  public DbSet<UserVideoProgress> UserVideoProgress => Set<UserVideoProgress>();
  public DbSet<WatchSession> WatchSessions => Set<WatchSession>();

  protected override void OnModelCreating(ModelBuilder modelBuilder) {
    base.OnModelCreating(modelBuilder);
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
  }

  public override int SaveChanges() {
    SetAuditTimestamps();
    return base.SaveChanges();
  }

  public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) {
    SetAuditTimestamps();
    return base.SaveChangesAsync(cancellationToken);
  }

  private void SetAuditTimestamps() {
    var now = DateTimeOffset.UtcNow;
    foreach (var entry in ChangeTracker.Entries<BaseEntity>()) {
      switch (entry.State) {
        case EntityState.Added:
          entry.Entity.CreatedAt = now;
          entry.Entity.UpdatedAt = now;
          break;
        case EntityState.Modified:
          entry.Entity.UpdatedAt = now;
          break;
      }
    }
  }
}

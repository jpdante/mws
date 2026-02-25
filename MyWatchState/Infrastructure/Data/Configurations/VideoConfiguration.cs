using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyWatchState.Domain.Entities;

namespace MyWatchState.Infrastructure.Data.Configurations;

/// <summary>
/// Handles the two things that [Index]/[MaxLength] attributes cannot express:
///   1. Enum stored as string for DB readability.
///   2. Filtered partial unique index on (platform, platform_video_id).
/// Everything else is declared via attributes on <see cref="Video"/>.
/// </summary>
public class VideoConfiguration : IEntityTypeConfiguration<Video> {
  public void Configure(EntityTypeBuilder<Video> builder) {
    builder.Property(v => v.Platform)
      .HasConversion<string>()
      .HasMaxLength(50);

    builder.HasIndex(v => new { v.Platform, v.PlatformVideoId })
      .IsUnique()
      .HasFilter("platform_video_id IS NOT NULL");
  }
}

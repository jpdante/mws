using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using MyWatchState.Domain.Enums;

namespace MyWatchState.Domain.Entities;

// (Platform, PlatformVideoId) partial unique index lives in VideoConfiguration — [Index] has no HasFilter support
[Index(nameof(Url), IsUnique = true)]
public class Video : BaseEntity {
  [Required]
  public VideoPlatform Platform { get; set; }

  /// <summary>Platform-native ID (e.g. YouTube video ID). Null for generic URLs.</summary>
  [MaxLength(255)]
  public string? PlatformVideoId { get; set; }

  /// <summary>Normalized canonical URL — unique per video.</summary>
  [Required]
  [MaxLength(2048)]
  public string Url { get; set; } = string.Empty;

  [MaxLength(1024)]
  public string? Title { get; set; }

  public double? DurationSeconds { get; set; }

  [InverseProperty(nameof(UserVideoProgress.Video))]
  public ICollection<UserVideoProgress> UserProgress { get; set; } = [];

  [InverseProperty(nameof(WatchSession.Video))]
  public ICollection<WatchSession> WatchSessions { get; set; } = [];
}

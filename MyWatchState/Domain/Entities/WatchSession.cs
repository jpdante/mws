using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyWatchState.Domain.Entities;

[Index(nameof(UserId), nameof(VideoId))]
[Index(nameof(StartedAt))]
public class WatchSession : BaseEntity {
  [Required]
  public long UserId { get; set; }

  [ForeignKey(nameof(UserId))]
  [InverseProperty(nameof(User.WatchSessions))]
  public User User { get; set; } = null!;

  [Required]
  public long VideoId { get; set; }

  [ForeignKey(nameof(VideoId))]
  [InverseProperty(nameof(Video.WatchSessions))]
  public Video Video { get; set; } = null!;

  [Required]
  public DateTimeOffset StartedAt { get; set; }
  public DateTimeOffset? EndedAt { get; set; }

  /// <summary>Progress (seconds) when this session began.</summary>
  [Required]
  public double ProgressAtStart { get; set; }

  /// <summary>Progress (seconds) when this session ended. Null if session is still open.</summary>
  public double? ProgressAtEnd { get; set; }
}

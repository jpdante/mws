using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyWatchState.Domain.Entities;

[Index(nameof(UserId), nameof(VideoId), IsUnique = true)]
[Index(nameof(UserId))]
public class UserVideoProgress : BaseEntity {
  [Required]
  public long UserId { get; set; }

  [ForeignKey(nameof(UserId))]
  [InverseProperty(nameof(User.VideoProgress))]
  public User User { get; set; } = null!;

  [Required]
  public long VideoId { get; set; }

  [ForeignKey(nameof(VideoId))]
  [InverseProperty(nameof(Video.UserProgress))]
  public Video Video { get; set; } = null!;

  [Required]
  public double ProgressSeconds { get; set; }

  /// <summary>
  /// Duration reported by the client — overrides Video.DurationSeconds when set,
  /// useful before the shared record has been populated.
  /// </summary>
  public double? DurationSeconds { get; set; }

  public bool IsCompleted { get; set; }
  public DateTimeOffset? LastWatchedAt { get; set; }
}

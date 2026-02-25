using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyWatchState.Domain.Entities;

[Index(nameof(KeycloakId), IsUnique = true)]
[Index(nameof(Email), IsUnique = true)]
public class User : BaseEntity {
  [Required]
  public Guid KeycloakId { get; set; }

  [Required]
  [MaxLength(256)]
  public string Username { get; set; } = string.Empty;

  [Required]
  [MaxLength(256)]
  public string Email { get; set; } = string.Empty;

  [InverseProperty(nameof(UserVideoProgress.User))]
  public ICollection<UserVideoProgress> VideoProgress { get; set; } = [];

  [InverseProperty(nameof(WatchSession.User))]
  public ICollection<WatchSession> WatchSessions { get; set; } = [];
}

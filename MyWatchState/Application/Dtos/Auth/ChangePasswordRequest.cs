using System.ComponentModel.DataAnnotations;

namespace MyWatchState.Application.Dtos.Auth;

public class ChangePasswordRequest {
  [Required]
  [MinLength(8)]
  [MaxLength(128)]
  public string NewPassword { get; set; } = string.Empty;
}

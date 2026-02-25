using System.ComponentModel.DataAnnotations;

namespace MyWatchState.Application.Dtos.Progress;

public class QueryProgressRequest {
  [Required]
  public List<string> Urls { get; set; } = [];
}

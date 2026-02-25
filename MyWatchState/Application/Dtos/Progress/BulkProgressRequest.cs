using System.ComponentModel.DataAnnotations;

namespace MyWatchState.Application.Dtos.Progress;

public class BulkProgressRequest {
  [Required]
  public List<ProgressEntryDto> Entries { get; set; } = [];
}

public class ProgressEntryDto {
  [Required]
  [MaxLength(2048)]
  public string Url { get; set; } = string.Empty;

  [MaxLength(1024)]
  public string? Title { get; set; }

  [Required]
  [Range(0, double.MaxValue)]
  public double ProgressSeconds { get; set; }

  [Range(0, double.MaxValue)]
  public double? DurationSeconds { get; set; }

  public bool IsCompleted { get; set; }
}

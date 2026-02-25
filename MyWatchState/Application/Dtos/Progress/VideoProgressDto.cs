namespace MyWatchState.Application.Dtos.Progress;

public record VideoProgressDto(
  string Url,
  string? Title,
  double ProgressSeconds,
  double? DurationSeconds,
  bool IsCompleted,
  DateTimeOffset? LastWatchedAt
);

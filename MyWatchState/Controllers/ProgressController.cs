using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MyWatchState.Application.Dtos.Progress;
using MyWatchState.Domain.Entities;
using MyWatchState.Helpers;
using MyWatchState.Infrastructure.Data;

namespace MyWatchState.Controllers;

[ApiController]
[Route("api/v1/progress")]
[Authorize]
public class ProgressController : ControllerBase {
  private readonly AppDbContext _db;

  public ProgressController(AppDbContext db) => _db = db;

  /// <summary>
  /// Bulk upsert watch progress. The extension calls this every ~60s with buffered entries.
  /// Progress only ever moves forward — stale syncs from other devices won't overwrite newer data.
  /// Open watch sessions within the last 5 minutes are extended rather than duplicated.
  /// </summary>
  [HttpPost("bulk")]
  [EnableRateLimiting("BulkProgress")]
  public async Task<IActionResult> Bulk([FromBody] BulkProgressRequest request, CancellationToken ct) {
    if (request.Entries.Count > 50)
      return BadRequest(new { error = "Maximum 50 entries per batch." });

    var user = await GetOrCreateUserAsync(ct);
    var now = DateTimeOffset.UtcNow;

    // Normalize and deduplicate URLs within this batch
    var entries = request.Entries
      .Select(e => (Raw: e, Normalized: UrlNormalizer.Normalize(e.Url)))
      .DistinctBy(e => e.Normalized.Url)
      .ToList();

    var urls = entries.Select(e => e.Normalized.Url).ToHashSet();

    // Load existing videos; insert new ones in a single batch flush
    var existingVideos = await _db.Videos
      .Where(v => urls.Contains(v.Url))
      .ToDictionaryAsync(v => v.Url, ct);

    var newVideos = entries
      .Where(e => !existingVideos.ContainsKey(e.Normalized.Url))
      .Select(e => new Video {
        Url = e.Normalized.Url,
        Platform = e.Normalized.Platform,
        PlatformVideoId = e.Normalized.PlatformVideoId,
        Title = e.Raw.Title,
        DurationSeconds = e.Raw.DurationSeconds,
      })
      .ToList();

    if (newVideos.Count > 0) {
      _db.Videos.AddRange(newVideos);
      await _db.SaveChangesAsync(ct); // flush to obtain generated IDs
      foreach (var v in newVideos) existingVideos[v.Url] = v;
    }

    var videoIds = existingVideos.Values.Select(v => v.Id).ToList();

    // Load existing progress records and open sessions in two queries
    var existingProgress = await _db.UserVideoProgress
      .Where(p => p.UserId == user.Id && videoIds.Contains(p.VideoId))
      .ToDictionaryAsync(p => p.VideoId, ct);

    var sessionThreshold = now.AddMinutes(-5);
    var openSessions = await _db.WatchSessions
      .Where(s => s.UserId == user.Id
               && videoIds.Contains(s.VideoId)
               && s.EndedAt == null
               && s.UpdatedAt >= sessionThreshold)
      .ToDictionaryAsync(s => s.VideoId, ct);

    foreach (var (raw, normalized) in entries) {
      var video = existingVideos[normalized.Url];

      // Backfill shared video metadata from first client that has it
      if (raw.Title != null && video.Title == null) video.Title = raw.Title;
      if (raw.DurationSeconds.HasValue && !video.DurationSeconds.HasValue)
        video.DurationSeconds = raw.DurationSeconds;

      // Upsert progress — never go backwards (multi-device safety)
      if (!existingProgress.TryGetValue(video.Id, out var progress)) {
        progress = new UserVideoProgress { UserId = user.Id, VideoId = video.Id };
        _db.UserVideoProgress.Add(progress);
        existingProgress[video.Id] = progress;
      }

      if (raw.ProgressSeconds > progress.ProgressSeconds)
        progress.ProgressSeconds = raw.ProgressSeconds;
      progress.DurationSeconds ??= raw.DurationSeconds;
      progress.IsCompleted = progress.IsCompleted || raw.IsCompleted;
      progress.LastWatchedAt = now;

      // Extend open session or start a new one
      if (openSessions.TryGetValue(video.Id, out var session)) {
        session.ProgressAtEnd = raw.ProgressSeconds;
      } else {
        session = new WatchSession {
          UserId = user.Id,
          VideoId = video.Id,
          StartedAt = now,
          ProgressAtStart = raw.ProgressSeconds,
        };
        _db.WatchSessions.Add(session);
        openSessions[video.Id] = session;
      }
    }

    await _db.SaveChangesAsync(ct);
    return NoContent();
  }

  /// <summary>
  /// Query watched state for a list of URLs in one request.
  /// Used by the extension to gray out thumbnails on page load.
  /// Only returns entries that have progress — absent = never watched.
  /// </summary>
  [HttpPost("query")]
  [EnableRateLimiting("QueryProgress")]
  public async Task<ActionResult<List<VideoProgressDto>>> Query(
    [FromBody] QueryProgressRequest request, CancellationToken ct) {
    if (request.Urls.Count > 100)
      return BadRequest(new { error = "Maximum 100 URLs per query." });

    var user = await GetOrCreateUserAsync(ct);

    var normalizedUrls = request.Urls
      .Select(u => UrlNormalizer.Normalize(u).Url)
      .Distinct()
      .ToList();

    var results = await _db.UserVideoProgress
      .Where(p => p.UserId == user.Id && normalizedUrls.Contains(p.Video.Url))
      .Select(p => new VideoProgressDto(
        p.Video.Url,
        p.Video.Title,
        p.ProgressSeconds,
        p.DurationSeconds ?? p.Video.DurationSeconds,
        p.IsCompleted,
        p.LastWatchedAt))
      .ToListAsync(ct);

    return Ok(results);
  }

  /// <summary>Paginated watch history, newest first.</summary>
  [HttpGet("history")]
  [EnableRateLimiting("QueryProgress")]
  public async Task<ActionResult<PagedResult<VideoProgressDto>>> History(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    CancellationToken ct = default) {
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);

    var user = await GetOrCreateUserAsync(ct);

    var query = _db.UserVideoProgress
      .Where(p => p.UserId == user.Id)
      .OrderByDescending(p => p.LastWatchedAt);

    var total = await query.CountAsync(ct);
    var items = await query
      .Skip((page - 1) * pageSize)
      .Take(pageSize)
      .Select(p => new VideoProgressDto(
        p.Video.Url,
        p.Video.Title,
        p.ProgressSeconds,
        p.DurationSeconds ?? p.Video.DurationSeconds,
        p.IsCompleted,
        p.LastWatchedAt))
      .ToListAsync(ct);

    return Ok(new PagedResult<VideoProgressDto>(items, total, page, pageSize));
  }

  /// <summary>Removes a progress record (and its sessions cascade via FK).</summary>
  [HttpDelete("{videoId:long}")]
  public async Task<IActionResult> Delete(long videoId, CancellationToken ct) {
    var user = await GetOrCreateUserAsync(ct);

    var deleted = await _db.UserVideoProgress
      .Where(p => p.UserId == user.Id && p.VideoId == videoId)
      .ExecuteDeleteAsync(ct);

    return deleted > 0 ? NoContent() : NotFound();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// <summary>
  /// Returns the local User record for the JWT caller, creating it on first access.
  /// Keycloak is the source of truth for identity; we mirror just enough for FKs.
  /// </summary>
  private async Task<User> GetOrCreateUserAsync(CancellationToken ct) {
    var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
      ?? throw new UnauthorizedAccessException("Missing sub claim.");
    var keycloakId = Guid.Parse(sub);

    var user = await _db.Users.FirstOrDefaultAsync(u => u.KeycloakId == keycloakId, ct);
    if (user is not null) return user;

    user = new User {
      KeycloakId = keycloakId,
      Username = User.FindFirst("preferred_username")?.Value
        ?? User.FindFirst(ClaimTypes.Name)?.Value
        ?? keycloakId.ToString("N"),
      Email = User.FindFirst(ClaimTypes.Email)?.Value
        ?? string.Empty,
    };

    _db.Users.Add(user);
    await _db.SaveChangesAsync(ct);
    return user;
  }
}

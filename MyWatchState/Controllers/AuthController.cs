using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MyWatchState.Application.Dtos.Auth;
using MyWatchState.Infrastructure.Data;
using MyWatchState.Infrastructure.Services;

namespace MyWatchState.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase {
  private readonly KeycloakAdminService _keycloak;
  private readonly AppDbContext _db;

  public AuthController(KeycloakAdminService keycloak, AppDbContext db) {
    _keycloak = keycloak;
    _db = db;
  }

  /// <summary>Creates a new user account in Keycloak.</summary>
  [HttpPost("register")]
  [EnableRateLimiting("Auth")]
  public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct) {
    try {
      await _keycloak.RegisterAsync(request.Username, request.Email, request.Password, ct);
      return StatusCode(StatusCodes.Status201Created);
    } catch (InvalidOperationException ex) {
      return Conflict(new { error = ex.Message });
    } catch (HttpRequestException) {
      return StatusCode(StatusCodes.Status502BadGateway,
        new { error = "Authentication service is unavailable." });
    }
  }

  /// <summary>
  /// Sends a password-reset email. Always returns 204 to prevent email enumeration.
  /// </summary>
  [HttpPost("forgot-password")]
  [EnableRateLimiting("Auth")]
  public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct) {
    try {
      await _keycloak.ForgotPasswordAsync(request.Email, ct);
    } catch (HttpRequestException) {
      return StatusCode(StatusCodes.Status502BadGateway,
        new { error = "Authentication service is unavailable." });
    }
    return NoContent();
  }

  /// <summary>Changes the password for the currently authenticated user.</summary>
  [HttpPost("change-password")]
  [Authorize]
  [EnableRateLimiting("Auth")]
  public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct) {
    var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(sub, out var keycloakId))
      return Unauthorized();

    try {
      await _keycloak.ChangePasswordAsync(keycloakId, request.NewPassword, ct);
      return NoContent();
    } catch (HttpRequestException) {
      return StatusCode(StatusCodes.Status502BadGateway,
        new { error = "Authentication service is unavailable." });
    }
  }

  /// <summary>
  /// Permanently deletes the account. The caller must have just re-authenticated via
  /// prompt=login (auth_time claim must be within the last 2 minutes). Keycloak is
  /// deleted first to immediately invalidate all tokens, then local data is removed
  /// via cascade delete on the User row.
  /// </summary>
  [HttpDelete("account")]
  [Authorize]
  [EnableRateLimiting("Auth")]
  public async Task<IActionResult> DeleteAccount(CancellationToken ct) {
    var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(sub, out var keycloakId))
      return Unauthorized();

    // Require a fresh authentication (prompt=login on the extension side sets a recent auth_time)
    var authTimeClaim = User.FindFirst("auth_time")?.Value;
    if (!long.TryParse(authTimeClaim, out var authTimeUnix))
      return StatusCode(StatusCodes.Status403Forbidden,
        new { error = "Could not verify authentication time. Please re-authenticate." });

    var authAge = DateTimeOffset.UtcNow - DateTimeOffset.FromUnixTimeSeconds(authTimeUnix);
    if (authAge > TimeSpan.FromMinutes(2))
      return StatusCode(StatusCodes.Status403Forbidden,
        new { error = "Re-authentication required. Please sign in again to delete your account." });

    // Delete Keycloak account first — immediately invalidates all tokens
    try {
      await _keycloak.DeleteUserAsync(keycloakId, ct);
    } catch (HttpRequestException) {
      return StatusCode(StatusCodes.Status502BadGateway,
        new { error = "Authentication service is unavailable." });
    }

    // Cascade delete removes UserVideoProgress and WatchSessions automatically
    await _db.Users
      .Where(u => u.KeycloakId == keycloakId)
      .ExecuteDeleteAsync(ct);

    return NoContent();
  }
}

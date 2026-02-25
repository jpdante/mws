using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyWatchState.Application.Dtos.Auth;
using MyWatchState.Infrastructure.Services;

namespace MyWatchState.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase {
  private readonly KeycloakAdminService _keycloak;

  public AuthController(KeycloakAdminService keycloak) => _keycloak = keycloak;

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
}

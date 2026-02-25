using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using MyWatchState.Config;

namespace MyWatchState.Infrastructure.Services;

public class KeycloakAdminService {
  private readonly HttpClient _http;
  private readonly KeycloakOptions _options;

  public KeycloakAdminService(HttpClient http, IOptions<KeycloakOptions> options) {
    _http = http;
    _options = options.Value;
  }

  /// <summary>
  /// Acquires a short-lived admin token via client_credentials grant.
  /// Called per-request — token caching can be added later if needed.
  /// </summary>
  private async Task<string> GetAdminTokenAsync(CancellationToken ct) {
    var tokenEndpoint = _options.TokenEndpoint?.ToString()
      ?? throw new InvalidOperationException("Keycloak TokenEndpoint is not configured.");

    var response = await _http.PostAsync(tokenEndpoint, new FormUrlEncodedContent(
      new Dictionary<string, string> {
        ["grant_type"] = "client_credentials",
        ["client_id"] = _options.AdminClientId,
        ["client_secret"] = _options.AdminClientSecret,
      }), ct);

    response.EnsureSuccessStatusCode();

    var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
    return json.GetProperty("access_token").GetString()
      ?? throw new InvalidOperationException("No access_token in Keycloak response.");
  }

  public async Task RegisterAsync(string username, string email, string password, CancellationToken ct = default) {
    var token = await GetAdminTokenAsync(ct);
    var adminApi = _options.AdminApiEndpoint?.ToString()
      ?? throw new InvalidOperationException("Keycloak AdminApiEndpoint is not configured.");

    using var request = new HttpRequestMessage(HttpMethod.Post, $"{adminApi}/users");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    request.Content = JsonContent.Create(new {
      username,
      email,
      enabled = true,
      emailVerified = true,
      credentials = new[] {
        new { type = "password", value = password, temporary = false }
      }
    });

    var response = await _http.SendAsync(request, ct);

    if (response.StatusCode == HttpStatusCode.Conflict)
      throw new InvalidOperationException("A user with that username or email already exists.");

    response.EnsureSuccessStatusCode();
  }

  /// <summary>
  /// Finds a user by email and sends a password-reset email via Keycloak's execute-actions-email.
  /// Silently returns if no user is found (prevents email enumeration).
  /// </summary>
  public async Task ForgotPasswordAsync(string email, CancellationToken ct = default) {
    var token = await GetAdminTokenAsync(ct);
    var adminApi = _options.AdminApiEndpoint?.ToString()
      ?? throw new InvalidOperationException("Keycloak AdminApiEndpoint is not configured.");

    // Look up user by exact email match
    using var searchReq = new HttpRequestMessage(
      HttpMethod.Get, $"{adminApi}/users?email={Uri.EscapeDataString(email)}&exact=true");
    searchReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

    var searchRes = await _http.SendAsync(searchReq, ct);
    searchRes.EnsureSuccessStatusCode();

    var users = await searchRes.Content.ReadFromJsonAsync<JsonElement[]>(cancellationToken: ct) ?? [];
    if (users.Length == 0) return; // don't reveal whether the email is registered

    var userId = users[0].GetProperty("id").GetString();
    if (string.IsNullOrEmpty(userId)) return;

    // Trigger password-reset email
    using var resetReq = new HttpRequestMessage(
      HttpMethod.Put, $"{adminApi}/users/{userId}/execute-actions-email");
    resetReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    resetReq.Content = JsonContent.Create(new[] { "UPDATE_PASSWORD" });

    var resetRes = await _http.SendAsync(resetReq, ct);
    resetRes.EnsureSuccessStatusCode();
  }

  public async Task ChangePasswordAsync(Guid keycloakId, string newPassword, CancellationToken ct = default) {
    var token = await GetAdminTokenAsync(ct);
    var adminApi = _options.AdminApiEndpoint?.ToString()
      ?? throw new InvalidOperationException("Keycloak AdminApiEndpoint is not configured.");

    using var request = new HttpRequestMessage(
      HttpMethod.Put, $"{adminApi}/users/{keycloakId}/reset-password");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    request.Content = JsonContent.Create(new {
      type = "password",
      value = newPassword,
      temporary = false
    });

    var response = await _http.SendAsync(request, ct);
    response.EnsureSuccessStatusCode();
  }

  public async Task DeleteUserAsync(Guid keycloakId, CancellationToken ct = default) {
    var token = await GetAdminTokenAsync(ct);
    var adminApi = _options.AdminApiEndpoint?.ToString()
      ?? throw new InvalidOperationException("Keycloak AdminApiEndpoint is not configured.");

    using var request = new HttpRequestMessage(
      HttpMethod.Delete, $"{adminApi}/users/{keycloakId}");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

    var response = await _http.SendAsync(request, ct);
    response.EnsureSuccessStatusCode();
  }
}

namespace MyWatchState.Config;

/// <summary>
/// Holds all Keycloak-related configuration and provides prebuilt endpoint URIs.
/// </summary>
public class KeycloakOptions {
  private string? _url;
  private string? _realm;

  /// <summary>Base URL of the Keycloak server (e.g. http://localhost:8080).</summary>
  public string? Url {
    get => _url;
    set {
      _url = value;
      RebuildEndpoints();
    }
  }

  /// <summary>Realm name.</summary>
  public string? Realm {
    get => _realm;
    set {
      _realm = value;
      RebuildEndpoints();
    }
  }

  /// <summary>Client ID for the browser extension (public client, PKCE). Used for JWT audience validation.</summary>
  public string ClientId { get; set; } = null!;

  /// <summary>Client ID of the backend service account (confidential client) for Keycloak Admin API calls.</summary>
  public string AdminClientId { get; set; } = null!;

  /// <summary>Client secret of the backend service account.</summary>
  public string AdminClientSecret { get; set; } = null!;

  /// <summary>JWT Bearer authority — set automatically from Url + Realm.</summary>
  public string? Authority { get; private set; }

  public Uri? AuthorizationEndpoint { get; private set; }
  public Uri? TokenEndpoint { get; private set; }
  public Uri? UserInformationEndpoint { get; private set; }
  public Uri? LogoutEndpoint { get; private set; }
  /// <summary>Keycloak Admin REST API base URL for this realm.</summary>
  public Uri? AdminApiEndpoint { get; private set; }

  private void RebuildEndpoints() {
    if (_url is null || _realm is null)
      return;

    var baseUri = _url.EndsWith('/')
      ? new Uri(_url)
      : new Uri(_url + "/");

    Authority = $"{_url}/realms/{_realm}";
    AuthorizationEndpoint = new Uri(baseUri, $"realms/{_realm}/protocol/openid-connect/auth");
    TokenEndpoint = new Uri(baseUri, $"realms/{_realm}/protocol/openid-connect/token");
    UserInformationEndpoint = new Uri(baseUri, $"realms/{_realm}/protocol/openid-connect/userinfo");
    LogoutEndpoint = new Uri(baseUri, $"realms/{_realm}/protocol/openid-connect/logout");
    AdminApiEndpoint = new Uri(baseUri, $"admin/realms/{_realm}");
  }
}

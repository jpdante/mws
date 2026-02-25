using Microsoft.AspNetCore.WebUtilities;
using MyWatchState.Domain.Enums;

namespace MyWatchState.Helpers;

public record NormalizedUrl(string Url, VideoPlatform Platform, string? PlatformVideoId);

public static class UrlNormalizer {
  public static NormalizedUrl Normalize(string rawUrl) {
    if (!Uri.TryCreate(rawUrl.Trim(), UriKind.Absolute, out var uri))
      return new NormalizedUrl(rawUrl, VideoPlatform.Generic, null);

    var host = uri.Host.ToLowerInvariant();
    if (host.StartsWith("www.")) host = host[4..];

    return host switch {
      "youtube.com" or "m.youtube.com" => NormalizeYouTube(uri),
      "youtu.be"                        => NormalizeYouTuBe(uri),
      "vimeo.com"                       => NormalizeVimeo(uri),
      _                                 => NormalizeGeneric(uri),
    };
  }

  private static NormalizedUrl NormalizeYouTube(Uri uri) {
    var path = uri.AbsolutePath;

    // Standard watch URL: /watch?v=ID
    if (path.Equals("/watch", StringComparison.OrdinalIgnoreCase)) {
      var query = QueryHelpers.ParseQuery(uri.Query);
      if (query.TryGetValue("v", out var v) && v.ToString() is { Length: > 0 } videoId)
        return new NormalizedUrl(
          $"https://www.youtube.com/watch?v={videoId}",
          VideoPlatform.YouTube, videoId);
    }

    // Shorts: /shorts/ID
    if (path.StartsWith("/shorts/", StringComparison.OrdinalIgnoreCase)) {
      var videoId = path["/shorts/".Length..].Split('/')[0];
      if (!string.IsNullOrEmpty(videoId))
        return new NormalizedUrl(
          $"https://www.youtube.com/shorts/{videoId}",
          VideoPlatform.YouTube, videoId);
    }

    return new NormalizedUrl(
      $"https://www.youtube.com{uri.AbsolutePath}",
      VideoPlatform.YouTube, null);
  }

  private static NormalizedUrl NormalizeYouTuBe(Uri uri) {
    var videoId = uri.AbsolutePath.TrimStart('/').Split('?')[0];
    if (!string.IsNullOrEmpty(videoId))
      return new NormalizedUrl(
        $"https://www.youtube.com/watch?v={videoId}",
        VideoPlatform.YouTube, videoId);

    return NormalizeGeneric(uri);
  }

  private static NormalizedUrl NormalizeVimeo(Uri uri) {
    var parts = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length >= 1 && long.TryParse(parts[0], out _))
      return new NormalizedUrl(
        $"https://vimeo.com/{parts[0]}",
        VideoPlatform.Vimeo, parts[0]);

    return new NormalizedUrl(
      $"https://vimeo.com{uri.AbsolutePath}",
      VideoPlatform.Vimeo, null);
  }

  // Generic: strip query string and fragment, keep scheme + host + path
  private static NormalizedUrl NormalizeGeneric(Uri uri) =>
    new($"{uri.Scheme}://{uri.Host}{uri.AbsolutePath}", VideoPlatform.Generic, null);
}

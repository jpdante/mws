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
      "dailymotion.com"                 => NormalizeDailymotion(uri),
      "xhamster.com"                    => NormalizeXHamster(uri),
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

  private static NormalizedUrl NormalizeDailymotion(Uri uri) {
    // Video URLs: /video/{id} where id is alphanumeric (e.g. x9abc123)
    var parts = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length >= 2 && parts[0].Equals("video", StringComparison.OrdinalIgnoreCase)) {
      var videoId = parts[1];
      if (!string.IsNullOrEmpty(videoId))
        return new NormalizedUrl(
          $"https://www.dailymotion.com/video/{videoId}",
          VideoPlatform.Dailymotion, videoId);
    }

    return new NormalizedUrl(
      $"https://www.dailymotion.com{uri.AbsolutePath}",
      VideoPlatform.Dailymotion, null);
  }

  private static NormalizedUrl NormalizeXHamster(Uri uri) {
    // Video URLs: /videos/{slug} where slug ends with a numeric ID (e.g. some-title-12345678)
    var parts = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length >= 2 && parts[0].Equals("videos", StringComparison.OrdinalIgnoreCase)) {
      var slug = parts[1];
      // Extract trailing numeric ID from slug (e.g. "some-title-12345678" → "12345678")
      var lastDash = slug.LastIndexOf('-');
      if (lastDash >= 0) {
        var trailingPart = slug[(lastDash + 1)..];
        if (trailingPart.Length > 0)
          return new NormalizedUrl(
            $"https://xhamster.com/videos/{slug}",
            VideoPlatform.XHamster, trailingPart);
      }
    }

    return new NormalizedUrl(
      $"https://xhamster.com{uri.AbsolutePath}",
      VideoPlatform.XHamster, null);
  }

  // Generic: strip query string and fragment, keep scheme + host + path
  private static NormalizedUrl NormalizeGeneric(Uri uri) =>
    new($"{uri.Scheme}://{uri.Host}{uri.AbsolutePath}", VideoPlatform.Generic, null);
}

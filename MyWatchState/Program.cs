using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MyWatchState.Config;
using MyWatchState.Infrastructure.Data;
using MyWatchState.Infrastructure.Services;
using Serilog;

namespace MyWatchState;

public class Program {
  public static async Task Main(string[] args) {
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, lc) =>
      lc.ReadFrom.Configuration(ctx.Configuration));

    var keycloak = builder.Configuration
      .GetSection("Keycloak")
      .Get<KeycloakOptions>() ?? throw new InvalidOperationException("Keycloak configuration is required.");

    builder.Services.Configure<KeycloakOptions>(builder.Configuration.GetSection("Keycloak"));

    // ── Database ──────────────────────────────────────────────────────────────
    builder.Services.AddDbContext<AppDbContext>(options =>
      options
        .UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .UseSnakeCaseNamingConvention());

    // ── Authentication — JWT Bearer (tokens issued by Keycloak) ──────────────
    builder.Services
      .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
      .AddJwtBearer(options => {
        options.Authority = keycloak.Authority
          ?? throw new InvalidOperationException("Keycloak Url and Realm are required.");
        options.Audience = keycloak.ClientId;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
      });

    builder.Services.AddAuthorization();

    // ── CORS — allow all origins ──────────────────────────────────────────────
    builder.Services.AddCors(options => {
      options.AddPolicy("Extensions", policy => {
        policy
          .AllowAnyOrigin()
          .AllowAnyHeader()
          .AllowAnyMethod();
      });
    });

    // ── Rate limiting ─────────────────────────────────────────────────────────
    builder.Services.AddRateLimiter(options => {
      // Bulk progress: token bucket — generous for a 1req/min extension, tight against abuse
      options.AddPolicy("BulkProgress", context => {
        var key = context.User.FindFirst("sub")?.Value
          ?? context.Connection.RemoteIpAddress?.ToString()
          ?? "anonymous";
        return RateLimitPartition.GetTokenBucketLimiter(key, _ => new TokenBucketRateLimiterOptions {
          TokenLimit = 10,
          TokensPerPeriod = 2,
          ReplenishmentPeriod = TimeSpan.FromMinutes(1),
          QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
          QueueLimit = 0,
        });
      });

      // Query progress: sliding window — allows bursts on page navigation
      options.AddPolicy("QueryProgress", context => {
        var key = context.User.FindFirst("sub")?.Value
          ?? context.Connection.RemoteIpAddress?.ToString()
          ?? "anonymous";
        return RateLimitPartition.GetSlidingWindowLimiter(key, _ => new SlidingWindowRateLimiterOptions {
          PermitLimit = 60,
          Window = TimeSpan.FromMinutes(1),
          SegmentsPerWindow = 6,
          QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
          QueueLimit = 0,
        });
      });

      // Auth endpoints: fixed window per IP — brute-force protection
      options.AddPolicy("Auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
          context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
          _ => new FixedWindowRateLimiterOptions {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(15),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0,
          }));

      options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    });

    // ── Services ──────────────────────────────────────────────────────────────
    builder.Services.AddHttpClient<KeycloakAdminService>();

    builder.Services.AddControllers();
    builder.Services.AddOpenApi();

    // ── Pipeline ──────────────────────────────────────────────────────────────
    var app = builder.Build();

    if (app.Environment.IsDevelopment()) {
      app.MapOpenApi();
    }

    app.UseSerilogRequestLogging();
    app.UseCors("Extensions");
    app.UseHttpsRedirection();
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    using (var scope = app.Services.CreateScope()) {
      var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
      await db.Database.MigrateAsync();
    }

    app.Run();
  }
}

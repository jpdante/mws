# MyWatchState

Cross-website video watch-progress tracker. A browser extension automatically records where you left off on any video — think of it as a universal "continue watching" that works across YouTube (with Vimeo and generic sites planned).

## Features

- **Automatic progress tracking** — records position every ~2 seconds while watching
- **Thumbnail overlays** — YouTube thumbnails show a "watched" or "seen" ribbon and a progress bar
- **Offline queue** — progress is buffered locally and synced every 60 seconds; survives browser restarts
- **Monotonic progress** — progress only ever advances, never goes backwards
- **Multi-language UI** — popup and ribbons adapt to browser language (English, Portuguese, Spanish, Japanese, French)
- **Chrome + Firefox** — single shared TypeScript source builds for both browsers (MV3)

## Stack

| Layer | Technology |
|---|---|
| API | ASP.NET Core 10 / .NET 10 |
| Database | PostgreSQL 17 via EF Core 10 + Npgsql |
| Auth | Keycloak 26 — JWT Bearer (API), PKCE (extension) |
| Extensions | Chrome + Firefox MV3, TypeScript + esbuild |

## Project Structure

```
MyWatchState/
├── MyWatchState/          # ASP.NET Core API
│   ├── Application/Dtos/  # Request/response DTOs
│   ├── Config/            # Keycloak options
│   ├── Controllers/       # Auth + Progress endpoints
│   ├── Domain/            # Entities, enums
│   ├── Helpers/           # URL normalizer
│   └── Infrastructure/    # EF Core context, migrations, Keycloak admin service
├── extensions/
│   ├── shared/            # TypeScript source (popup, content scripts, SW, i18n)
│   ├── chrome/            # Chrome manifest + build output
│   └── firefox/           # Firefox manifest + build output
└── compose.yaml           # PostgreSQL + Keycloak for local dev
```

## API Endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/auth/register` | None |
| POST | `/api/v1/auth/change-password` | JWT |
| POST | `/api/v1/progress/bulk` | JWT |
| POST | `/api/v1/progress/query` | JWT |
| GET | `/api/v1/progress/history` | JWT |
| DELETE | `/api/v1/progress/{videoId}` | JWT |

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- EF Core CLI: `dotnet tool install --global dotnet-ef`

### Run locally

```bash
# 1. Start PostgreSQL + Keycloak
docker compose up postgres keycloak -d

# 2. Apply database migrations
dotnet ef database update --project MyWatchState

# 3. Start the API
dotnet run --project MyWatchState
```

- API: http://localhost:5000
- OpenAPI: http://localhost:5000/openapi/v1.json
- Keycloak admin: http://localhost:8080 (admin / admin)

### Build the extension

```bash
cd extensions
npm install
npm run build   # one-shot build → chrome/ and firefox/
npm run dev     # watch mode
```

Load the `extensions/chrome` or `extensions/firefox` directory as an unpacked extension in your browser.

### Full stack (Docker)

```bash
docker compose up --build
```

## Keycloak Setup

First-time configuration after `docker compose up`:

1. Open http://localhost:8080 and sign in as `admin` / `admin`
2. Create realm: **`mywatchstate`**
3. Create client **`mywatchstate-extension`** — Public, Standard Flow + PKCE, no secret
   - Add redirect URIs: `https://*.chromiumapp.org/*` and `https://*.extensions.allizom.org/*`
4. Create client **`mywatchstate-backend`** — Confidential, Client Credentials grant
   - Assign the `manage-users` role from `realm-management` to its service account
5. Copy the `mywatchstate-backend` client secret into `appsettings.json` → `Keycloak.AdminClientSecret`
6. Set **Realm Settings → Tokens → SSO Session Idle** to 30 days for long-lived refresh tokens

## Roadmap

- [ ] Keycloak realm export for reproducible dev setup
- [ ] Video search endpoint (`VideoController`)
- [ ] Extension icons
- [ ] Vimeo and generic `<video>` page support
- [ ] Options page (completion threshold, sync interval)

## License

MIT

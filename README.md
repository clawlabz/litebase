# LiteBase

**Lightweight, open-source Supabase alternative.**

PostgreSQL + Auth + REST API + Admin Dashboard in a single `docker compose up`.

> Supabase needs 13 containers and 2GB+ RAM. LiteBase needs 5 containers and ~340MB.

**Live Demo**: [litebase.clawlabz.xyz](https://litebase.clawlabz.xyz) (login: `demo` / `demo123`, read-only)

## Quick Start

```bash
git clone https://github.com/clawlabz/litebase
cd litebase
cp .env.example .env   # Edit passwords
docker compose up -d
```

Open **http://localhost:3000** and login with your `STUDIO_PASSWORD`.

## Why LiteBase?

| | Supabase (self-hosted) | LiteBase |
|---|---|---|
| Containers | 13 | 5 |
| RAM | 2GB+ | ~340MB |
| Setup | Complex config | `docker compose up` |
| SDK compatible | - | Yes (`@supabase/supabase-js` works) |
| Multi-project | Paid feature | Built-in |
| License | Apache 2.0 | MIT |

## What's Included

| Component | Purpose | Image |
|-----------|---------|-------|
| PostgreSQL 17 | Database | `postgres:17-alpine` |
| GoTrue | Auth (email, OAuth, MFA) | `supabase/gotrue` |
| PostgREST | Auto-generated REST API | `postgrest/postgrest` |
| PgBouncer | Connection pooling | `edoburu/pgbouncer` |
| LiteBase Studio | Admin dashboard | `litebase/studio` |

## Features

### LiteBase Studio

- **Project Management** — Create and manage multiple isolated projects
- **Table Editor** — Spreadsheet-like data browsing with inline editing, type-aware cell rendering
- **SQL Editor** — Monaco-powered editor with auto-complete, query history, saved queries
- **Auth Management** — User list, create/ban/delete users, email confirmation status
- **Auth Settings** — SMTP configuration, redirect URLs, signup toggles, JWT settings
- **Email Templates** — Visual HTML editor with live preview for verification/recovery emails
- **API Documentation** — Auto-generated REST docs with curl/JavaScript/Python examples
- **Database Settings** — Connection strings, table stats, extension management
- **Logs Viewer** — Auth/API/system logs with filtering, search, and auto-refresh

### Supabase SDK Compatible

Use the standard Supabase client SDK with zero code changes:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://localhost:3000',  // Your LiteBase URL
  'your-anon-key'           // From Studio dashboard
)

// Works exactly like Supabase
const { data } = await supabase.from('todos').select('*')
```

### Multi-Project

Each project gets its own:
- PostgreSQL database (isolated)
- GoTrue auth instance (independent users)
- PostgREST API instance
- JWT keys (anon + service_role)
- SMTP and email template config

## Configuration

Copy `.env.example` to `.env` and set:

```env
# Required
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-min-32-chars
STUDIO_PASSWORD=admin-panel-password

# Optional: SMTP for email verification
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
SMTP_FROM_NAME=MyApp
```

## Architecture

```
                    LiteBase Studio (:3000)
                    ┌──────────────────┐
                    │   Admin Panel    │
                    │   (Next.js)      │
                    └───────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼─────┐ ┌────▼────┐ ┌──────▼──────┐
        │ PostgreSQL │ │ GoTrue  │ │  PostgREST  │
        │    :5432   │ │  :9999  │ │    :3001    │
        └─────┬──────┘ └─────────┘ └─────────────┘
              │
        ┌─────▼──────┐
        │ PgBouncer  │
        │   :6432    │
        └────────────┘
```

## Requirements

- Docker & Docker Compose v2
- 1GB+ RAM (2GB recommended for multiple projects)
- Node.js 22+ (for development only)

## Development

```bash
cd studio
pnpm install
pnpm dev    # http://localhost:3000
```

## Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production setup with SSL, backups, and monitoring.

## Migrating from Supabase

See [docs/MIGRATION.md](docs/MIGRATION.md) for step-by-step migration guide.

## License

MIT - see [LICENSE](LICENSE)

## Credits

Built by [ClawLabz](https://clawlabz.xyz). Powered by open-source: PostgreSQL, GoTrue, PostgREST, PgBouncer.

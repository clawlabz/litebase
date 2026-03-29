# LiteBase - Technical Specification

> Lightweight, open-source Supabase alternative. Docker one-command deploy.

## Vision

LiteBase is a self-hosted Backend-as-a-Service that gives you PostgreSQL + Auth + REST API + Admin Dashboard in a single `docker compose up`. It's what Supabase would be if it were designed to run on a $15/month VPS instead of a managed cloud.

## Design Principles

1. **One command to start** — `docker compose up -d` and you have a full backend
2. **Minimal resources** — Runs on 1GB RAM, targets 2vCPU/4GB for production
3. **Supabase-compatible** — Existing Supabase client SDKs work with zero code changes
4. **Multi-project** — One instance manages multiple isolated projects (like Supabase dashboard)
5. **Batteries included** — Auth, REST API, Email, Admin UI out of the box
6. **No vendor lock-in** — Standard PostgreSQL, standard JWT, standard SMTP

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 LiteBase Studio                      │
│              (Next.js Admin Panel)                   │
│         :3000 — Project & Database Management        │
└────────────┬──────────┬──────────┬──────────────────┘
             │          │          │
   ┌─────────▼──┐  ┌────▼────┐  ┌─▼──────────┐
   │ PostgreSQL  │  │ GoTrue  │  │ PostgREST  │
   │   :5432     │  │  :9999  │  │   :3001    │
   │  Database   │  │  Auth   │  │  REST API  │
   └──────┬──────┘  └─────────┘  └────────────┘
          │
   ┌──────▼──────┐
   │  PgBouncer  │
   │   :6432     │
   │ Conn Pool   │
   └─────────────┘
```

### External Access (via Nginx or built-in proxy)

```
base.example.com
  ├── /                → LiteBase Studio (Admin Panel)
  ├── /rest/v1/*       → PostgREST (Auto REST API)
  ├── /auth/v1/*       → GoTrue (Auth)
  └── /studio/api/*    → Studio Backend API
```

## Components

| Component | Image | Purpose | RAM |
|-----------|-------|---------|-----|
| PostgreSQL 17 | `postgres:17-alpine` | Database | ~100MB |
| GoTrue | `supabase/gotrue` | Auth (email/OAuth/MFA) | ~50MB |
| PostgREST | `postgrest/postgrest` | Auto REST API | ~30MB |
| PgBouncer | `edoburu/pgbouncer` | Connection pooling | ~10MB |
| LiteBase Studio | `litebase/studio` | Admin Panel (Next.js) | ~150MB |
| **Total** | | | **~340MB** |

## Competitive Analysis

| Feature | LiteBase | Supabase | PocketBase | Appwrite |
|---------|----------|----------|------------|----------|
| Deploy | `docker compose up` | Complex (20+ services) | Single binary | Docker (10+ services) |
| RAM | ~340MB | ~2GB+ | ~30MB | ~2-4GB |
| DB | PostgreSQL | PostgreSQL | SQLite | MariaDB |
| Auth | GoTrue (Supabase-compatible) | GoTrue | Built-in | Built-in |
| REST API | PostgREST (auto) | PostgREST | Auto | Auto |
| Admin UI | LiteBase Studio | Supabase Studio | Built-in | Minimal |
| SDK Compatible | Supabase SDKs | Supabase SDKs | Own SDKs | Own SDKs |
| Multi-project | Yes | Yes (paid) | No | No |
| License | MIT | Apache 2.0 | MIT | BSL |

**Key differentiator**: Supabase SDK compatibility + lightweight footprint + multi-project support.

## Core Features (MVP)

### 1. Project Management

Each project is an isolated unit:
- 1 PostgreSQL database
- 1 GoTrue instance (independent auth)
- 1 PostgREST instance
- Shared PgBouncer (multi-database proxy)

```
litebase/
├── projects/
│   ├── my-app/          # Project config
│   │   ├── config.json  # DB name, ports, settings
│   │   └── templates/   # Email templates
│   └── another-app/
│       ├── config.json
│       └── templates/
└── docker-compose.yml
```

**Project operations:**
- Create project → `CREATE DATABASE` + spin up GoTrue + PostgREST containers
- Delete project → Stop containers + `DROP DATABASE` (with confirmation)
- Pause/Resume → Stop/start project containers (DB persists)

### 2. LiteBase Studio (Admin Panel)

#### 2.1 Dashboard
- Project overview: tables count, users count, API requests, storage size
- Quick links to common actions
- Service health status

#### 2.2 Table Editor
- Spreadsheet-like view of table data (inspired by Supabase)
- Create/edit/delete rows inline
- Column type visualization (text, number, boolean, jsonb, timestamp, uuid)
- Add/remove columns with type selector
- Foreign key relationship visualization
- Pagination, sorting, filtering
- CSV import/export

#### 2.3 SQL Editor
- Monaco editor (VS Code editor component) with SQL syntax highlighting
- Run queries and see results in table format
- Query history (saved per project)
- Saved queries / favorites
- Auto-complete for table/column names

#### 2.4 Auth Management
- User list with search/filter
- View/edit user details (email, metadata, confirmed status)
- Disable/enable users
- Delete users
- Create users manually
- View auth audit logs

#### 2.5 Auth Settings
- **Email templates**: Visual editor for confirmation/recovery/magic-link/invite emails
- **Redirect URLs**: Whitelist of allowed redirect URLs
- **SMTP config**: Host, port, user, password, sender name/email
- **Auth providers**: Enable/disable email, OAuth providers (GitHub, Google, etc.)
- **Security**: JWT expiry, password requirements, rate limits

#### 2.6 API Documentation
- Auto-generated from PostgREST schema
- Shows endpoints for each table: GET, POST, PATCH, DELETE
- Code examples (curl, JavaScript, Python)
- Try-it-out playground

#### 2.7 Database Settings
- Connection strings (direct, pooled, with SSL)
- Database size and table statistics
- Extensions management
- Roles and permissions overview

#### 2.8 Logs
- Auth events (signup, login, password reset)
- API request logs (path, status, duration)
- Error logs

### 3. Docker Compose Orchestration

```yaml
# docker-compose.yml (simplified)
services:
  postgres:
    image: postgres:17-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  pgbouncer:
    image: edoburu/pgbouncer
    depends_on: [postgres]

  studio:
    image: litebase/studio
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://...
      JWT_SECRET: ${JWT_SECRET}
      SMTP_HOST: ${SMTP_HOST:-}
    depends_on: [postgres]

  # Per-project services are managed dynamically by Studio
  # Studio creates/destroys GoTrue + PostgREST containers via Docker API
```

### 4. CLI

```bash
# Initialize
npx create-litebase my-backend
cd my-backend

# Start
docker compose up -d

# Open Studio
open http://localhost:3000

# Create project via CLI
litebase project create my-app

# Get connection info
litebase project info my-app
```

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Studio Frontend | Next.js 15 + Tailwind + shadcn/ui | Fast, modern, good DX |
| Studio Backend | Next.js API Routes | Keep it simple, one app |
| Editor | Monaco Editor | SQL editing (same as VS Code) |
| Table Component | TanStack Table | Performant virtual scrolling |
| Docker Management | dockerode (Node.js Docker API) | Create/manage project containers |
| Database | PostgreSQL 17 | Industry standard |
| Auth | GoTrue (Supabase fork) | Supabase SDK compatible |
| REST API | PostgREST | Battle-tested, auto-generated |
| Connection Pool | PgBouncer | Essential for serverless |

## Data Model (Studio)

Studio needs its own metadata stored in a `litebase` schema:

```sql
CREATE SCHEMA litebase;

-- Projects
CREATE TABLE litebase.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  database_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, deleting
  gotrue_port INTEGER,
  postgrest_port INTEGER,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Saved SQL queries
CREATE TABLE litebase.saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES litebase.projects(id),
  name TEXT NOT NULL,
  sql TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Query history
CREATE TABLE litebase.query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES litebase.projects(id),
  sql TEXT NOT NULL,
  duration_ms INTEGER,
  row_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Email templates per project
CREATE TABLE litebase.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES litebase.projects(id),
  template_type TEXT NOT NULL, -- confirmation, recovery, magic_link, invite
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, template_type)
);
```

## API Design (Studio Backend)

```
# Project management
POST   /studio/api/projects              Create project
GET    /studio/api/projects              List projects
GET    /studio/api/projects/:id          Get project details
PATCH  /studio/api/projects/:id          Update project settings
DELETE /studio/api/projects/:id          Delete project
POST   /studio/api/projects/:id/pause    Pause project
POST   /studio/api/projects/:id/resume   Resume project

# Table editor
GET    /studio/api/projects/:id/tables                List tables
GET    /studio/api/projects/:id/tables/:name           Get table schema
GET    /studio/api/projects/:id/tables/:name/rows      Get rows (paginated)
POST   /studio/api/projects/:id/tables/:name/rows      Insert row
PATCH  /studio/api/projects/:id/tables/:name/rows/:pk  Update row
DELETE /studio/api/projects/:id/tables/:name/rows/:pk  Delete row

# SQL editor
POST   /studio/api/projects/:id/sql                    Execute SQL
GET    /studio/api/projects/:id/sql/history             Query history
POST   /studio/api/projects/:id/sql/saved               Save query
GET    /studio/api/projects/:id/sql/saved               List saved queries

# Auth management
GET    /studio/api/projects/:id/auth/users              List users
GET    /studio/api/projects/:id/auth/users/:uid         Get user
PATCH  /studio/api/projects/:id/auth/users/:uid         Update user
DELETE /studio/api/projects/:id/auth/users/:uid         Delete user

# Auth settings
GET    /studio/api/projects/:id/auth/settings           Get auth settings
PATCH  /studio/api/projects/:id/auth/settings           Update auth settings
GET    /studio/api/projects/:id/auth/templates           Get email templates
PATCH  /studio/api/projects/:id/auth/templates/:type    Update email template

# Database info
GET    /studio/api/projects/:id/database/stats          DB size, table stats
GET    /studio/api/projects/:id/database/extensions      List extensions
GET    /studio/api/projects/:id/database/connections      Connection info
```

## Security

- Studio protected by admin password (set via env var)
- All project databases isolated (separate PostgreSQL databases)
- JWT secrets unique per project
- SMTP credentials stored encrypted in litebase schema
- Docker socket access required (Studio manages containers)
- Optional: IP whitelist for Studio access

## File Structure

```
litebase/
├── studio/                     # Next.js admin panel
│   ├── app/
│   │   ├── (auth)/             # Login page
│   │   ├── projects/           # Project list
│   │   ├── project/[id]/       # Project dashboard
│   │   │   ├── editor/         # Table editor
│   │   │   ├── sql/            # SQL editor
│   │   │   ├── auth/           # Auth management
│   │   │   │   ├── users/      # User list
│   │   │   │   └── settings/   # Auth config
│   │   │   ├── api/            # API docs
│   │   │   ├── database/       # DB settings
│   │   │   └── logs/           # Logs viewer
│   │   └── api/                # Studio backend API routes
│   │       └── studio/
│   ├── components/
│   │   ├── table-editor/       # Spreadsheet component
│   │   ├── sql-editor/         # Monaco SQL editor
│   │   ├── email-template/     # Template visual editor
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── docker.ts           # dockerode wrapper
│   │   ├── db.ts               # PG connection manager
│   │   └── auth.ts             # Studio auth
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml          # Main orchestration
├── .env.example                # Configuration template
├── scripts/
│   ├── init.sh                 # First-time setup
│   └── backup.sh               # Backup script
├── docs/
│   ├── TECHNICAL_SPEC.md       # This file
│   ├── IMPLEMENTATION_PLAN.md  # Phase-by-phase plan
│   └── DEPLOYMENT.md           # Deployment guide
├── LICENSE                     # MIT
└── README.md
```

## Environment Variables

```env
# Required
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-min-32-chars
STUDIO_PASSWORD=admin-panel-password

# Optional: SMTP for email verification
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@yourdomain.com
SMTP_FROM_NAME=YourApp

# Optional: Studio config
STUDIO_PORT=3000
DOMAIN=base.yourdomain.com
```

## User Experience Flow

### First-time setup
```
1. git clone https://github.com/clawlabz/litebase
2. cd litebase
3. cp .env.example .env    # Edit passwords
4. docker compose up -d
5. Open http://localhost:3000
6. Login with STUDIO_PASSWORD
7. Click "Create Project"
8. Name it, get connection strings
9. Use supabase-js SDK with the connection strings
```

### Creating a project via Studio
```
1. Click "New Project" in sidebar
2. Enter project name
3. Studio automatically:
   a. CREATE DATABASE project_name
   b. Spin up GoTrue container (unique port)
   c. Spin up PostgREST container (unique port)
   d. Configure PgBouncer entry
   e. Generate JWT keys
4. Dashboard shows connection strings + API keys
5. Copy-paste into your app's .env
```

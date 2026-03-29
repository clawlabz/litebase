# Migrating from Supabase to LiteBase

## Overview

LiteBase is Supabase SDK compatible. Migration requires:
1. Deploy LiteBase
2. Export your Supabase schema + data
3. Import into LiteBase
4. Update environment variables (just the URL and keys)

**Code changes: zero** — `@supabase/supabase-js` works with LiteBase out of the box.

## Step 1: Deploy LiteBase

Follow [DEPLOYMENT.md](DEPLOYMENT.md) to set up LiteBase on your server.

## Step 2: Create a Project

Open LiteBase Studio and create a new project. Note down:
- API URL
- Anon Key
- Service Role Key

## Step 3: Export from Supabase

### If Supabase is accessible:

```bash
# Export schema + data
pg_dump \
  --host db.xxxx.supabase.co \
  --port 5432 \
  --username postgres \
  --dbname postgres \
  --no-owner \
  --no-acl \
  --exclude-schema='auth|storage|realtime|_realtime|supabase_*|_analytics|_supavisor' \
  > supabase_export.sql
```

### If Supabase is paused/inaccessible:

Use your local migration files:

```bash
# If you have Supabase migrations in supabase/migrations/
ls supabase/migrations/*.sql
```

## Step 4: Import into LiteBase

### Option A: Via SQL Editor

1. Open LiteBase Studio → your project → SQL Editor
2. Paste and run each migration file

### Option B: Via psql

```bash
psql "postgresql://litebase:PASSWORD@your-server:6432/your-project" \
  -f supabase_export.sql
```

## Step 5: Update Environment Variables

Replace your Supabase credentials with LiteBase ones:

```env
# Before (Supabase)
SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...old-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...old-service-key

# After (LiteBase)
SUPABASE_URL=https://base.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://base.yourdomain.com
SUPABASE_ANON_KEY=eyJ...new-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...new-service-key
```

**That's it.** Your application code doesn't need any changes.

## Step 6: Verify

1. Test auth: sign up, login, email verification
2. Test database: CRUD operations on your tables
3. Test API: verify PostgREST endpoints return correct data

## Notes

### What LiteBase doesn't have (yet)

- **Supabase Storage** — Use Cloudflare R2 or S3 directly
- **Realtime subscriptions** — WebSocket table changes (planned)
- **Edge Functions** — Use Vercel/Cloudflare Workers instead
- **Vault** — Store secrets in environment variables

### Auth migration

User passwords are hashed with bcrypt in both Supabase and LiteBase (GoTrue). If you can export the `auth.users` table, passwords will work without reset.

### RLS Policies

Row Level Security policies that use `auth.uid()` and `auth.role()` will work — LiteBase creates these functions in the auth schema.

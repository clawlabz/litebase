/**
 * GoTrue database initialization SQL.
 *
 * Creates the auth schema, core tables, helper functions, and database roles
 * that GoTrue expects. This is a simplified but functional version that covers
 * the tables GoTrue v2 reads/writes at startup.
 */
export const GOTRUE_INIT_SQL = `
-- ============================================================
-- Roles (idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT CREATEROLE;
  END IF;
END
$$;

-- Grant roles to postgres so it can SET ROLE
GRANT anon TO postgres;
GRANT authenticated TO postgres;
GRANT service_role TO postgres;
GRANT supabase_auth_admin TO postgres;

-- ============================================================
-- Schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- ============================================================
-- auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.users (
  instance_id           uuid,
  id                    uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  aud                   varchar(255),
  role                  varchar(255),
  email                 varchar(255) UNIQUE,
  encrypted_password    varchar(255),
  email_confirmed_at    timestamptz,
  invited_at            timestamptz,
  confirmation_token    varchar(255),
  confirmation_sent_at  timestamptz,
  recovery_token        varchar(255),
  recovery_sent_at      timestamptz,
  email_change_token_new varchar(255),
  email_change          varchar(255),
  email_change_sent_at  timestamptz,
  last_sign_in_at       timestamptz,
  raw_app_meta_data     jsonb,
  raw_user_meta_data    jsonb,
  is_super_admin        boolean,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  phone                 text UNIQUE DEFAULT NULL,
  phone_confirmed_at    timestamptz,
  phone_change          text DEFAULT '',
  phone_change_token    varchar(255) DEFAULT '',
  phone_change_sent_at  timestamptz,
  confirmed_at          timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
  email_change_token_current varchar(255) DEFAULT '',
  email_change_confirm_status smallint DEFAULT 0,
  banned_until          timestamptz,
  reauthentication_token varchar(255) DEFAULT '',
  reauthentication_sent_at timestamptz,
  is_sso_user           boolean NOT NULL DEFAULT false,
  deleted_at            timestamptz,
  is_anonymous          boolean NOT NULL DEFAULT false
);

-- ============================================================
-- auth.refresh_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  instance_id uuid,
  id          bigserial PRIMARY KEY,
  token       varchar(255),
  user_id     varchar(255),
  revoked     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  parent      varchar(255),
  session_id  uuid
);
CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_idx ON auth.refresh_tokens(instance_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens(instance_id, user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_unique ON auth.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS refresh_tokens_parent_idx ON auth.refresh_tokens(parent);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens(session_id, revoked);

-- ============================================================
-- auth.sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.sessions (
  id           uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  factor_id    uuid,
  aal          varchar(255),
  not_after    timestamptz,
  refreshed_at timestamptz,
  user_agent   text,
  ip           inet,
  tag          text
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_not_after_idx ON auth.sessions(not_after DESC);

-- ============================================================
-- auth.identities
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.identities (
  provider_id     text NOT NULL,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_data   jsonb NOT NULL,
  provider        text NOT NULL,
  last_sign_in_at timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  email           text GENERATED ALWAYS AS (lower(identity_data->>'email'::text)) STORED,
  id              uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY
);
CREATE UNIQUE INDEX IF NOT EXISTS identities_provider_id_provider_unique ON auth.identities(provider_id, provider);
CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities(user_id);
CREATE INDEX IF NOT EXISTS identities_email_idx ON auth.identities(email text_pattern_ops);

-- ============================================================
-- auth.mfa_factors
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.mfa_factors (
  id            uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friendly_name text,
  factor_type   varchar(255) NOT NULL,
  status        varchar(255) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  secret        text,
  phone         text,
  last_challenged_at timestamptz,
  web_authn_credential jsonb,
  web_authn_aaguid uuid
);
CREATE INDEX IF NOT EXISTS mfa_factors_user_id_idx ON auth.mfa_factors(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_phone_factor_per_user ON auth.mfa_factors(user_id, phone);

-- ============================================================
-- auth.mfa_challenges
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
  id          uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  factor_id   uuid NOT NULL REFERENCES auth.mfa_factors(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  ip_address  inet NOT NULL,
  otp_code    text,
  web_authn_session_data jsonb
);
CREATE INDEX IF NOT EXISTS mfa_challenge_created_at_idx ON auth.mfa_challenges(created_at DESC);

-- ============================================================
-- auth.schema_migrations (GoTrue tracks its own migrations here)
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
  version varchar(14) NOT NULL PRIMARY KEY
);

-- Seed the initial migration version so GoTrue thinks it's up to date
INSERT INTO auth.schema_migrations (version)
VALUES ('20210710035447'), ('20210722035447'), ('20210730035447'),
       ('20210909172000'), ('20210927181326'), ('20211122151130'),
       ('20211124214934'), ('20211202183645'), ('20220114185221'),
       ('20220114185340'), ('20220224000811'), ('20220323170000'),
       ('20220429102000'), ('20220531120530'), ('20220614074223'),
       ('20221003041349'), ('20221003041400'), ('20221011041400'),
       ('20221020193600'), ('20221021073300'), ('20221021082433'),
       ('20221027105023'), ('20221114143122'), ('20221114143410'),
       ('20221125140132'), ('20221208132122'), ('20221215195500'),
       ('20221215195800'), ('20221215195900'), ('20230116124310'),
       ('20230116124412'), ('20230131181311'), ('20230322519590'),
       ('20230402418590'), ('20230411005111'), ('20230508135423'),
       ('20230523124323'), ('20230818113222'), ('20230914180801'),
       ('20231027141322'), ('20231114161723'), ('20231117164230'),
       ('20240115144230'), ('20240214120130'), ('20240306115329'),
       ('20240427152123'), ('20240612123726'), ('20240729123726'),
       ('20240806073726'), ('20241009103726')
ON CONFLICT DO NOTHING;

-- ============================================================
-- auth.flow_state (GoTrue PKCE flows)
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.flow_state (
  id                    uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid,
  auth_code             text NOT NULL,
  code_challenge_method varchar(255) NOT NULL,
  code_challenge        text NOT NULL,
  provider_type         text NOT NULL,
  provider_access_token text,
  provider_refresh_token text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  authentication_method text NOT NULL,
  auth_code_issued_at   timestamptz
);
CREATE INDEX IF NOT EXISTS flow_state_created_at_idx ON auth.flow_state(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_code ON auth.flow_state(auth_code);

-- ============================================================
-- auth.sso_providers / saml
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.sso_providers (
  id          uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.sso_domains (
  id              uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  sso_provider_id uuid NOT NULL REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
  domain          text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sso_domains_sso_provider_id_idx ON auth.sso_domains(sso_provider_id);

CREATE TABLE IF NOT EXISTS auth.saml_providers (
  id                uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  sso_provider_id   uuid NOT NULL REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
  entity_id         text NOT NULL UNIQUE,
  metadata_xml      text NOT NULL,
  metadata_url      text,
  attribute_mapping jsonb,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  name_id_format    text
);
CREATE INDEX IF NOT EXISTS saml_providers_sso_provider_id_idx ON auth.saml_providers(sso_provider_id);

CREATE TABLE IF NOT EXISTS auth.saml_relay_states (
  id                uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  sso_provider_id   uuid NOT NULL REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
  request_id        text NOT NULL,
  for_email         text,
  redirect_to       text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  flow_state_id     uuid REFERENCES auth.flow_state(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states(sso_provider_id);
CREATE INDEX IF NOT EXISTS saml_relay_states_created_at_idx ON auth.saml_relay_states(created_at DESC);
CREATE INDEX IF NOT EXISTS saml_relay_states_for_email_idx ON auth.saml_relay_states(for_email);

-- ============================================================
-- auth.one_time_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.one_time_tokens (
  id         uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_type varchar(255) NOT NULL,
  token_hash text NOT NULL,
  relates_to text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash(token_hash);
CREATE INDEX IF NOT EXISTS one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash(relates_to);
CREATE INDEX IF NOT EXISTS one_time_tokens_user_id_token_type_idx ON auth.one_time_tokens(user_id, token_type);

-- ============================================================
-- Helper functions: auth.uid() and auth.role()
-- ============================================================
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claim.sub', true),
    ''
  )::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claim.role', true),
    ''
  )::text
$$;

CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claim.email', true),
    ''
  )::text
$$;

-- ============================================================
-- Grants
-- ============================================================
-- auth schema owned by supabase_auth_admin, but allow service_role full access
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_admin;

-- service_role can read/write auth tables (needed for admin APIs)
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;

-- public schema: anon + authenticated can SELECT; service_role can do everything
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO anon, authenticated, service_role;

-- Enable RLS by default hint (users will toggle per-table)
-- No tables in public yet, so nothing to enable on.
`;

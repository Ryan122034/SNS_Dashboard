create table if not exists platform_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_name text not null,
  external_account_id text,
  handle text,
  source_url text not null,
  content_types text[] not null default '{}',
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references platform_accounts(id) on delete cascade,
  platform text not null,
  external_content_id text not null,
  content_type text not null,
  title text not null,
  permalink text not null,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_content_id)
);

create table if not exists content_snapshots (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references contents(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  saves bigint not null default 0
);

create index if not exists idx_contents_account_id on contents(account_id);
create index if not exists idx_contents_published_at on contents(published_at desc);
create index if not exists idx_content_snapshots_content_id on content_snapshots(content_id);
create index if not exists idx_content_snapshots_captured_at on content_snapshots(captured_at desc);

create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_id uuid references platform_accounts(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  message text
);

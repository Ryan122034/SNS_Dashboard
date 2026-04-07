create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists managed_channels (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('youtube', 'tiktok', 'x', 'instagram', 'facebook')),
  alias text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, url)
);

create table if not exists post_status_records (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references managed_channels(id) on delete cascade,
  date date not null,
  url text not null,
  title text not null,
  current_views bigint not null default 0,
  daily_view_delta bigint not null default 0,
  current_likes bigint not null default 0,
  daily_like_delta bigint not null default 0,
  current_comments bigint not null default 0,
  daily_comment_delta bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists post_status_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references managed_channels(id) on delete cascade,
  captured_date date not null,
  url text not null,
  title text not null,
  current_views bigint not null default 0,
  current_likes bigint not null default 0,
  current_comments bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, url, captured_date)
);

create table if not exists work_history_records (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references managed_channels(id) on delete cascade,
  date date not null,
  content_type text not null check (content_type in ('Channel', 'Videos', 'Shorts', 'Posts')),
  task_status text not null check (task_status in ('Completed', 'Processing', 'Pending', 'Failed')),
  url text not null,
  campaign_id text not null check (campaign_id ~ '^[0-9]{4}$'),
  quantity text not null,
  cost_usd text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists channel_auth_tokens (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references managed_channels(id) on delete cascade,
  platform text not null check (platform in ('tiktok')),
  external_user_id text,
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id)
);

create index if not exists idx_managed_channels_platform on managed_channels(platform);
create index if not exists idx_post_status_records_channel_id on post_status_records(channel_id);
create index if not exists idx_post_status_records_date on post_status_records(date desc);
create index if not exists idx_post_status_daily_snapshots_channel_id on post_status_daily_snapshots(channel_id);
create index if not exists idx_post_status_daily_snapshots_captured_date on post_status_daily_snapshots(captured_date desc);
create index if not exists idx_work_history_records_channel_id on work_history_records(channel_id);
create index if not exists idx_work_history_records_date on work_history_records(date desc);
create index if not exists idx_channel_auth_tokens_channel_id on channel_auth_tokens(channel_id);
create index if not exists idx_channel_auth_tokens_platform on channel_auth_tokens(platform);

drop trigger if exists managed_channels_set_updated_at on managed_channels;
create trigger managed_channels_set_updated_at
before update on managed_channels
for each row execute function set_updated_at();

drop trigger if exists post_status_records_set_updated_at on post_status_records;
create trigger post_status_records_set_updated_at
before update on post_status_records
for each row execute function set_updated_at();

drop trigger if exists post_status_daily_snapshots_set_updated_at on post_status_daily_snapshots;
create trigger post_status_daily_snapshots_set_updated_at
before update on post_status_daily_snapshots
for each row execute function set_updated_at();

drop trigger if exists work_history_records_set_updated_at on work_history_records;
create trigger work_history_records_set_updated_at
before update on work_history_records
for each row execute function set_updated_at();

drop trigger if exists channel_auth_tokens_set_updated_at on channel_auth_tokens;
create trigger channel_auth_tokens_set_updated_at
before update on channel_auth_tokens
for each row execute function set_updated_at();

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

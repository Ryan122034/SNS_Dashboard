# SNS Dashboard

Vercel-ready internal dashboard scaffold for tracking official channel performance across YouTube, TikTok, Instagram, Facebook, and X.

## What is included

- Next.js App Router setup for Vercel
- Internal dashboard landing page grouped by managed platform channels
- Supabase-backed managed channels and work history API routes
- Health check API route at `/api/health`
- Protected cron scaffold at `/api/cron/sync`
- Fallback seed data when Supabase is not configured

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Run [`db/schema.sql`](./db/schema.sql) in the Supabase SQL editor.
3. Add environment variables in `.env.local` and Vercel:

```text
CRON_SECRET=
DATABASE_URL=
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
YOUTUBE_API_KEY=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
```

4. Restart local development with `npm run dev`.
5. On the first successful server load, example dashboard rows are seeded automatically if the Supabase tables are empty.

## Recommended next steps

1. Add YouTube official API client first.
2. Write post-status snapshots into `post_status_records`.
3. Add authentication before opening the dashboard to more users.

## Git remote

- `origin`: `https://github.com/Ryan122034/SNS_Dashboard.git`

# SNS Dashboard

Vercel-ready internal dashboard scaffold for tracking official channel performance across YouTube, TikTok, Instagram, Facebook, and X.

## What is included

- Next.js App Router setup for Vercel
- Internal dashboard landing page with mock channel and post metrics
- Health check API route at `/api/health`
- Protected cron scaffold at `/api/cron/sync`
- Typed mock data layer for channels, posts, and sync readiness

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Recommended next steps

1. Connect Supabase or Postgres for snapshot storage.
2. Add YouTube official API client first.
3. Replace mock data in `src/lib/dashboard-data.ts` with live fetchers.
4. Add Vercel environment variables:

```text
CRON_SECRET=
DATABASE_URL=
YOUTUBE_API_KEY=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
```

## Git remotes

- `origin`: `https://github.com/walter435/SNS_Dashboard.git`
- `upstream`: `https://github.com/Ryan122034/SNS_Dashboard.git`

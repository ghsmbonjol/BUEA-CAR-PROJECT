# Vercel Daily Keep-Awake Update

This update adds a once-daily Vercel Cron job plus a System Status indicator in **Admin Settings**.

## 1. Update Supabase first

Open **Supabase > SQL Editor > New query** and run the complete contents of:

`supabase/add-vercel-cron-keep-alive.sql`

This adds the health-check fields used by the Admin Settings indicator.

## 2. Upload/replace files in GitHub

Upload these paths from this update package into the same paths in your existing repository:

- `app/api/keep-alive/route.js` (new)
- `app/page.js` (replace)
- `app/globals.css` (replace)
- `vercel.json` (new, or merge the `crons` section if you already have one)

The `.env.example` file is reference only; do not commit a real secret into it.

## 3. Add CRON_SECRET in Vercel

Open **Vercel > your project > Settings > Environment Variables** and add:

`CRON_SECRET`

Use a long random value of at least 16 characters. Keep it server-side only. Do not name it `NEXT_PUBLIC_CRON_SECRET`.

Example format only (make your own value):

`buea-cron-KEEP-PRIVATE-2026-very-long`

Apply it to **Production** (you may also select Preview/Development, but Vercel Cron runs on production deployments).

## 4. Redeploy

Commit the GitHub changes. Vercel should redeploy automatically. If not, redeploy the latest production deployment manually.

## 5. Confirm the cron exists

In Vercel open **Project > Settings > Cron Jobs**. You should see:

- Path: `/api/keep-alive`
- Schedule: `0 5 * * *`

This is once per day at 05:00 UTC. In Cameroon that is 06:00 WAT. On Vercel Hobby, the request may arrive at any point within the 06:00–06:59 WAT hour.

## 6. Check the admin indicator

After the first successful cron run, sign into the portal and open **Admin Settings**. The System Status panel should show:

- Database: Supabase responding
- Status: Online
- Last automatic check: date/time in WAT
- Keep-awake job: Vercel Cron → Supabase

The endpoint performs three lightweight database reads and records the health-check timestamp. It does not add or change members, vows, contributions, expenses, or financial amounts.

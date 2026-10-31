# Body Clock Kit

Jet-lag reminders built from your real flights. Next.js 14 (App Router), no database, no env vars needed for this version.

## What works now
- Today and The plan tabs, empty states, animated route and plane, ticket, stacked Next up deck, tap to check (orange, then dims gray after 3 s, undo chip)
- Kit and Trip screens, saved in the browser (localStorage)
- Light, dark and auto theme
- "Add to calendar (.ics) with alerts" on The plan, the reliable way to get notifications today
- Installable on a phone home screen (manifest and service worker)
- Schedule engine in `lib/engine.js` with tests: `npm test`

## Deploy to Vercel
1. Put this folder in a GitHub repo and push.
2. In Vercel: Add New > Project > import the repo. Framework is detected as Next.js. No environment variables. Deploy.
3. Open the URL on your phone, Share > Add to Home Screen.

Local: `npm install && npm run dev`.

## Not built yet
- Login (Resend email codes), shared data between two people, and server-sent push notifications. Check marks and the trip live in each device's browser for now.
- Plan for those: Postgres, Resend 6-digit codes with a two-email allowlist, web push with VAPID keys and a per-minute scheduler (Vercel Cron per-minute needs a Pro plan; otherwise QStash or Inngest).

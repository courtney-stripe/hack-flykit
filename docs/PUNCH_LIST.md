PUNCH LIST (Courtney)

TODAY (Sat Oct 31)
[ ] Unzip body-clock-kit.zip, open the folder in Cursor
[ ] Paste CURSOR_PROMPT.md into Cursor, answer its repo-name question
[ ] Get the Vercel URL, open it on your phone
[ ] Share > Add to Home Screen on both phones
[ ] Check the Trip tab: Denver > Amsterdam, Nov 1 3:40 PM, 12.25 h, 20 nights, return 9:10 AM from Geneva, 14 h
[ ] Plan tab > "Add to calendar (.ics) with alerts", open the file on both phones, add all events
[ ] Verify the first alert time on the calendar: Vitamin C Nov 1, 1:40 PM Denver
[ ] Pack the kit per KIT.md, vacuum seal and label OUT / BACK / DAILY
[ ] Screenshot the Plan tab as an offline backup

LATER (after the trip, only if you want it)
[ ] Create a Neon database from Vercel Storage
[ ] Create a Resend account, copy the API key
[ ] Generate VAPID keys (npx web-push generate-vapid-keys)
[ ] Pick a free scheduler (Upstash QStash or cron-job.org) to call the app every minute
[ ] Copy .env.example to .env.local, fill it in, and add the same names to Vercel
[ ] Ask for phase 2: invite login, shared trip, push notifications

KNOWN LIMITS
- Check marks live on each phone only, for now
- Vercel's free plan cannot run per-minute jobs, hence the separate scheduler
- Push on iPhone needs iOS 16.4+ and the Home Screen app

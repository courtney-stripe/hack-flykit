# Body Clock Kit: product spec (phase 2 reference)

**Status:** phase 1 is built and lives in this repo (`app/`, `lib/`). It has Today, Plan, Kit and Trip tabs, empty states, motion, theme, .ics export and local-only storage. This document is the reference for phase 2 (login, shared data, push) and for any change to the design. `all-screens.png` shows the shipped screens; `reference/` holds the older mock HTML.


A personal jet-lag reminder app. Two users (owner + one member) share one trip. It turns real flight times into a timed schedule of light, caffeine, sleep, supplement and hydration steps, and sends push reminders.

Reference visuals: export the canvas boards as PNG (Home light, Home dark, My kit light, My kit dark) and put them in `/design`. Orange is the key color. Ignore the blue and purple exploration boards.

## Stack
- Next.js (App Router, TypeScript) on Vercel
- Tailwind or CSS modules, with `tokens.css` as the source of truth. Fonts: Geist and Geist Mono (`next/font`)
- Postgres (Neon or Vercel Postgres) with Drizzle or Prisma
- Web Push (service worker, VAPID, `web-push`) and an ICS export
- Resend email codes for login (see Auth)
- Vitest for `schedule-engine` tests (the 5 included tests port as-is)

## Reference code
`/reference` holds the real HTML and CSS from the mocks (`*.reference.html`, a design-canvas format: read the `<style>` blocks and markup, ignore the `x-dc`, `sc-for`, `sc-if` and `DCLogic` wrappers) and `motion-preview.html`, a standalone page that runs the page-load and tap motion. Match the spacing, radii, sizes and timing from these rather than eyeballing the PNGs.

## Files in this package
- `schedule-engine.js` is a pure, tested engine. Port to `lib/schedule-engine.ts` with types. Do not change the rules without updating tests.
- `schedule-engine.test.js` has 5 passing tests.
- `tokens.css` has light, dark and system-default tokens.
- `CURSOR_PROMPT.md` is the paste-in prompt.

## Screens
1. **Today**: route hero (animated arc and plane), ticket, "Next up" deck, category legend, schedule grouped by phase.
2. **My kit**: toggles, dose text and quantities per item, with a category dot on each row.
3. **Trip setup**: not yet designed. Needs from/to zone, departure datetime, flight hours, nights away, return datetime and hours, usual bedtime. Defaults are in the engine tests.
4. **Login**: not yet designed. Email, then 6-digit code.
5. **Notifications onboarding**: not yet designed. Permission ask and the iOS "Add to Home Screen" step.
6. **Settings**: not yet designed. Theme (system, light, dark), quiet hours, member management.

## Components
- **Ticket**: notched edges, perforation, From/To fields, stub with shift (+8 h), direction, both local clocks and a 5-bar adjustment meter.
- **Next up deck**: iOS-style vertical stack. Ranks:
  - rank 0: `translateY(0) scale(1)`
  - rank 1: `translateY(11px) scale(.95) brightness(.9)`
  - rank 2: `translateY(21px) scale(.9) brightness(.8)`
  - Tapping the top card marks it done. A card is neutral, with a category dot only. There is no colored tab or fill.
- **Undo chip** appears after a tap and lasts 5 s.
- **Schedule row**: dot, time (Geist Mono), title, detail, checkbox.
- **Checked row behavior**: on tap the checkbox fills orange (`done fresh`). After 3000 ms it settles to `done settled`: row opacity .5, checkbox gray, dot gray. Unchecking restores it instantly.
- **Categories** (dot only): Sleep violet, Supplement yellow, Fluids blue, Light rose, Comfort sage.

## Motion
Everything respects `prefers-reduced-motion: reduce`. In that mode, skip all animation and render end states immediately.

**Page load (first paint, hero route flight about 3.4 s; everything else settles by about 1 s):**
| Element | Motion | Timing |
|---|---|---|
| Hero | Fade in | 0 to 200 ms |
| Route trail | Draws along the dotted route. SVG `pathLength="100"`, `stroke-dashoffset` 100 to 28 | 200 to 3400 ms, `cubic-bezier(.45,.05,.3,1)` |
| Plane | CSS `offset-path` along the same path, `offset-rotate: auto 90deg` (the icon's nose points up, so it needs the 90° offset; use `auto 0deg` if your icon points right), `offset-distance` 0 to 72% | Same timing as the trail, so the two stay locked together |
| Ticket | Rise 10 px and fade in | Starts 120 ms, 350 ms duration |
| Next up deck | Cards enter bottom to top: rank 2, rank 1, then rank 0, each from `translateY(+16px)` and opacity 0 | 60 ms stagger, 300 ms each, ease-out |
| Schedule groups | Fade and rise 6 px | 40 ms stagger, 250 ms each, capped at the first 6 rows. Rows below the fold render static |
| Clock numbers | No count-up. Static | n/a |

Plane path: `M14 100 Q165 -20 316 100`. Do not center the plane with margins or a transform: `offset-path` already centers the element via `offset-anchor: 50% 50%`, and extra offsets push it off the line. Trail and plane must use the same path.

**Interactions:**
- Card tap: the top card slides `translateY(-22px)` and fades out in 220 ms. The deck behind it promotes one rank over 260 ms with a gentle ease (`cubic-bezier(.2,.8,.2,1)`). The matching schedule row flips to `done fresh` at the same moment.
- Checkbox: check mark draws in 160 ms. The orange to gray settle after 3 s is a 400 ms transition on opacity, color and background.
- Undo chip: slides up 8 px and fades in 180 ms, and fades out on timeout.
- Theme switch: 200 ms cross-fade of background and text colors only. No layout motion.
- Press states: buttons and cards scale to .98 over 80 ms.
- Sheet or modal (settings, trip setup): slide up 280 ms with a backdrop fade.
- Keep all transitions on `transform` and `opacity` where possible. No animation loops other than the plane, and the plane runs once per load.

## Engine rules (summary, see tests)
- Shift = destination UTC offset minus origin offset at the moment of landing. DST must use real zone rules (`Intl`).
- Adjustment days = `abs < 2 ? 0 : min(5, max(2, ceil(abs / (east ? 1 : 1.5))))`.
- Eastbound: morning light 08:00 (10:00 for the first two days when the shift is over 8 h). Westbound: afternoon light 16:30.
- Caffeine cutoff = bed minus 8 h. Amber glasses = bed minus 2 h.
- Melatonin and 2 magnesium at bed minus 30 min for the first 3 nights only.
- Plane-sleep step: eastbound only, flight of 6 h or more, and the destination-clock hour at departure plus 90 min is between 22 and 5.
- Flight day: vitamin C at dep minus 120, fish oil at dep minus 100, compression socks at dep minus 75, water and electrolytes at dep minus 60. In flight: second vitamin C at land minus 180, fish oil at land minus 175, pre-landing reset at land minus 60.
- Known limits: it treats the trip as one journey and does not model layovers leg by leg. It assumes a fixed bedtime. Light rules are simple.

## Data model
- `users(id, email, role: owner|member)`
- `trips(id, owner_id, config jsonb, kit jsonb, created_at)`
- `trip_members(trip_id, user_id)`
- `checks(trip_id, user_id, event_key, done_at)`: checks are per user, so each person ticks their own.
- `push_subscriptions(id, user_id, endpoint, keys, ua)`
- `sent_notifications(trip_id, user_id, event_key, sent_at)` for idempotency

Events are computed from `config` and `kit` on demand. They are not stored. `event_key` = kind + ISO time.

## Notifications
- Service worker plus VAPID. On iOS, web push only works from a Home Screen PWA (iOS 16.4 or later). Build the install prompt and test on a real iPhone.
- Scheduler: a cron (Vercel Cron on a 1-minute plan, or QStash or Inngest) finds events due in the next minute, sends one push per subscription, and records it in `sent_notifications`.
- Respect quiet hours, but never silence flight-day steps.
- Also offer "Download .ics" with a VALARM on each event as an offline fallback.
- Optional Google Calendar sync via OAuth. Skip for v1.

## Auth (phase 2, no domain needed)
- Two members: an owner and one other person. Allowlist both addresses in `ALLOWED_EMAILS`, with a name for each.
- Login screen asks for an email. If it is on the allowlist, generate a 6-digit code and send it with Resend from the Resend onboarding sender to the OWNER's address only (`OWNER_EMAIL`), never to the member's address. The subject and body name who is signing in, for example "Member's code: 123456". The owner reads it out or texts it to them.
- Not on the allowlist: show the same "check your email" message and send nothing.
- Store only a hash of the code, expire in 10 minutes, allow 5 attempts, rate-limit sends per email and per IP, then set an httpOnly, secure, same-site session cookie.
- Env vars: `RESEND_API_KEY`, `OWNER_EMAIL`, `ALLOWED_EMAILS` (`email:Name,email:Name`), `SESSION_SECRET`.

## Privacy and safety copy
- Do not store medications or medical conditions beyond the kit item names the user types.
- Footer text on the kit screen: "General wellness reminders, not medical advice. Check supplements with your clinician if you take prescription medication."
- Be honest about evidence: timing of light, caffeine, sleep and melatonin has support. Vitamin C, omega-3 and B-vitamin steps are routine, not proven. Mark those as "routine" in the detail text.

## Acceptance checks
1. Denver 2026-11-01 15:40 to Amsterdam shows +8 h, East, 5 adjustment days.
2. No melatonin step on the westbound return leg.
3. Tapping the top Next up card advances the deck, flips the row to orange, and dims it to gray after 3 s.
4. Dark mode follows the system and can be overridden.
5. Reduced motion shows the final state with no animation.
6. A push arrives within 1 minute of an event time on an installed iPhone PWA.
7. A non-allowlisted email never receives a code.

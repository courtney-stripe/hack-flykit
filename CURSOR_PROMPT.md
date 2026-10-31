This repo is a finished Next.js 14 app called Body Clock Kit. Do not redesign or refactor it. Your only job is to get it running locally and deployed to Vercel.

Do these steps in order and tell me the result of each:

1. `npm install`
2. `npm test` (5 engine tests must pass)
3. `npm run build` (must succeed with no errors)
4. `npm run dev`, then confirm http://localhost:3000 loads and shows the Today screen with a route, a ticket and a "Starts in ..." card.
5. If this folder is not a git repo, run `git init`, commit everything, create a GitHub repo, and push. Ask me for the repo name and visibility first.
6. Deploy to Vercel (import the GitHub repo, or run `npx vercel` and then `npx vercel --prod`). The framework is Next.js. No environment variables are needed. Do not add any.
7. Give me the production URL.

Rules:
- Do not change colors, copy, layout, motion or the schedule engine (`lib/engine.js`). If you think something is broken, tell me and wait.
- Do not add dependencies.
- If a step fails, show me the exact error and fix only what is needed to unblock that step.

Reference only (do not act on it): `docs/SPEC.md` describes phase 2 (Resend email-code login, shared data for two people, web push). Do not start it until I ask.

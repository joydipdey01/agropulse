# AgroPulse Precision

Agri-biotech & precision-farming platform: **crop-yield prediction**, **soil-health diagnostics**,
**biofertiliser & biopesticide guidance**, and an **AI agronomist** — fully usable in **English (default), Bengali and Hindi**.

| Layer | Technology |
|---|---|
| Frontend + backend | Next.js 15 (App Router, Route Handlers), React 19, TypeScript |
| Styling | Tailwind CSS v4 with theme tokens (light / dark) |
| Database + Auth | Supabase (Postgres + Row Level Security + Supabase Auth) |
| AI | Groq for chat answers; ElevenLabs for voice transcription and speech generation |
| Voice | ElevenLabs Scribe v2 transcription + Eleven v3 spoken replies in English, Bengali, or Hindi |
| Validation | Zod |

---

## 1. Setup (about 10 minutes)

### A. Install
```bash
npm install
```
The ZIP includes a `.env.local` with the project's public Supabase URL and publishable key. Fill in `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` and `ELEVENLABS_API_KEY` before running the app. If you need to recreate it, copy `.env.example` to `.env.local` first and fill in all Supabase values too.

### B. Supabase
1. Create a project at https://supabase.com.
2. **SQL Editor → New query →** paste the whole of `supabase/schema.sql` → **Run**. (Safe to re-run.)
3. **Project Settings → API** → copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` public key
   - `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (**secret**; used only server-side for shared rate limiting)
4. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (use your real domain in production)
   - Redirect URLs: add `http://localhost:3000/**` and `https://YOUR-DOMAIN/**`
5. *(Optional, for quick demos)* **Authentication → Providers → Email → turn off “Confirm email”**
   so new accounts can sign in immediately. Leave it on for production.

### C. Groq
Create a key at https://console.groq.com/keys and set `GROQ_API_KEY` in `.env.local`.
`GROQ_MODEL` defaults to `openai/gpt-oss-120b`.

### D. ElevenLabs voice chat
Create an API key at https://elevenlabs.io/app/settings/api-keys with **Text to Speech** and **Speech to Text** access, then set `ELEVENLABS_API_KEY` in `.env.local`. The voice button records a turn, transcribes it with ElevenLabs Scribe v2, sends the text to Groq for an answer, speaks the reply with Eleven v3, and resumes listening. English, Bengali, and Hindi follow the selected app language.
Microphone access requires browser and operating-system permission. Use HTTPS outside localhost. ElevenLabs API calls are made only by the server; the account's usage credits apply.

### E. Run
```bash
npm run dev          # http://localhost:3000
npm run typecheck    # optional: full TypeScript check
npm run build && npm start
```

---

## 2. What is included

| Page | Route | Notes |
|---|---|---|
| Home | `/` | Hero, tools overview, how it works |
| Crop-yield prediction | `/crop-yield` | Transparent agronomic model, per-factor impacts, risk, advice, AI note; saved when signed in |
| Soil-health diagnostics | `/soil-health` | Score, parameter status (Indian Soil Health Card bands), issues, matching bio-inputs, AI note |
| Bio-solutions library | `/bio-solutions` | 12 biofertilisers / biopesticides / botanicals, search + filters, dose calculator, saved application plans |
| AI Agronomist | `/agronomist` | Streaming chat in EN/BN/HI, saved conversation history (sign-in required) |
| Login / sign-up / forgot password | `/login`, `/reset-password` | Supabase Auth, polished two-panel design |
| Dashboard | `/dashboard` | History of yields, soil tests, plans, chats; profile; delete items |
| Privacy Policy / Cookie Policy / Terms | `/privacy`, `/cookies`, `/terms` | Fully translated |

Footer shows **“Copyright owned by Joydip Dey.”** and **“If you face any problem, feel free to contact us at nexaforge83@gmail.com.”**

---

## 3. Architecture

```
src/
├─ middleware.ts            Session refresh, route protection, per-request CSP (nonce)
├─ app/
│  ├─ layout.tsx            Fonts, theme (no-flash), i18n provider, navbar/footer
│  ├─ (pages)               home, crop-yield, soil-health, bio-solutions, agronomist, dashboard, login, legal…
│  ├─ auth/callback         Email-confirm / password-reset code exchange
│  └─ api/                  yield · soil · chat (streaming) · bio-plan   ← server-only logic
├─ components/
│  ├─ ui/                   Design-system primitives (Button, Card, Field, …)
│  ├─ layout/               Navbar, Footer, LanguageSwitcher, ThemeToggle, CookieNotice
│  └─ features/             YieldTool, SoilTool, BioExplorer, AgronomistChat, AuthForm, …
└─ lib/
   ├─ engines/              Pure, testable models: yield.ts, soil.ts
   ├─ data/                 Crops and bio-product catalogue
   ├─ i18n/                 config, provider, dictionaries/{en,bn,hi}.ts
   ├─ supabase/             browser / server / admin / middleware clients
   ├─ groq.ts, prompts.ts   Chat model (server only)
   ├─ rate-limit.ts         Postgres-backed fixed-window limiter (+ in-memory fallback)
   └─ security.ts, api.ts   Origin check, body limits, validation guard
```

**Scalability:** the app is stateless (state lives in Supabase), so it scales horizontally on Vercel or any container
platform. Rate limiting uses a shared Postgres counter, so limits hold across many instances. A `Dockerfile` is included.

---

## 4. Security model

- **No secret in the browser.** Only `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` (public by design) reach the client.
  `GROQ_API_KEY`, `ELEVENLABS_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are read only in server code; `server-only` makes the build fail if they are ever imported into client code.
- **Row Level Security on every table**, with no “public” or `user_id IS NULL` policies. Users can only read/write their own rows.
  Chat messages additionally require that the parent conversation belongs to the user.
- **Strict input validation** (Zod) on every API route, numeric ranges enforced again by database `CHECK` constraints.
- **CSRF defence** (same-origin check on all POST routes), **request-size limits**, generic error messages.
- **Rate limiting** per IP (anonymous) or per user, separately for general calls and for AI calls.
- **Security headers:** CSP with per-request nonce + `strict-dynamic`, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP.
- **Open-redirect protection** on the `next` parameter; AI output is rendered by a safe Markdown renderer (no raw HTML).
- **AI safety:** system prompt restricts scope, prefers biological/IPM methods, refuses chemical-pesticide dosing, ignores prompt-injection attempts.
  Free-text user input is never placed in the brief prompts for the calculators (only validated numbers and enums).

---

## 5. Languages

Everything visible is in `src/lib/i18n/dictionaries/{en,bn,hi}.ts` — pages, form labels, results, advice, bio-product details, legal pages, and errors.
`bn.ts` and `hi.ts` are typed against `en.ts`, so a missing key is a compile-time error.
The chosen language is stored in a cookie (`lang`), sets `<html lang>`, switches the font (Noto Sans Bengali / Devanagari), formats numbers and dates
with local digits, **and tells the AI which language to answer in**. To add a language: add a file, register it in `lib/i18n/config.ts`, `dictionaries/index.ts`, and the `CHECK` constraints for `locale` in the SQL.

## 6. Theme

Muted forest green, warm neutrals and an earth-ochre accent; no neon or gradient-heavy styling. Light and dark palettes are defined as CSS variables in
`src/app/globals.css`. The toggle stores the choice in a cookie and the theme is applied before first paint (no flash). Animations are subtle, respect
`prefers-reduced-motion`, and there are no cursor effects.

---

## 7. Deploy

**Vercel:** follow [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) for the environment variables, Supabase SQL/Auth configuration, numeric signup OTP template, and production checks.

**Docker:**
```bash
docker build -t agropulse \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... .
docker run -p 3000:3000 -e SUPABASE_SERVICE_ROLE_KEY=... -e GROQ_API_KEY=... -e ELEVENLABS_API_KEY=... agropulse
```

## 8. Smoke-test checklist
1. Switch language EN → বাং → हि on the home page; everything, including the footer and cookie notice, changes.
2. Toggle light/dark; reload — the choice persists.
3. `/crop-yield` and `/soil-health` → “Use sample values” → run; results appear (AI note appears once `GROQ_API_KEY` is set).
4. Sign up → sign in → run a tool → check **Dashboard** shows the saved result.
5. `/agronomist` → ask a question in Bengali with the language set to বাংলা → streamed Bengali answer; reload and reopen the chat from history.
6. `/bio-solutions` → pick a product → calculate → **Save plan** → see it on the Dashboard.

## 9. Honest notes
- The yield model is a **transparent agronomic response model**, not a trained ML model. Baselines and thresholds are typical published values; the UI says so.
  If you collect real field data, replace `src/lib/engines/yield.ts` with a calibrated model — the API and UI will not need to change.
- Bio-product doses are **typical label doses**; the UI tells users to follow the product label and local KVK advice.
- Run `npm run typecheck` once after install (the build is configured not to fail on type-only errors so a deployment is never blocked).

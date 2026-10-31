# Deploy AgroPulse on Vercel

This ZIP contains the Next.js project at its root. Create a GitHub repository from these files and import that repository into Vercel. Choose the **Next.js** framework preset; leave the root directory as `.`.

## 1. Add Vercel environment variables

Add these under **Vercel → Project → Settings → Environment Variables** for Preview and Production, then redeploy after saving:

| Variable | Where to get it / purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret/service-role key; server only, optional (shared rate limiting) |
| `GROQ_API_KEY` | Groq API key for text chat and AI advice |
| `GROQ_MODEL` | Optional; defaults to `openai/gpt-oss-120b` |
| `ELEVENLABS_API_KEY` | ElevenLabs key with Speech to Text and Text to Speech access |

Never add secret values to GitHub or prefix secret variables with `NEXT_PUBLIC_`. For local development, copy `.env.example` to `.env.local` and fill it there. This project ZIP intentionally does not include `.env.local`.

## 2. Configure Supabase database and Auth

1. In the Supabase SQL Editor, run `supabase/schema.sql` once. This creates the app tables, RLS policies, profile trigger, and shared rate-limit RPC.
2. In **Authentication → URL Configuration**, set **Site URL** to your Vercel production URL. Add the production URL and Vercel Preview URL patterns to **Redirect URLs**, including `https://your-domain.vercel.app/auth/callback`.
3. Keep email confirmations enabled. SMTP is configured in Supabase, so message delivery is handled there.
4. For numeric email verification, edit **Authentication → Email Templates → Confirm signup** to include the OTP token, for example: `Your AgroPulse verification code is {{ .Token }}`. The app has a code-entry screen and verifies it with Supabase Auth. Do not use a confirmation-link-only template for signup OTP.
5. Add your custom domain in Vercel if desired, then set the Supabase Site URL and redirect allowlist to that domain too.

## 3. Check the deployment

- Open `/login`, create an account, enter the code received by email, then sign out and sign back in.
- Check Supabase **Authentication → Logs** if signup fails. If the message says `Database error saving new user`, run `supabase/schema.sql` and inspect the `on_auth_user_created` trigger.
- Sign in and try voice chat on the deployed HTTPS site. Microphone use is allowed for this site by the security policy; users still need to allow browser and device microphone access.
- AI features require valid Groq and ElevenLabs API keys. Their providers can enforce quotas or paid usage limits.

## Local run

```powershell
npm install
Copy-Item .env.example .env.local
# Fill .env.local, then:
npm run dev
```

Use Node.js 20.9 or newer.

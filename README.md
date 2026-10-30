# OnIt

On-demand help app (Expo / React Native, TypeScript). We're building it one screen at a time.

## Run it

1. Install Node.js (LTS) from nodejs.org (one time).
2. In this folder: `npm install` (first time, and whenever package.json changes).
3. Sign-in setup (one time, see below), then start it: `npx expo start`
   - Phone: install **Expo Go**, then scan the QR code (iPhone: use the Camera app).
   - Computer: press `w` to open it in your browser.

## Where things are

- `src/app/` - screens only. Each file is one screen.
  - `_layout.tsx` - wraps every screen
  - `(auth)/index.tsx` - login (phone number, then 6-digit text code)
  - Folders in (parentheses) group screens without changing their address
- `src/components/` - pieces shared by screens (`Button.tsx`)
- `src/theme.ts` - light and dark colors
- `assets/` - logo and images
- `src/lib/supabase.ts` - connection to Supabase (accounts and sign-in)
- Setup files (`package.json`, `app.json`, `tsconfig.json`) stay at the top level

## Sign-in setup (Supabase + Twilio Verify)

Supabase handles accounts. It sends the 6-digit text codes through Twilio Verify.

1. Make a free project at supabase.com.
2. Make a Twilio account, then in Twilio go to Verify and create a Verify Service.
3. In Supabase: Authentication > Sign In / Providers > Phone. Turn it on, pick **Twilio Verify**, and paste your Twilio Account SID, Auth Token and Verify Service SID. These stay in Supabase, never in the app.
4. Copy `.env.example`, name the copy `.env`, and fill in your Supabase project URL and publishable (anon) key from Project Settings > API.
5. Restart with `npx expo start --clear`.

For testing without paying for texts, add test numbers in the same Phone settings (for example `15555551234` with code `123456`).

`.env` is not uploaded to GitHub. Send it to each other privately.

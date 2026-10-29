# OnIt

On-demand help app (Expo / React Native, TypeScript). We're building it one screen at a time.

## Run it

1. Install Node.js (LTS) from nodejs.org (one time).
2. In this folder: `npm install` (first time, and whenever package.json changes).
3. Start it: `npx expo start`
   - Phone: install **Expo Go**, then scan the QR code (iPhone: use the Camera app).
   - Computer: press `w` to open it in your browser.

## Where things are

- `src/app/` - screens only. Each file is one screen.
  - `_layout.tsx` - wraps every screen
  - `(auth)/index.tsx` - login (phone number, then 4-digit code)
  - Folders in (parentheses) group screens without changing their address
- `src/components/` - pieces shared by screens (`Button.tsx`)
- `src/theme.ts` - light and dark colors
- `assets/` - logo and images
- Setup files (`package.json`, `app.json`, `tsconfig.json`) stay at the top level

Codes aren't really texted yet. Any 4 digits work until we add a backend.

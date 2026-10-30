# OnIt

On-demand help app (Expo / React Native, TypeScript). We're building it one screen at a time.

## Run it

Sign-in uses Firebase, which needs our own test version of the app (a "development build"). Expo Go can't run it.

1. Install Node.js (LTS) from nodejs.org (one time).
2. In this folder: `npm install` (first time, and whenever package.json changes).
3. Firebase setup and a development build (one time, see below).
4. Start it: `npx expo start`, then open the **OnIt** dev app on your phone and pick the server.

## Where things are

- `src/app/` - screens only. Each file is one screen.
  - `_layout.tsx` - wraps every screen
  - `(auth)/index.tsx` - login (phone number, then 6-digit text code)
  - Folders in (parentheses) group screens without changing their address
- `src/components/` - pieces shared by screens (`Button.tsx`)
- `src/theme.ts` - light and dark colors
- `assets/` - logo and images
- Setup files (`package.json`, `app.json`, `tsconfig.json`) stay at the top level

## Firebase setup (one time)

1. Go to console.firebase.google.com and create a project called OnIt.
2. Add an **Android app** with package name `com.onitapp.app`. Download `google-services.json` into this folder (next to package.json).
3. Add an **iOS app** with bundle ID `com.onitapp.app`. Download `GoogleService-Info.plist` into this folder.
4. Build > Authentication > Get started > Sign-in method > turn on **Phone**.
5. Under "Phone numbers for testing", add a test number (for example `+1 555-555-1234`, code `123456`). Test numbers are free.
6. Real texts need the pay-as-you-go **Blaze** plan (billed per text).

## Development build (one time per phone)

- `npm install -g eas-cli`, then `eas login` (free Expo account) and `eas build:configure`
- Android: `eas build --profile development --platform android`, then install the file it gives you on your phone.
  - Add the build's SHA-1 and SHA-256 to Firebase (Project settings > Android app). Get them with `eas credentials`.
- iPhone: needs an Apple Developer account ($99/year). Run `eas device:create`, then `eas build --profile development --platform ios`.
- Rebuild only when you add packages with native code. Normal code changes show up instantly.

# Build LPUGPT Android APK (free, EAS)

**Prerequisite:** Backend deployed on PostgreSQL + HTTPS (your domain).  
Finish [project setup](../../README.md) and deployment before building the APK.

## One-time setup (~5 min)

1. Create a free [Expo account](https://expo.dev/signup).

2. Install deps and log in:

   ```bash
   cd mobile
   npm install
   npx eas login
   npx eas init
   ```

   `eas init` links this app to your Expo project and writes `projectId` into `app.config.ts` via Expo servers.

3. **Set your live backend URL** (must be HTTPS for the APK):

   Edit `eas.json` and replace `https://REPLACE_WITH_YOUR_DOMAIN` with your domain, e.g. `https://lpugpt.in`.

   Or set it without editing files:

   ```bash
   npx eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://YOUR_DOMAIN --visibility plaintext
   ```

   Then remove the hardcoded `env` block from `eas.json` if you use EAS env vars.

4. Deploy the Next.js backend first — the APK calls `EXPO_PUBLIC_API_URL/api/*`. Login will fail if the server is down.

## Build the APK

```bash
cd mobile
npm run build:apk
```

First build takes ~15–30 minutes on Expo’s cloud (free tier). When done, Expo prints a **download link** for the `.apk`.

Share that link with testers. They install it (Android may ask to allow “Install unknown apps” for Chrome/files).

## Rebuild after backend URL change

Any change to `EXPO_PUBLIC_API_URL` requires a **new build** — it is compiled into the app at build time.

```bash
npm run build:apk
```

## Local build (optional, no cloud queue)

Requires Android SDK installed:

```bash
npm run build:apk:local
```

## Demo logins

| Role    | Email             | Password      |
|---------|-------------------|---------------|
| Student | `student@lpu.in`  | `Student123!` |
| Teacher | `teacher@lpu.in`  | `Teacher123!` |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Can’t reach LPUGPT” on login | Wrong `EXPO_PUBLIC_API_URL` — rebuild with correct HTTPS domain |
| Session expired immediately | Backend `AUTH_SECRET` changed or DB was reset — log in again |
| Build fails: no projectId | Run `npx eas init` |
| Chat timeout | Backend cold start (Neon free tier) — retry after ~10s |

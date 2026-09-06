# LPUGPT Mobile

React Native (Expo) app for LPUGPT — same chat API as the web app.

## Prerequisites

1. **Next.js backend running** (from repo root):

   ```bash
   npm run dev
   ```

2. **Node 20+** and Expo Go on your phone (or iOS Simulator / Android emulator).

## Setup

```bash
cd mobile
npm install
```

### API URL

| Device | Set `EXPO_PUBLIC_API_URL` to |
|--------|------------------------------|
| iOS Simulator | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone | `http://YOUR_LAN_IP:3000` (e.g. `http://192.168.1.8:3000`) |

Create `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.8:3000
```

## Run

```bash
npm start
```

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR with **Expo Go** on your phone (same Wi‑Fi as your laptop)

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Student | `student@lpu.in` | `Student123!` |
| Teacher | `teacher@lpu.in` | `Teacher123!` |

## What works on mobile

- Login / logout (Bearer token auth)
- Chat with LPUGPT (same `/api/chat` as web)
- Role-based suggestion chips (student vs teacher)
- Compact summaries for rich UI blocks (fees, attendance, nav, ERP sessions)

## Android APK (pilot testers)

See **[BUILD_APK.md](./BUILD_APK.md)** for the full guide.

```bash
cd mobile
npm install
npx eas login
npx eas init
# Edit eas.json → set EXPO_PUBLIC_API_URL to your HTTPS domain
npm run build:apk
```

Expo emails a download link when the cloud build finishes (~15–30 min, free tier).

## What works best on web

- Teacher dashboard (classes, papers, makeup classes)
- File attachments + voice input in chat

Mobile covers chat, fees, assignments, leave, and campus nav via native blocks.

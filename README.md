# LPUGPT

AI campus assistant for LPU — chat, fees, assignments, leave, campus navigation, and faculty tools. Web (Next.js) + mobile (Expo).

## Stack

| Layer | Technology |
|-------|------------|
| Web | Next.js 16, React 19, Tailwind |
| Mobile | Expo 57, React Native |
| Database | **PostgreSQL** (Prisma ORM) |
| Auth | JWT + server-side sessions, bcrypt |
| LLM | Groq (default) → OpenAI → Ollama |

> **SQLite is not supported.** The app requires PostgreSQL for sessions, chat history, and pilot-scale data.

## Quick start (local)

### 1. Prerequisites

- Node.js 20+
- Docker Desktop (for local PostgreSQL)
- [Groq API key](https://console.groq.com/keys) (free tier)

### 2. Install

```bash
npm install
cp .env.example .env
```

Edit `.env`:

- Set `AUTH_SECRET` to a random string (32+ characters).
- Set `GROQ_API_KEY`.
- Keep the default Postgres URLs if using Docker below.

### 3. Database

```bash
npm run db:up          # starts PostgreSQL in Docker
npm run db:migrate:deploy
npm run db:seed        # demo users + campus data
```

Optional — bulk test students:

```bash
npm run db:scale-seed -- 200
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Student | `student@lpu.in` | `Student123!` |
| Teacher | `teacher@lpu.in` | `Teacher123!` |
| Admin | `admin@lpu.in` | `Admin123!` |

## Mobile app

```bash
cd mobile
npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
npm start
```

APK builds (after backend is deployed on HTTPS): see [mobile/BUILD_APK.md](./mobile/BUILD_APK.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:up` / `db:down` | Docker Postgres |
| `npm run db:migrate:deploy` | Apply migrations |
| `npm run db:seed` | Seed demo data |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |

## Testing

```bash
# Unit tests
npm run test

# E2E (needs Postgres seeded + production build)
npm run build
npm run test:e2e
```

## Project structure

```
src/app/          Next.js routes + API
src/components/   UI cards, chat, maps, teacher dashboard
src/lib/ai/       Chat engine, RAG, orchestrator, mock UMS agent
src/lib/auth.ts   Sessions + JWT
prisma/           Schema + migrations + seed
mobile/           Expo React Native app
tests/            Unit + E2E tests
docker/           PostgreSQL compose + init extensions
```

## Migrating from SQLite

If you previously ran with `file:./dev.db`:

1. Export any data you need (optional).
2. Update `.env` to PostgreSQL URLs (see `.env.example`).
3. Run `npm run db:up && npm run db:migrate:deploy && npm run db:seed`.
4. Remove `prisma/dev.db` from deployment — it is not used anymore.

## Deployment (when ready)

1. **Database:** [Neon](https://neon.tech) or [Supabase](https://supabase.com) free PostgreSQL.
2. **Web:** [Vercel](https://vercel.com) — set env vars from `.env.example`.
3. **Domain:** Point DNS to Vercel after the app works on the `.vercel.app` URL.
4. **Mobile APK:** Set `EXPO_PUBLIC_API_URL` to your HTTPS domain, then `npm run build:apk` in `mobile/`.

Required production env vars: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`, `GROQ_API_KEY`, `APP_URL`.

## License

Private — LPU pilot project.

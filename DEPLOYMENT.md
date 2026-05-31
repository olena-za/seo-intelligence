# Deployment

## Local Docker

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`
- Postgres: `localhost:5432`

The backend container runs `prisma migrate deploy` before starting.

## Railway Backend

Deploy the repository with `railway.json`, using `backend/Dockerfile`.

Required Railway variables:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=<Railway PostgreSQL URL>
CORS_ORIGINS=https://your-frontend.vercel.app
AUTH_ENABLED=true
JWT_SECRET=replace-with-at-least-32-characters
OPENAI_API_KEY=replace-me
DATAFORSEO_LOGIN=replace-me
DATAFORSEO_PASSWORD=replace-me
FIRECRAWL_API_KEY=replace-me
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=...
DATAFORSEO_API_KEY=...
DATAFORSEO_API_SECRET=...
FIRECRAWL_API_KEY=...
SUPABASE_PROJECT_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Run production migrations:

```bash
npm run db:migrate:deploy
```

## Vercel Frontend

Deploy the frontend with `vercel.json`.

Required Vercel variables:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## Auth

Auth is enabled by default. The frontend stores the JWT in an httpOnly `seo_token` cookie via Next.js route handlers, and the backend validates it with NestJS JWT guards.

# SEO Intelligence Architecture

This repository is structured as an MVP-friendly production foundation:

- `frontend/`: Next.js App Router dashboard
- `backend/`: NestJS API
- `backend/prisma/`: Prisma schema and migrations for Supabase PostgreSQL

## Frontend

The frontend keeps routes in `app/` and moves reusable or feature-specific code out of route files.

```text
frontend/
  app/                 App Router routes and route handlers
  components/
    ui/                shadcn-style primitives
    layout/            app shell, sidebar, top nav
    shared/            cross-feature loading/error states
  features/
    dashboard/         dashboard-specific UI
    projects/          project-specific UI/actions
    keywords/          reserved for keyword workflows
    competitors/       reserved for competitor workflows
    snapshots/         reserved for crawl/snapshot workflows
    analysis/          reserved for AI/semantic analysis workflows
  lib/
    api/               typed API client and resource helpers
    constants/         environment constants
    utils/             shared utilities
    validators/        future client-side schemas
  hooks/               future shared React hooks
  types/               shared frontend domain types
```

API calls go through `lib/api/client.ts`. Resource-specific helpers live beside it, for example `lib/api/projects.ts`. The client unwraps the backend response envelope so UI components still work with plain typed domain objects.

## Backend

The backend keeps infrastructure in `core/` and product domains in `modules/`.

```text
backend/src/
  core/
    auth/              future auth context and tenant scoping
    config/            typed config access and env validation
    http/              global error and response formatting
    jobs/              future queue tokens/contracts
    logging/           app logger
  modules/
    projects/
    keywords/
    serp/
    competitors/
    snapshots/
    analysis/
  prisma/              centralized Prisma service
  utils/               pure SEO/content utilities
```

Each feature module owns its controller, service, DTOs, and domain types/entities. Prisma remains centralized so connection lifecycle and future transaction helpers stay in one place.

## API Format

Successful NestJS responses are wrapped globally:

```json
{
  "data": {},
  "meta": {
    "path": "/projects",
    "timestamp": "2026-05-10T12:00:00.000Z"
  }
}
```

Errors are handled by the global HTTP exception filter and include status, path, timestamp, and error detail.

## Auth And Tenancy

`Project.userId` is nullable so existing records remain valid, and new projects are associated with the authenticated user. JWT auth lives in `modules/auth`; protected feature controllers pass `userId` into services and Prisma `where` clauses.

## Local SEO Intelligence Pipeline

The first end-to-end pipeline lives in `backend/src/modules/intelligence`.

Flow:
1. `POST /intelligence/projects/:projectId/run` accepts `{ "keyword": "best seo tools" }`.
2. The keyword is upserted into `Keyword`.
3. DataForSEO collects Google organic results and stores them in `SerpSnapshot` and `SerpResult`.
4. Firecrawl extracts the top 5 ranking URLs into `CrawledPage`.
5. OpenAI analyzes each crawled page and stores structured JSON in `PageAnalysis`.
6. `GET /intelligence/projects/:projectId` returns operational status for the project detail UI.

Required local env:
```bash
OPENAI_API_KEY=...
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
FIRECRAWL_API_KEY=...
```

Debugging:
- Backend request logs show each protected endpoint and duration.
- DataForSEO and Firecrawl services log successful fetches and crawl failures.
- Failed crawls or OpenAI quota/rate-limit errors are stored on `CrawledPage.error` or `PageAnalysis.error` instead of breaking the project page.

## Jobs

The current scheduled job module remains lightweight. Future BullMQ integration should use `core/jobs/jobs.tokens.ts` for queue names and introduce producers/workers by feature, for example SERP collection jobs in `modules/serp`.

## Database

Prisma models use consistent `createdAt` and `updatedAt` fields for auditability. Recent migrations add:

- `Project.domain`
- nullable `Project.userId`
- missing `updatedAt` columns on analytical/snapshot/cache models

All changes are additive and preserve existing data.

## Local Development

Run backend and frontend separately:

```bash
cd backend
npm run start:dev
```

```bash
cd frontend
PORT=3001 npm run dev
```

The frontend expects:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

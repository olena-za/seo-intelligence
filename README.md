# SEO Intelligence

SEO Intelligence is a competitive research platform for tracking US SERP competitors, crawling ranking pages, extracting deterministic SEO/CRO signals, and comparing historical changes.

## Stack

- Frontend: Next.js App Router
- Backend: NestJS
- Database: PostgreSQL with Prisma
- Providers: DataForSEO, Firecrawl, OpenAI

## Local Development

Run the backend:

```bash
cd backend
npm install
npm run start:dev
```

Run the frontend in a second terminal:

```bash
cd frontend
npm install
PORT=3001 npm run dev
```

Open:

```text
http://localhost:3001
```

Copy the example environment files before starting:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## Documentation

- [Architecture](README_ARCHITECTURE.md)
- [Deployment](DEPLOYMENT.md)
- [SERP pipeline](SERP_PIPELINE.md)
- [Longitudinal intelligence](LONGITUDINAL_INTELLIGENCE.md)

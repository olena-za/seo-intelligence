# SERP Pipeline

This document covers the current Step 1 ingestion layer only: DataForSEO SERP collection, normalization, persistence, and debug endpoints.

## Architecture

SERP collection is provider-based:

```text
backend/src/modules/serp/
  interfaces/
    serp-provider.interface.ts
  providers/
    dataforseo/
      dataforseo.client.ts
      dataforseo.mapper.ts
      dataforseo.types.ts
  serp.controller.ts
  serp.service.ts
```

`SerpService` owns orchestration and persistence. The DataForSEO client owns request transport, throttling, retries, provider validation, and normalization. This keeps controller logic thin and allows future providers such as SerpAPI, ScaleSERP, or custom scraping.

## Flow

1. API receives a manual collection request.
2. `SerpService` validates project ownership.
3. Keyword is deduplicated by project, keyword, location, language, and device.
4. `DataForSeoClient.collectOrganicSerp()` calls DataForSEO.
5. `DataForSeoMapper` normalizes provider-specific items.
6. A new immutable `SerpSnapshot` is created every time.
7. Normalized `SerpResult` rows are created under that snapshot.
8. Full raw DataForSEO response is stored on `SerpSnapshot.rawResponse`.

## Normalization

Supported result types include:

- `organic`
- `featured_snippet`
- `people_also_ask`
- `ai_overview`
- `related_search`
- `paid`
- provider fallback types

Stored fields include:

- `title`
- `url`
- `domain`
- `snippet`
- `rankGroup`
- `rankAbsolute`
- `xpath`
- `itemType`
- `breadcrumb`
- `isFeatured`
- `isPaid`
- `sitelinks`

## Reliability

The DataForSEO client uses:

- 30 second axios timeout
- 3 retry attempts
- exponential backoff
- retries only for 429, 5xx, timeout, or network errors
- no retries for invalid credentials or validation-style failures
- simple concurrency throttling
- configurable request delay

Environment:

```bash
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
SERP_MAX_CONCURRENT_REQUESTS=3
SERP_REQUEST_DELAY_MS=300
```

## Snapshot Metadata

`SerpSnapshot` stores:

- `provider`
- `rawResponse`
- `requestDurationMs`
- `totalResults`
- `organicResultsCount`
- `resultTypes`
- `status`
- `errorMessage`

Statuses:

- `success`
- `partial`
- `failed`

All snapshots are retained for future historical comparison.

## Local Commands

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

```bash
cd frontend
npm run dev -- -p 3001
```

## Local URLs

Backend:

```text
http://localhost:3000
```

Frontend:

```text
http://localhost:3001
```

## Thunder Client Examples

Use a Bearer token from `POST /auth/login` for all protected requests below.

For local development only, these routes are temporarily public when `NODE_ENV=development`:

- `GET /serp/providers/status`
- `POST /serp/test-keyword`
- `POST /serp/collect`

Production remains protected. To revert the temporary bypass, remove `@DevelopmentPublic()` from those three methods in `backend/src/modules/serp/serp.controller.ts` and remove the metadata check from `backend/src/modules/auth/jwt-auth.guard.ts`.

### Login

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "auth-test-20260510-1725@example.com",
  "password": "Password123!"
}
```

### Provider Status

```http
GET http://localhost:3000/serp/providers/status
Authorization: Bearer {{token}}
```

Example response:

```json
{
  "data": {
    "provider": "dataforseo",
    "configured": true,
    "credentialsValid": true,
    "reachable": true
  }
}
```

### Test Keyword Without Saving

```http
POST http://localhost:3000/serp/test-keyword
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "keyword": "best crypto casino",
  "depth": 3
}
```

Example response:

```json
{
  "data": {
    "provider": "dataforseo",
    "status": "success",
    "totalResults": 11,
    "organicResultsCount": 3,
    "resultTypes": ["organic", "related_search"],
    "results": [
      {
        "position": 1,
        "itemType": "organic",
        "title": "Best Crypto Casinos 2026",
        "url": "https://example.com/",
        "domain": "example.com"
      }
    ]
  }
}
```

### Collect And Save SERP

```http
POST http://localhost:3000/serp/collect
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "projectId": "PROJECT_ID",
  "keyword": "best crypto casino",
  "locationCode": 2840,
  "languageCode": "en",
  "device": "desktop",
  "depth": 10
}
```

Example response:

```json
{
  "data": {
    "id": "snapshot_id",
    "provider": "dataforseo",
    "status": "success",
    "totalResults": 11,
    "organicResultsCount": 3,
    "resultTypes": ["organic", "related_search"],
    "results": []
  }
}
```

### Latest Snapshot Per Keyword

```http
GET http://localhost:3000/serp/project/PROJECT_ID/latest
Authorization: Bearer {{token}}
```

### Historical Snapshots

```http
GET http://localhost:3000/serp/project/PROJECT_ID/history?limit=20&offset=0&orderBy=desc
Authorization: Bearer {{token}}
```

## Future Stages

This layer intentionally does not implement Firecrawl crawling, OpenAI analysis, queues, BullMQ, or cron scheduling. It is structured so those stages can consume immutable snapshots and normalized ranking URLs later.

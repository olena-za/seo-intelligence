# Longitudinal Competitive Intelligence

This layer extends the SERP competitor snapshot engine into a historical intelligence system.

## Implemented Foundations

- Result quality filtering before and after crawl.
- Skipped SERP results remain stored because rankings still matter.
- Extraction confidence and render quality scores are stored on `CompetitorSnapshot`.
- Deterministic page diffs are stored in `SnapshotDiff`.
- Internal links are stored in `InternalLinkSnapshot`.
- SERP volatility is stored in `SerpVolatilitySnapshot`.
- Sitemap history is stored in `SitemapSnapshot`, `SitemapUrl`, and `SitemapDiff`.
- AI assumptions have a storage model, but generation remains gated for future diff-based prompts.
- Weekly snapshot scheduling is prepared behind `WEEKLY_SNAPSHOTS_ENABLED=true`.

## API Endpoints

### Competitor Snapshots

```http
POST /competitor-intelligence/snapshots
Content-Type: application/json

{
  "keyword": "best crypto casino",
  "limit": 10,
  "locationCode": 2840,
  "languageCode": "en",
  "device": "desktop"
}
```

Response includes:

```json
{
  "id": "snapshot_id",
  "keyword": "best crypto casino",
  "volatilitySnapshot": {
    "volatilityScore": 42,
    "newEntrants": ["example.com"],
    "droppedDomains": []
  },
  "competitorSnapshots": [
    {
      "position": 1,
      "rankingUrl": "https://example.com/best-crypto-casino",
      "resultQuality": "PROCESSABLE",
      "extractionConfidence": 82,
      "renderQualityScore": 76,
      "processingSkipped": false,
      "diffs": [],
      "internalLinkItems": []
    }
  ]
}
```

### Sitemap Intelligence

```http
POST /sitemap-intelligence/snapshots
Content-Type: application/json

{
  "domain": "example.com"
}
```

Response includes:

```json
{
  "id": "sitemap_snapshot_id",
  "domain": "example.com",
  "totalUrls": 420,
  "addedUrlsCount": 12,
  "removedUrlsCount": 2,
  "freshnessVelocity": 31,
  "categoryExpansions": ["no kyc casino", "solana casino"],
  "diffs": [
    {
      "url": "https://example.com/solana-casino/",
      "changeType": "ADDED",
      "semanticCluster": "solana casino"
    }
  ]
}
```

## Frontend

- `/competitors`: runs top-10 US SERP snapshots and shows result quality.
- `/competitors/:snapshotId/:pageId`: shows quality, diffs, internal links, phrase history, and technical exports.
- `/sitemaps`: collects sitemap snapshots and renders URL additions/removals, category expansion, and freshness activity.

## Database Additions

- `ResultQuality` enum
- `SnapshotDiffChangeType` enum
- Quality fields on `CompetitorSnapshot`
- `SnapshotDiff`
- `InternalLinkSnapshot`
- `SerpVolatilitySnapshot`
- `SitemapSnapshot`
- `SitemapUrl`
- `SitemapDiff`
- `AiAssumption`

## Weekly Automation

The weekly scheduler is intentionally disabled by default.

```env
WEEKLY_SNAPSHOTS_ENABLED=true
WEEKLY_SNAPSHOT_KEYWORD_LIMIT=25
```

When enabled, it reruns recent keyword snapshots weekly and reuses the existing competitor snapshot pipeline.

## Scaling Notes

- Move weekly work into BullMQ workers before running large keyword sets.
- Keep DataForSEO and Firecrawl concurrency capped per provider.
- Use `SnapshotDiff` and `SerpVolatilitySnapshot` as the evidence layer for future OpenAI strategic assumptions.
- Add Playwright/proxy extraction providers only as legal fallback modules; do not bypass site protections unlawfully.

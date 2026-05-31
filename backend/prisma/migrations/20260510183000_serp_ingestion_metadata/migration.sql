/* Production SERP ingestion metadata and normalization fields */
DROP INDEX IF EXISTS "Keyword_projectId_keyword_key";

ALTER TABLE "Keyword"
  ADD COLUMN "locationCode" INTEGER DEFAULT 2840,
  ADD COLUMN "languageCode" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "device" TEXT NOT NULL DEFAULT 'desktop';

CREATE UNIQUE INDEX "Keyword_projectId_keyword_locationCode_languageCode_device_key"
  ON "Keyword"("projectId", "keyword", "locationCode", "languageCode", "device");

ALTER TABLE "SerpSnapshot"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'dataforseo',
  ADD COLUMN "rawResponse" JSONB,
  ADD COLUMN "requestDurationMs" INTEGER,
  ADD COLUMN "totalResults" INTEGER,
  ADD COLUMN "organicResultsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resultTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN "errorMessage" TEXT;

ALTER TABLE "SerpResult"
  ALTER COLUMN "url" DROP NOT NULL,
  ALTER COLUMN "domain" DROP NOT NULL,
  ALTER COLUMN "title" DROP NOT NULL,
  ADD COLUMN "rankGroup" INTEGER,
  ADD COLUMN "rankAbsolute" INTEGER,
  ADD COLUMN "xpath" TEXT,
  ADD COLUMN "itemType" TEXT NOT NULL DEFAULT 'organic',
  ADD COLUMN "breadcrumb" TEXT,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SerpSnapshot"
SET "resultTypes" = ARRAY['organic']
WHERE "resultTypes" IS NULL;

ALTER TABLE "SerpSnapshot"
  ALTER COLUMN "resultTypes" SET NOT NULL;

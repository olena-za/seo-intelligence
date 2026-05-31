-- AlterTable
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "rankingUrl" TEXT;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "normalizedUrl" TEXT;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "urlHash" TEXT;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "metaDescription" TEXT;

-- Backfill new ranking-page fields from the existing exact SERP URL column.
UPDATE "CompetitorSnapshot"
SET
  "rankingUrl" = "url",
  "normalizedUrl" = lower(regexp_replace("url", '#.*$', '')),
  "urlHash" = md5(lower(regexp_replace("url", '#.*$', '')))
WHERE "rankingUrl" IS NULL;

-- AlterTable
ALTER TABLE "ExtractedFeatures" ADD COLUMN "extractionQuality" TEXT NOT NULL DEFAULT 'extraction_success';
ALTER TABLE "ExtractedFeatures" ADD COLUMN "moneyKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ExtractedFeatures" ADD COLUMN "freshnessSignals" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill aliases for the newer ranking-page naming.
UPDATE "ExtractedFeatures"
SET
  "moneyKeywords" = "recurringMoneyKeywords",
  "freshnessSignals" = array_cat("updatedYearMentions", array_cat("latestBonuses", "recentReleases"))
WHERE cardinality("moneyKeywords") = 0;

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_urlHash_idx" ON "CompetitorSnapshot"("urlHash");
CREATE INDEX "CompetitorSnapshot_normalizedUrl_idx" ON "CompetitorSnapshot"("normalizedUrl");

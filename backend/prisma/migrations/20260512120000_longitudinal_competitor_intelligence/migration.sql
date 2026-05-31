-- Longitudinal competitor intelligence foundations:
-- quality filtering, sitemap history, deterministic diffs, volatility, internal links, and AI assumptions.

CREATE TYPE "ResultQuality" AS ENUM ('PROCESSABLE', 'BLOCKED', 'CAPTCHA', 'USER_GENERATED', 'VIDEO', 'MARKETPLACE', 'LOW_CONTENT', 'FORUM', 'PDF');
CREATE TYPE "SnapshotDiffChangeType" AS ENUM ('ADDED', 'REMOVED', 'CHANGED', 'UNCHANGED');

ALTER TABLE "CompetitorSnapshot" ADD COLUMN "resultQuality" "ResultQuality" NOT NULL DEFAULT 'PROCESSABLE';
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "extractionConfidence" INTEGER;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "renderQualityScore" INTEGER;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "processingSkipped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "skipReason" TEXT;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "protectionType" TEXT;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "blockedBy" TEXT;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "partialExtraction" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SnapshotDiff" (
  "id" TEXT NOT NULL,
  "currentCompetitorSnapshotId" TEXT NOT NULL,
  "previousCompetitorSnapshotId" TEXT,
  "field" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "changeType" "SnapshotDiffChangeType" NOT NULL,
  "previousValue" JSONB,
  "currentValue" JSONB,
  "delta" JSONB,
  "severity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SnapshotDiff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalLinkSnapshot" (
  "id" TEXT NOT NULL,
  "competitorSnapshotId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "destinationUrl" TEXT NOT NULL,
  "normalizedUrl" TEXT,
  "anchorText" TEXT,
  "isHubReference" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalLinkSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SerpVolatilitySnapshot" (
  "id" TEXT NOT NULL,
  "keywordSnapshotId" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "volatilityScore" INTEGER NOT NULL,
  "averageMove" DOUBLE PRECISION,
  "newEntrants" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "droppedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "stableDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rankingMomentum" JSONB,
  "turbulenceMetrics" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SerpVolatilitySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SitemapSnapshot" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "domain" TEXT NOT NULL,
  "robotsUrl" TEXT NOT NULL,
  "sitemapUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'success',
  "errorMessage" TEXT,
  "requestDurationMs" INTEGER,
  "totalUrls" INTEGER NOT NULL DEFAULT 0,
  "addedUrlsCount" INTEGER NOT NULL DEFAULT 0,
  "removedUrlsCount" INTEGER NOT NULL DEFAULT 0,
  "changedUrlsCount" INTEGER NOT NULL DEFAULT 0,
  "freshnessVelocity" INTEGER NOT NULL DEFAULT 0,
  "semanticClusters" JSONB,
  "categoryExpansions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rawRobotsTxt" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SitemapSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SitemapUrl" (
  "id" TEXT NOT NULL,
  "sitemapSnapshotId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "normalizedUrl" TEXT NOT NULL,
  "urlHash" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "lastmod" TIMESTAMP(3),
  "changefreq" TEXT,
  "priority" DOUBLE PRECISION,
  "semanticCluster" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SitemapUrl_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SitemapDiff" (
  "id" TEXT NOT NULL,
  "sitemapSnapshotId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "urlHash" TEXT NOT NULL,
  "changeType" "SnapshotDiffChangeType" NOT NULL,
  "previousValue" JSONB,
  "currentValue" JSONB,
  "semanticCluster" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SitemapDiff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiAssumption" (
  "id" TEXT NOT NULL,
  "competitorSnapshotId" TEXT,
  "keywordSnapshotId" TEXT,
  "assumptionType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "evidence" JSONB,
  "model" TEXT,
  "rawResponse" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiAssumption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SerpVolatilitySnapshot_keywordSnapshotId_key" ON "SerpVolatilitySnapshot"("keywordSnapshotId");
CREATE INDEX "CompetitorSnapshot_resultQuality_idx" ON "CompetitorSnapshot"("resultQuality");
CREATE INDEX "CompetitorSnapshot_processingSkipped_idx" ON "CompetitorSnapshot"("processingSkipped");
CREATE INDEX "SnapshotDiff_currentCompetitorSnapshotId_idx" ON "SnapshotDiff"("currentCompetitorSnapshotId");
CREATE INDEX "SnapshotDiff_previousCompetitorSnapshotId_idx" ON "SnapshotDiff"("previousCompetitorSnapshotId");
CREATE INDEX "SnapshotDiff_category_idx" ON "SnapshotDiff"("category");
CREATE INDEX "SnapshotDiff_field_idx" ON "SnapshotDiff"("field");
CREATE INDEX "InternalLinkSnapshot_competitorSnapshotId_idx" ON "InternalLinkSnapshot"("competitorSnapshotId");
CREATE INDEX "InternalLinkSnapshot_normalizedUrl_idx" ON "InternalLinkSnapshot"("normalizedUrl");
CREATE INDEX "InternalLinkSnapshot_anchorText_idx" ON "InternalLinkSnapshot"("anchorText");
CREATE INDEX "SerpVolatilitySnapshot_keyword_idx" ON "SerpVolatilitySnapshot"("keyword");
CREATE INDEX "SerpVolatilitySnapshot_volatilityScore_idx" ON "SerpVolatilitySnapshot"("volatilityScore");
CREATE INDEX "SitemapSnapshot_projectId_idx" ON "SitemapSnapshot"("projectId");
CREATE INDEX "SitemapSnapshot_domain_idx" ON "SitemapSnapshot"("domain");
CREATE INDEX "SitemapSnapshot_capturedAt_idx" ON "SitemapSnapshot"("capturedAt");
CREATE INDEX "SitemapUrl_sitemapSnapshotId_idx" ON "SitemapUrl"("sitemapSnapshotId");
CREATE INDEX "SitemapUrl_urlHash_idx" ON "SitemapUrl"("urlHash");
CREATE INDEX "SitemapUrl_semanticCluster_idx" ON "SitemapUrl"("semanticCluster");
CREATE INDEX "SitemapDiff_sitemapSnapshotId_idx" ON "SitemapDiff"("sitemapSnapshotId");
CREATE INDEX "SitemapDiff_urlHash_idx" ON "SitemapDiff"("urlHash");
CREATE INDEX "SitemapDiff_changeType_idx" ON "SitemapDiff"("changeType");
CREATE INDEX "SitemapDiff_semanticCluster_idx" ON "SitemapDiff"("semanticCluster");
CREATE INDEX "AiAssumption_competitorSnapshotId_idx" ON "AiAssumption"("competitorSnapshotId");
CREATE INDEX "AiAssumption_keywordSnapshotId_idx" ON "AiAssumption"("keywordSnapshotId");
CREATE INDEX "AiAssumption_assumptionType_idx" ON "AiAssumption"("assumptionType");

ALTER TABLE "SnapshotDiff" ADD CONSTRAINT "SnapshotDiff_currentCompetitorSnapshotId_fkey" FOREIGN KEY ("currentCompetitorSnapshotId") REFERENCES "CompetitorSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SnapshotDiff" ADD CONSTRAINT "SnapshotDiff_previousCompetitorSnapshotId_fkey" FOREIGN KEY ("previousCompetitorSnapshotId") REFERENCES "CompetitorSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InternalLinkSnapshot" ADD CONSTRAINT "InternalLinkSnapshot_competitorSnapshotId_fkey" FOREIGN KEY ("competitorSnapshotId") REFERENCES "CompetitorSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SerpVolatilitySnapshot" ADD CONSTRAINT "SerpVolatilitySnapshot_keywordSnapshotId_fkey" FOREIGN KEY ("keywordSnapshotId") REFERENCES "KeywordSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitemapSnapshot" ADD CONSTRAINT "SitemapSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SitemapUrl" ADD CONSTRAINT "SitemapUrl_sitemapSnapshotId_fkey" FOREIGN KEY ("sitemapSnapshotId") REFERENCES "SitemapSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitemapDiff" ADD CONSTRAINT "SitemapDiff_sitemapSnapshotId_fkey" FOREIGN KEY ("sitemapSnapshotId") REFERENCES "SitemapSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAssumption" ADD CONSTRAINT "AiAssumption_competitorSnapshotId_fkey" FOREIGN KEY ("competitorSnapshotId") REFERENCES "CompetitorSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiAssumption" ADD CONSTRAINT "AiAssumption_keywordSnapshotId_fkey" FOREIGN KEY ("keywordSnapshotId") REFERENCES "KeywordSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

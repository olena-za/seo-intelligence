-- CreateTable
CREATE TABLE "KeywordSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "keyword" TEXT NOT NULL,
    "locationCode" INTEGER NOT NULL DEFAULT 2840,
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "device" TEXT NOT NULL DEFAULT 'desktop',
    "provider" TEXT NOT NULL DEFAULT 'dataforseo',
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "requestDurationMs" INTEGER,
    "totalResults" INTEGER,
    "organicResultsCount" INTEGER NOT NULL DEFAULT 0,
    "rawSerpResponse" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL,
    "keywordSnapshotId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT,
    "crawlStatus" TEXT NOT NULL DEFAULT 'pending',
    "crawlError" TEXT,
    "crawlDurationMs" INTEGER,
    "crawledAt" TIMESTAMP(3),
    "rawCrawlResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedFeatures" (
    "id" TEXT NOT NULL,
    "competitorSnapshotId" TEXT NOT NULL,
    "title" TEXT,
    "metaDescription" TEXT,
    "h1Count" INTEGER NOT NULL DEFAULT 0,
    "h2Count" INTEGER NOT NULL DEFAULT 0,
    "h3Count" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "faqCount" INTEGER NOT NULL DEFAULT 0,
    "tableCount" INTEGER NOT NULL DEFAULT 0,
    "schemaPresent" BOOLEAN NOT NULL DEFAULT false,
    "primaryEntities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recurringMoneyKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "semanticClusters" JSONB,
    "keywordUsageFrequency" JSONB,
    "ctaCount" INTEGER NOT NULL DEFAULT 0,
    "ctaWording" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "urgencyWording" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bonusStructures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "percentages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kycMentions" BOOLEAN NOT NULL DEFAULT false,
    "licenses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provablyFair" BOOLEAN NOT NULL DEFAULT false,
    "wallets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewSchema" BOOLEAN NOT NULL DEFAULT false,
    "trustSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalLinksCount" INTEGER NOT NULL DEFAULT 0,
    "anchorTexts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hubPageReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedYearMentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latestBonuses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recentReleases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hreflang" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "localizedCurrencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countryTargeting" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractedFeatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingHistory" (
    "id" TEXT NOT NULL,
    "keywordSnapshotId" TEXT NOT NULL,
    "competitorSnapshotId" TEXT,
    "keyword" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "previousPosition" INTEGER,
    "positionDelta" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeywordSnapshot_projectId_idx" ON "KeywordSnapshot"("projectId");
CREATE INDEX "KeywordSnapshot_keyword_idx" ON "KeywordSnapshot"("keyword");
CREATE INDEX "KeywordSnapshot_capturedAt_idx" ON "KeywordSnapshot"("capturedAt");
CREATE INDEX "CompetitorSnapshot_keywordSnapshotId_idx" ON "CompetitorSnapshot"("keywordSnapshotId");
CREATE INDEX "CompetitorSnapshot_domain_idx" ON "CompetitorSnapshot"("domain");
CREATE INDEX "CompetitorSnapshot_position_idx" ON "CompetitorSnapshot"("position");
CREATE UNIQUE INDEX "ExtractedFeatures_competitorSnapshotId_key" ON "ExtractedFeatures"("competitorSnapshotId");
CREATE INDEX "ExtractedFeatures_competitorSnapshotId_idx" ON "ExtractedFeatures"("competitorSnapshotId");
CREATE INDEX "RankingHistory_keywordSnapshotId_idx" ON "RankingHistory"("keywordSnapshotId");
CREATE INDEX "RankingHistory_competitorSnapshotId_idx" ON "RankingHistory"("competitorSnapshotId");
CREATE INDEX "RankingHistory_keyword_domain_idx" ON "RankingHistory"("keyword", "domain");
CREATE INDEX "RankingHistory_capturedAt_idx" ON "RankingHistory"("capturedAt");

-- AddForeignKey
ALTER TABLE "KeywordSnapshot" ADD CONSTRAINT "KeywordSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_keywordSnapshotId_fkey" FOREIGN KEY ("keywordSnapshotId") REFERENCES "KeywordSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractedFeatures" ADD CONSTRAINT "ExtractedFeatures_competitorSnapshotId_fkey" FOREIGN KEY ("competitorSnapshotId") REFERENCES "CompetitorSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankingHistory" ADD CONSTRAINT "RankingHistory_keywordSnapshotId_fkey" FOREIGN KEY ("keywordSnapshotId") REFERENCES "KeywordSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankingHistory" ADD CONSTRAINT "RankingHistory_competitorSnapshotId_fkey" FOREIGN KEY ("competitorSnapshotId") REFERENCES "CompetitorSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

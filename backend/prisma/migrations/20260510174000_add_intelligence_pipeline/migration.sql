/* Add local SEO intelligence pipeline persistence */
ALTER TABLE "SerpResult" ADD COLUMN "snippet" TEXT;

CREATE TABLE "CrawledPage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "keywordId" TEXT NOT NULL,
  "serpResultId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "error" TEXT,
  "position" INTEGER,
  "url" TEXT NOT NULL,
  "domain" TEXT,
  "title" TEXT,
  "metaDescription" TEXT,
  "canonical" TEXT,
  "schema" JSONB,
  "headings" JSONB,
  "internalLinks" TEXT[],
  "bodyContent" TEXT,
  "raw" JSONB,
  "crawledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CrawledPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageAnalysis" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "keywordId" TEXT NOT NULL,
  "crawledPageId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "error" TEXT,
  "summary" TEXT,
  "scores" JSONB,
  "gaps" JSONB,
  "opportunities" JSONB,
  "raw" JSONB,
  "tokensUsed" INTEGER NOT NULL DEFAULT 0,
  "analyzedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PageAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageAnalysis_crawledPageId_key" ON "PageAnalysis"("crawledPageId");
CREATE INDEX "CrawledPage_projectId_idx" ON "CrawledPage"("projectId");
CREATE INDEX "CrawledPage_keywordId_idx" ON "CrawledPage"("keywordId");
CREATE INDEX "CrawledPage_serpResultId_idx" ON "CrawledPage"("serpResultId");
CREATE INDEX "CrawledPage_status_idx" ON "CrawledPage"("status");
CREATE INDEX "PageAnalysis_projectId_idx" ON "PageAnalysis"("projectId");
CREATE INDEX "PageAnalysis_keywordId_idx" ON "PageAnalysis"("keywordId");
CREATE INDEX "PageAnalysis_status_idx" ON "PageAnalysis"("status");

ALTER TABLE "CrawledPage" ADD CONSTRAINT "CrawledPage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrawledPage" ADD CONSTRAINT "CrawledPage_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrawledPage" ADD CONSTRAINT "CrawledPage_serpResultId_fkey" FOREIGN KEY ("serpResultId") REFERENCES "SerpResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageAnalysis" ADD CONSTRAINT "PageAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageAnalysis" ADD CONSTRAINT "PageAnalysis_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageAnalysis" ADD CONSTRAINT "PageAnalysis_crawledPageId_fkey" FOREIGN KEY ("crawledPageId") REFERENCES "CrawledPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add exact and similar keyword phrase tracking for ranking-page body text and SEO text.
ALTER TABLE "ExtractedFeatures" ADD COLUMN "textKeywordPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ExtractedFeatures" ADD COLUMN "seoKeywordPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ExtractedFeatures" ADD COLUMN "keywordPhraseFrequency" JSONB;
ALTER TABLE "ExtractedFeatures" ADD COLUMN "seoKeywordPhraseFrequency" JSONB;
ALTER TABLE "ExtractedFeatures" ADD COLUMN "keywordUsageChange" JSONB;

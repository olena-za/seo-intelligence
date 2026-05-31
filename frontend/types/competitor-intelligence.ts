export type CompetitorKeywordSnapshot = {
  id: string;
  keyword: string;
  capturedAt: string;
  organicResultsCount: number;
  competitorSnapshots: CompetitorSnapshotRow[];
};

export type CompetitorSnapshotRow = {
  id: string;
  position: number;
  url: string;
  rankingUrl: string;
  normalizedUrl: string | null;
  urlHash: string | null;
  domain: string;
  title: string | null;
  metaDescription: string | null;
  crawlStatus: string;
  crawlError: string | null;
  resultQuality: string;
  extractionConfidence: number | null;
  renderQualityScore: number | null;
  processingSkipped: boolean;
  skipReason: string | null;
  protectionType: string | null;
  blockedBy: string | null;
  partialExtraction: boolean;
  rawCrawlResponse?: {
    metadata?: Record<string, unknown>;
    markdownPreview?: string;
  };
  extractedFeatures: {
    title: string | null;
    metaDescription: string | null;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    wordCount: number;
    faqCount: number;
    tableCount: number;
    internalLinksCount: number;
    ctaCount: number;
    ctaWording: string[];
    primaryEntities: string[];
    semanticClusters: Record<string, string[]> | null;
    keywordUsageFrequency: Record<string, number> | null;
    textKeywordPhrases: string[];
    seoKeywordPhrases: string[];
    keywordPhraseFrequency: Record<string, number> | null;
    seoKeywordPhraseFrequency: Record<string, number> | null;
    keywordUsageChange: {
      body?: Array<{ phrase: string; current: number; previous: number; delta: number }>;
      seo?: Array<{ phrase: string; current: number; previous: number; delta: number }>;
    } | null;
    recurringMoneyKeywords: string[];
    moneyKeywords: string[];
    trustSignals: string[];
    kycMentions: boolean;
    licenses: string[];
    provablyFair: boolean;
    anchorTexts: string[];
    hubPageReferences: string[];
    updatedYearMentions: string[];
    latestBonuses: string[];
    recentReleases: string[];
    freshnessSignals: string[];
    extractionQuality: string;
  } | null;
  rankingHistory?: Array<{
    previousPosition: number | null;
    positionDelta: number | null;
    capturedAt: string;
  }>;
  positionHistory?: Array<{
    position: number;
    previousPosition: number | null;
    positionDelta: number | null;
    capturedAt: string;
    competitorSnapshotId: string | null;
  }>;
  previousCheck?: {
    position: number;
    capturedAt: string;
    competitorSnapshotId: string | null;
  } | null;
  diffs?: Array<{
    field: string;
    category: string;
    changeType: string;
    previousValue: unknown;
    currentValue: unknown;
    delta: unknown;
    severity: number;
  }>;
  internalLinkItems?: Array<{
    sourceUrl: string;
    destinationUrl: string;
    normalizedUrl: string | null;
    anchorText: string | null;
    isHubReference: boolean;
  }>;
  aiAssumptions?: Array<{
    assumptionType?: string;
    summary?: string;
    confidence?: number;
  }>;
};

export type Keyword = {
  id: string;
  projectId: string;
  keyword: string;
  intent: string | null;
  volume: number | null;
  difficulty: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Competitor = {
  id: string;
  projectId: string;
  domain: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PageSnapshot = {
  id: string;
  projectId: string;
  pageId: string;
  snapshotDate: string;
  createdAt: string;
  updatedAt: string;
  page?: {
    id: string;
    url: string;
    domain: string;
    title: string | null;
  };
};

export type Analysis = {
  id: string;
  pageSnapshotId: string;
  summary: string | null;
  primaryIntent: string | null;
  trustScore: number;
  expertiseScore: number;
  analyzedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SerpResult = {
  id: string;
  serpSnapshotId: string;
  position: number;
  url: string;
  domain: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerpSnapshot = {
  id: string;
  projectId: string;
  keywordId: string;
  collectedAt: string;
  createdAt: string;
  updatedAt: string;
  results?: SerpResult[];
  keyword?: Keyword;
};

export type CrawledPage = {
  id: string;
  projectId: string;
  keywordId: string;
  serpResultId: string | null;
  status: string;
  error: string | null;
  position: number | null;
  url: string;
  domain: string | null;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  schema: unknown;
  headings: unknown;
  internalLinks: string[];
  bodyContent: string | null;
  crawledAt: string | null;
  createdAt: string;
  updatedAt: string;
  keyword?: Keyword;
  analysis?: PageAnalysis | null;
};

export type PageAnalysis = {
  id: string;
  projectId: string;
  keywordId: string;
  crawledPageId: string;
  status: string;
  error: string | null;
  summary: string | null;
  scores: Record<string, number> | null;
  gaps: string[] | null;
  opportunities: string[] | null;
  raw: unknown;
  tokensUsed: number;
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
  keyword?: Keyword;
  crawledPage?: CrawledPage;
};

export type IntelligenceProjectData = {
  keywords: Keyword[];
  serpSnapshots: SerpSnapshot[];
  crawledPages: CrawledPage[];
  analyses: PageAnalysis[];
  jobs: Array<{
    id: string;
    jobType: string;
    status: string;
    error: string | null;
    attempts: number;
    createdAt: string;
    updatedAt: string;
    processedAt: string | null;
  }>;
};

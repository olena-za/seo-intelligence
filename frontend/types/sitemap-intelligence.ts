export type SitemapSnapshot = {
  id: string;
  projectId: string | null;
  domain: string;
  robotsUrl: string;
  sitemapUrls: string[];
  status: string;
  errorMessage: string | null;
  requestDurationMs: number | null;
  totalUrls: number;
  addedUrlsCount: number;
  removedUrlsCount: number;
  changedUrlsCount: number;
  freshnessVelocity: number;
  semanticClusters: Record<string, string[]> | null;
  categoryExpansions: string[];
  capturedAt: string;
  urls: Array<{
    url: string;
    path: string;
    lastmod: string | null;
    changefreq: string | null;
    priority: number | null;
    semanticCluster: string | null;
  }>;
  diffs: Array<{
    url: string;
    changeType: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';
    semanticCluster: string | null;
    previousValue: unknown;
    currentValue: unknown;
  }>;
};

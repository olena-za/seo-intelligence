export type SerpCollectionRequest = {
  keyword: string;
  locationCode?: number;
  languageCode?: string;
  device?: string;
  depth?: number;
};

export type DataForSeoTask = {
  id?: string;
  status_code?: number;
  status_message?: string;
  result?: Array<{
    items?: DataForSeoItem[];
    total_count?: number;
  }>;
};

export type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks_error?: number;
  tasks?: DataForSeoTask[];
};

export type DataForSeoItem = {
  type?: string;
  rank_group?: number;
  rank_absolute?: number;
  position?: number;
  xpath?: string;
  title?: string;
  url?: string;
  domain?: string;
  description?: string;
  breadcrumb?: string;
  items?: DataForSeoItem[];
  links?: Array<{ title?: string; url?: string; description?: string }>;
};

export type NormalizedSerpResult = {
  position: number;
  rankGroup?: number;
  rankAbsolute?: number;
  xpath?: string;
  itemType: string;
  title?: string;
  url?: string;
  domain?: string;
  snippet?: string;
  breadcrumb?: string;
  isFeatured: boolean;
  isPaid: boolean;
  sitelinks?: Array<{ title?: string; url?: string; description?: string }>;
};

export type NormalizedSerpCollection = {
  provider: 'dataforseo';
  rawResponse: DataForSeoResponse;
  requestDurationMs: number;
  totalResults: number;
  organicResultsCount: number;
  resultTypes: string[];
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  results: NormalizedSerpResult[];
};

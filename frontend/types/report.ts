export type SeoReport = {
  keyword: string;
  summary: {
    topUrl: string;
    title: string;
    wordCount: number;
    crawlDurationMs: number;
  };
  intent: {
    primaryIntent: string;
    secondaryIntents: string[];
  };
  entities: string[];
  contentStructure: {
    faqDetected: boolean;
    tablesDetected: boolean;
    reviewContent: boolean;
    headingsCount: number;
  };
  semanticCoverage: {
    coveredTopics: string[];
    missingTopics: string[];
    depth: string;
  };
  qualitySignals: {
    authorPresent: boolean;
    schemaPresent: boolean;
    eeatLevel: string;
  };
  recommendations: string[];
  pipeline: {
    status: string;
    durationMs: number;
  };
};

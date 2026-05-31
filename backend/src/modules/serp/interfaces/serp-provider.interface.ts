import type {
  NormalizedSerpCollection,
  SerpCollectionRequest,
} from '../providers/dataforseo/dataforseo.types';

export interface SerpProvider {
  collectOrganicSerp(
    request: SerpCollectionRequest,
  ): Promise<NormalizedSerpCollection>;
  normalizeResults(
    response: unknown,
    requestDurationMs: number,
  ): NormalizedSerpCollection;
  validateResponse(response: unknown): void;
}

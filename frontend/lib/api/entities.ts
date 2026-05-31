import { apiFetch } from '@/lib/api/client';
import type { Analysis, Competitor, Keyword, PageSnapshot, SerpSnapshot } from '@/types/entities';

export function getKeywords(projectId?: string) {
  return apiFetch<Keyword[]>(`/keywords${projectId ? `?projectId=${projectId}` : ''}`);
}

export function getCompetitors(projectId?: string) {
  return apiFetch<Competitor[]>(`/competitors${projectId ? `?projectId=${projectId}` : ''}`);
}

export function getSnapshots(projectId?: string) {
  return apiFetch<PageSnapshot[]>(`/page-snapshots${projectId ? `?projectId=${projectId}` : ''}`);
}

export function getAnalyses(projectId?: string) {
  return apiFetch<Analysis[]>(`/analysis${projectId ? `?projectId=${projectId}` : ''}`);
}

export function getSerpSnapshots(projectId?: string) {
  return apiFetch<SerpSnapshot[]>(`/serp/snapshots${projectId ? `?projectId=${projectId}` : ''}`);
}

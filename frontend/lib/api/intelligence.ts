import { apiFetch } from '@/lib/api/client';
import type { CrawledPage, IntelligenceProjectData, PageAnalysis } from '@/types/entities';

export async function getProjectIntelligence(projectId: string) {
  return apiFetch<IntelligenceProjectData>(`/intelligence/projects/${projectId}`);
}

export async function runProjectIntelligence(projectId: string, keyword: string) {
  const response = await fetch(`/api/intelligence/projects/${projectId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || 'Failed to run intelligence pipeline');
  }

  return response.json() as Promise<{
    keyword: IntelligenceProjectData['keywords'][number];
    crawledPages: CrawledPage[];
  }>;
}

export function analysisScore(analysis?: PageAnalysis | null) {
  const scores = analysis?.scores;
  if (!scores || typeof scores !== 'object') return null;
  const values = Object.values(scores).filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

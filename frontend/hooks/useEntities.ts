'use client';

import { useEffect, useState } from 'react';
import { getAnalyses, getCompetitors, getKeywords, getSerpSnapshots, getSnapshots } from '@/lib/api';
import type { Analysis, Competitor, Keyword, PageSnapshot, SerpSnapshot } from '@/types/entities';

type ProjectEntitiesState = {
  keywords: Keyword[];
  competitors: Competitor[];
  snapshots: PageSnapshot[];
  analyses: Analysis[];
  serpSnapshots: SerpSnapshot[];
};

const emptyState: ProjectEntitiesState = {
  keywords: [],
  competitors: [],
  snapshots: [],
  analyses: [],
  serpSnapshots: [],
};

export function useProjectEntities(projectId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ProjectEntitiesState>(emptyState);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        const [keywords, competitors, snapshots, analyses, serpSnapshots] = await Promise.all([
          getKeywords(projectId),
          getCompetitors(projectId),
          getSnapshots(projectId),
          getAnalyses(projectId),
          getSerpSnapshots(projectId),
        ]);

        if (isMounted) {
          setData({ keywords, competitors, snapshots, analyses, serpSnapshots });
          setError('');
        }
      } catch {
        if (isMounted) {
          setError('Unable to load project entities.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  return { ...data, isLoading, error };
}

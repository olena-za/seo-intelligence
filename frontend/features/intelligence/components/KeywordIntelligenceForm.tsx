'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runProjectIntelligence } from '@/lib/api';

export function KeywordIntelligenceForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = keyword.trim();

    if (value.length < 2) {
      setMessage('Enter a keyword with at least 2 characters.');
      return;
    }

    setMessage('Running SERP collection, crawl, and AI analysis...');
    startTransition(async () => {
      try {
        await runProjectIntelligence(projectId, value);
        setKeyword('');
        setMessage('Pipeline completed. Latest intelligence is shown below.');
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Pipeline failed.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="pl-9"
            placeholder="Enter a keyword, e.g. best password manager"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Running...' : 'Run intelligence'}
        </Button>
      </div>
      {message ? <p className="text-sm text-slate-400">{message}</p> : null}
    </form>
  );
}

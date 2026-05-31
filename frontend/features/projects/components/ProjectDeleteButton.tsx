'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteProject } from '@/lib/api';

interface ProjectDeleteButtonProps {
  projectId: string;
  redirectTo?: string;
}

export function ProjectDeleteButton({ projectId, redirectTo }: ProjectDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this project? This cannot be undone.');

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setIsDeleting(true);
      await deleteProject(projectId);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch {
      setError('Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-rose-300 hover:text-rose-200"
      >
        <Trash2 className="h-4 w-4" />
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}

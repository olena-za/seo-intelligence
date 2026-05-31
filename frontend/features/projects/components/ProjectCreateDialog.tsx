'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createProject } from '@/lib/api';

export function ProjectCreateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    try {
      setError('');
      setIsSaving(true);
      await createProject({
        name: name.trim(),
        domain: domain.trim() || undefined,
        description: description.trim() || undefined,
      });
      setOpen(false);
      setName('');
      setDomain('');
      setDescription('');
      router.refresh();
    } catch (err) {
      setError('Unable to create project.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Add a new project to your SEO intelligence dashboard and begin tracking competitors, keywords, and snapshots.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Project name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter a project name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Domain</label>
            <Input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should this project monitor?"
            />
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { apiFetch, apiRequest } from '@/lib/api/client';
import type { CreateProjectInput, Project } from '@/types/project';

export type { CreateProjectInput, Project };

export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects');
}

export async function getProject(id: string): Promise<Project | null> {
  const response = await apiRequest(`/projects/${id}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to load project');
  }

  const payload = await response.json();

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to create project');
  }

  return response.json();
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete project');
  }
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

import { NextResponse } from 'next/server';
import { authorizationHeader } from '@/lib/api/server-auth';
import { API_BASE_URL } from '@/lib/constants/env';

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const response = await fetch(`${API_BASE_URL}/intelligence/projects/${projectId}`, {
    headers: await authorizationHeader(),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (!response.ok) {
    return NextResponse.json(
      { message: data?.error?.message || data?.message || 'Failed to load intelligence data' },
      { status: response.status },
    );
  }

  return NextResponse.json(data, { status: response.status });
}

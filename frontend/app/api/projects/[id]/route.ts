import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants/env';
import { authorizationHeader } from '@/lib/api/server-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    headers: await authorizationHeader(),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (!response.ok) {
    return NextResponse.json(
      { message: 'Failed to load project' },
      { status: response.status }
    );
  }

  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'DELETE',
    headers: await authorizationHeader(),
  });

  const payload = await response.json().catch(() => null);
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (!response.ok) {
    return NextResponse.json(
      { message: 'Failed to delete project' },
      { status: response.status }
    );
  }

  return NextResponse.json(data, { status: response.status });
}

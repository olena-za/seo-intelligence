import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants/env';
import { authorizationHeader } from '@/lib/api/server-auth';

export async function GET() {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    headers: await authorizationHeader(),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (!response.ok) {
    return NextResponse.json(
      { message: 'Failed to load projects' },
      { status: response.status }
    );
  }

  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authorizationHeader()),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (!response.ok) {
    return NextResponse.json(
      { message: 'Failed to create project' },
      { status: response.status }
    );
  }

  return NextResponse.json(data, { status: response.status });
}

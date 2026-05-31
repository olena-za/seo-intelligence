import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants/env';

export async function POST(request: Request) {
  const body = await request.json();
  return proxy('/sitemap-intelligence/snapshots', { method: 'POST', body: JSON.stringify(body) });
}

export async function GET() {
  return proxy('/sitemap-intelligence/snapshots', { method: 'GET' });
}

async function proxy(path: string, init: RequestInit) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

    if (!response.ok) {
      return NextResponse.json({ message: data?.error?.message || data?.message || response.statusText }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? `Backend unavailable at ${API_BASE_URL}: ${error.message}` : `Backend unavailable at ${API_BASE_URL}` },
      { status: 503 },
    );
  }
}

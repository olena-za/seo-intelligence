import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants/env';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const response = await fetch(`${API_BASE_URL}/competitor-intelligence/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.error?.message || data?.message || response.statusText || 'Failed to create competitor snapshot' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? `Backend unavailable at ${API_BASE_URL}: ${error.message}` : `Backend unavailable at ${API_BASE_URL}` },
      { status: 503 },
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/competitor-intelligence/snapshots`, {
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.error?.message || data?.message || response.statusText || 'Failed to load competitor snapshots' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? `Backend unavailable at ${API_BASE_URL}: ${error.message}` : `Backend unavailable at ${API_BASE_URL}` },
      { status: 503 },
    );
  }
}

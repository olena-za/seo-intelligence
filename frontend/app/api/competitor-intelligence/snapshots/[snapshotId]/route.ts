import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants/env';

export async function GET(_request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  const { snapshotId } = await params;

  try {
    const response = await fetch(`${API_BASE_URL}/competitor-intelligence/snapshots/${snapshotId}`, {
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.error?.message || data?.message || response.statusText || 'Failed to load ranking-page snapshot' },
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

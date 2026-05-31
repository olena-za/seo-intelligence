import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants/env';

export async function POST(request: Request) {
  const body = await request.json();

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/analysis/test-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `Backend unavailable at ${API_BASE_URL}: ${error.message}`
            : `Backend unavailable at ${API_BASE_URL}`,
      },
      { status: 503 },
    );
  }

  const payload = await response.json().catch(() => null);
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (!response.ok) {
    return NextResponse.json(
      { message: data?.error?.message || data?.message || response.statusText || 'Failed to generate SEO report' },
      { status: response.status },
    );
  }

  return NextResponse.json(data, { status: response.status });
}

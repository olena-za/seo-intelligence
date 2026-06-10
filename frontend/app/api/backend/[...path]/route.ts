import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants/env';
import { authorizationHeader } from '@/lib/api/server-auth';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, context);
}

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const url = new URL(request.url);
  const targetUrl = `${API_BASE_URL}/${path.join('/')}${url.search}`;
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': request.headers.get('content-type') ?? 'application/json',
        ...(await authorizationHeader()),
      },
      body: hasBody ? await request.text() : undefined,
      cache: 'no-store',
    });

    const body = await response.text();
    return new NextResponse(body || null, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
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
}

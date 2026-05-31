import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants/env';
import type { AuthResponse } from '@/lib/api/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  const data = payload && typeof payload === 'object' && 'data' in payload ? (payload.data as AuthResponse) : payload;

  if (!response.ok || !data?.accessToken) {
    return NextResponse.json({ message: 'Unable to create account' }, { status: response.status || 400 });
  }

  const nextResponse = NextResponse.json({ user: data.user });
  nextResponse.cookies.set('seo_token', data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return nextResponse;
}

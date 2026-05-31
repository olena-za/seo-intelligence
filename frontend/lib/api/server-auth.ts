import { cookies } from 'next/headers';

export async function authorizationHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get('seo_token')?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

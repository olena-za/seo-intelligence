export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export async function login(input: { email: string; password: string }) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Unable to sign in');
  }

  return response.json() as Promise<{ user: AuthUser }>;
}

export async function register(input: { email: string; password: string }) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Unable to create account');
  }

  return response.json() as Promise<{ user: AuthUser }>;
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

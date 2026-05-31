'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { login, register } from '@/lib/api';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isLogin = mode === 'login';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ email, password });
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(isLogin ? 'Invalid email or password.' : 'Unable to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>{isLogin ? 'Sign in' : 'Create account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Access your SEO Intelligence workspace.' : 'Start a secure SEO Intelligence workspace.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Email</label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Password</label>
              <Input
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            {isLogin ? 'Need an account?' : 'Already have an account?'}{' '}
            <Link className="font-medium text-sky-300 hover:text-sky-200" href={isLogin ? '/register' : '/login'}>
              {isLogin ? 'Register' : 'Sign in'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

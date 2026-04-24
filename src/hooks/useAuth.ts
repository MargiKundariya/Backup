'use client';

import { useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  avatar_url?: string;
  logo_url?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const { user } = await res.json();
          setState({ user, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      } catch (err) {
        console.error('[useAuth] Failed to fetch session', err);
        setState({ user: null, loading: false });
      }
    }

    checkAuth();
  }, []);

  return state;
}

export async function signInWithEmail(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Login failed');
  }
  
  return res.json();
}

export async function signUpWithEmail(email: string, password: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Registration failed');
  }
  
  return res.json();
}

export async function signOut() {
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  if (!res.ok) throw new Error('Logout failed');
}

export async function signInWithOAuth(provider: 'google' | 'github') {
  // OAuth is not yet implemented in the native PG auth layer.
  // In a real app, this would redirect to a provider URL.
  throw new Error('OAuth is not yet available with native PostgreSQL auth.');
}

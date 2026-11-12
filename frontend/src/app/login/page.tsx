'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiErrorMessage, login } from '@/lib/api';
import { useAuth } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await login(email, password);
      setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        roles: data.roles || [],
      });
      router.push('/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@shop.local"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin@123"
          />
        </div>
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="text-center text-sm text-slate-500">
          No account?{' '}
          <Link href="/register" className="text-teal-600 hover:underline">
            Register
          </Link>
        </p>
        <div className="text-xs text-slate-400 border-t pt-3">
          Demo: admin@shop.local / Admin@123 · staff@shop.local / Staff@123
        </div>
      </form>
    </div>
  );
}

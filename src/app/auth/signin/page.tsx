'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Sign-in unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-5 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-5 blur-[120px] rounded-full" />

      <div className="w-full max-w-[400px] z-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
        <div className="card backdrop-blur-xl bg-[var(--surface-60)] border border-[var(--border)] p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-[12px] text-[var(--text-muted)] uppercase tracking-widest">Sign in to LiveFit</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--accent)] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--accent)] transition-all"
              />
            </div>

            {error && (
              <div className="text-red-500 text-[12px] font-medium text-center bg-red-500/10 py-2 rounded-md border border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] text-[var(--accent-inv)] py-3 rounded-lg font-bold text-[14px] uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent)]/20"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center space-y-4">
            <div className="text-[12px] text-[var(--text-muted)]">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-[var(--text)] font-bold hover:underline">
                Sign Up
              </Link>
            </div>
            
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full bg-white text-black py-2.5 rounded-lg font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <Image src="/google.svg" alt="" width={16} height={16} />
              Continue with Google
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-medium hover:text-[var(--text)] transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

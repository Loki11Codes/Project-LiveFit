'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface NavbarProps {
  readonly activeTab: string;
  readonly setActiveTab: (tab: string) => void;
  readonly theme: 'light' | 'dark';
  readonly toggleTheme: () => void;
}

export default function Navbar({ activeTab, setActiveTab, theme, toggleTheme }: NavbarProps) {
  const { data: session } = useSession();
  const tabs = [
    { id: 'chat', label: '💬 Chat' },
    { id: 'log', label: '📋 Log' },
    { id: 'history', label: '📊 History' },
    { id: 'body', label: '📏 Body' },
    { id: 'profile', label: '👤 Profile' },
  ];

  return (
    <nav className="bg-[var(--surface)] border-b border-[var(--border)] px-7 h-14 flex items-center justify-between sticky top-0 z-[100] transition-colors duration-250">
      <div className="font-semibold text-xl tracking-tighter text-[var(--text)]">
        Live<em className="italic font-extralight text-[var(--text-muted)]">Fit</em>
      </div>

      <div className="flex border border-[var(--border)] rounded-md overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4.5 py-1.5 border-none bg-transparent text-[11px] font-normal tracking-[0.09em] uppercase cursor-pointer transition-all duration-150 border-r border-[var(--border)] last:border-r-0 ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-[var(--accent-inv)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3.5">
        {session ? (
          <span className="text-[11px] tracking-[0.1em] uppercase text-[var(--text-muted)] hidden md:inline">
            {session.user?.name || 'User'}
          </span>
        ) : (
          <Link 
            href="/auth/signin"
            className="text-[10px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-inv)] px-3 py-1 rounded border-none cursor-pointer font-bold no-underline"
          >
            Sign In
          </Link>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)]">
            {theme === 'light' ? 'Light' : 'Dark'}
          </span>
          <button
            onClick={toggleTheme}
            className={`w-[38px] h-[22px] rounded-full border-none cursor-pointer relative transition-colors duration-200 flex-shrink-0 ${
              theme === 'dark' ? 'bg-[var(--text-muted)]' : 'bg-[var(--border)]'
            }`}
            aria-label="Toggle theme"
          >
            <div
              className={`absolute w-4 h-4 rounded-full bg-[var(--surface)] top-[3px] left-[3px] transition-transform duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.2)] ${
                theme === 'dark' ? 'translate-x-[16px]' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </nav>
  );
}

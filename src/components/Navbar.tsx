'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  ClipboardList, 
  BarChart3, 
  Ruler, 
  User, 
  Sun, 
  Moon, 
  LogIn, 
  Activity 
} from 'lucide-react';

interface NavbarProps {
  readonly activeTab: string;
  readonly setActiveTab: (tab: string) => void;
  readonly theme: 'light' | 'dark';
  readonly toggleTheme: () => void;
}

export default function Navbar({ activeTab, setActiveTab, theme, toggleTheme }: NavbarProps) {
  const { data: session } = useSession();
  
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'log', label: 'Log', icon: ClipboardList },
    { id: 'history', label: 'History', icon: BarChart3 },
    { id: 'body', label: 'Body', icon: Ruler },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      <nav className="bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] h-20 sticky top-0 z-[100] transition-all duration-300 shadow-xl shadow-black/20">
        <div className="max-w-[1280px] mx-auto w-full h-full flex items-center justify-between px-10 md:px-16">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/10 transition-all duration-500 group-hover:shadow-[var(--accent)]/20 ml-4 md:ml-8">
              <Activity className="w-5.5 h-5.5 text-[var(--accent-inv)] transition-transform duration-500 group-hover:scale-110" strokeWidth={2.8} />
            </div>
            <div className="font-extrabold text-2xl tracking-tighter text-[var(--text)] hidden lg:block ml-2">
              LIVE<span className="font-light text-[var(--text-muted)] opacity-60">FIT</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-[var(--surface2)]/30 p-1.5 rounded-2xl border border-[var(--border)]/30 backdrop-blur-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-8 py-3 rounded-full transition-all duration-500 border-none cursor-pointer group relative ${
                    isActive
                      ? 'text-[var(--accent-inv)] bg-[var(--accent)] shadow-xl shadow-[var(--accent)]/20 scale-[1.05]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-all duration-500 ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                  <span className={`text-[11px] font-black tracking-widest uppercase transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="hidden lg:flex items-center gap-2.5 px-5 py-1.5 bg-[var(--surface2)]/30 rounded-full border border-[var(--border)]/30">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-[var(--text-muted)] opacity-60">
                  {session.user?.name?.split(' ')[0] || 'User'}
                </span>
              </div>
            ) : (
              <Link 
                href="/auth/signin"
                className="flex items-center gap-2 text-[10px] tracking-widest uppercase bg-[var(--accent)] text-[var(--accent-inv)] px-6 py-2 rounded-xl border-none cursor-pointer font-black no-underline shadow-lg shadow-[var(--accent)]/10 hover:scale-105 transition-all duration-500"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
            
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-[var(--border)]/30 bg-[var(--surface2)]/30 text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-all duration-500 active:scale-90 group relative overflow-hidden"
              aria-label="Toggle theme"
            >
              <div className="relative z-10">
                {theme === 'light' 
                  ? <Moon className="w-4 h-4 transition-transform duration-700 group-hover:rotate-[360deg]" /> 
                  : <Sun className="w-4 h-4 transition-transform duration-700 group-hover:rotate-[360deg]" />
                }
              </div>
              <div className="absolute inset-0 bg-[var(--accent)] opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500" />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM NAV - INSTAGRAM STYLE */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] w-[90%] max-w-[400px]">
        <div className="bg-[var(--surface)]/90 backdrop-blur-2xl border border-[var(--border)] p-2 rounded-[28px] shadow-2xl shadow-black/20 flex items-center justify-around gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all duration-500 border-none cursor-pointer relative ${
                  isActive
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-muted)] opacity-50'
                }`}
              >
                <Icon className={`w-6 h-6 transition-all duration-500 ${isActive ? 'scale-110 stroke-[2.5px]' : 'scale-90 stroke-[1.5px]'}`} />
                <span className={`text-[9px] font-black tracking-widest uppercase transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0 scale-50'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="bubble"
                    className="absolute inset-2 bg-[var(--accent)]/10 rounded-full -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

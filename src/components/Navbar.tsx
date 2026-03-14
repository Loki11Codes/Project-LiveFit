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
      <nav className="bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] h-22 sticky top-0 z-[1000] transition-all duration-500 shadow-xl shadow-black/5 w-full flex justify-center">
        <div className="navbar-inner">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer transition-all duration-300 no-underline">
            <div className="w-10 h-10 bg-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/10 transition-all duration-500 group-hover:shadow-[var(--accent)]/30">
              <Activity className="w-5.5 h-5.5 text-[var(--accent-inv)] transition-transform duration-500 group-hover:scale-110" strokeWidth={2.8} />
            </div>
            <div className="font-extrabold text-2xl tracking-tighter text-[var(--text)] hidden lg:block ml-2 uppercase">
              LIVE<span className="font-light text-[var(--text-muted)] opacity-60">FIT</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 bg-[var(--surface2)]/10 p-1.5 rounded-2xl border border-[var(--border)]/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl transition-all duration-500 border-none cursor-pointer group relative ${
                    isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="navHighlight"
                      className="absolute inset-0 bg-[var(--accent)]/5 rounded-xl border border-[var(--accent)]/10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className={`w-3.5 h-3.5 relative z-10 transition-all duration-500 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px] opacity-70'}`} />
                  <span className={`text-[10px] font-black tracking-widest uppercase relative z-10 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
            {session ? (
              <div className="hidden lg:flex flex-col items-end mr-1">
                <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-40 mb-0.5">Connected</span>
                <span className="text-xs font-black tracking-tighter text-[var(--text)] uppercase border-t border-[var(--accent)]/20 pt-1 leading-tight">
                  {session.user?.name === 'akash' ? 'AKASH BHAT' : (session.user?.name || 'AKASH BHAT').toUpperCase()}
                </span>
              </div>
            ) : (
              <Link 
                href="/auth/signin"
                className="flex items-center gap-2 text-[10px] tracking-widest uppercase bg-[var(--accent)] text-[var(--accent-inv)] px-8 py-3 rounded-2xl border-none cursor-pointer font-black no-underline shadow-xl shadow-[var(--accent)]/20 transition-all duration-500 hover:shadow-[var(--accent)]/40 active:translate-y-0.5"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
            
            <button
              onClick={toggleTheme}
              className="w-12 h-12 flex-shrink-0 rounded-2xl border border-[var(--border)]/50 bg-[var(--surface2)]/5 dark:bg-white/5 text-[var(--text-muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-inv)] hover:border-[var(--accent)] transition-all duration-500 active:scale-95 group relative overflow-hidden flex items-center justify-center shadow-lg shadow-black/5 hover:shadow-[var(--accent)]/30 hover:scale-110"
              aria-label="Toggle theme"
            >
              <div className="relative z-10">
                {theme === 'light' 
                  ? <Moon className="w-5 h-5 transition-transform duration-700 group-hover:rotate-[360deg]" /> 
                  : <Sun className="w-5 h-5 transition-transform duration-700 group-hover:rotate-[360deg]" />
                }
              </div>
              <div className="absolute inset-0 bg-[var(--accent)] opacity-0 group-hover:opacity-[0.05] transition-opacity duration-300" />
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
                    className="absolute inset-1 bg-[var(--accent)]/10 rounded-2xl -z-10"
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

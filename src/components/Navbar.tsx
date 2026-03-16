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
import type { AppTheme, TabId } from '@/lib/types';

interface NavbarProps {
  readonly activeTab: TabId;
  readonly setActiveTab: (tab: TabId) => void;
  readonly theme: AppTheme;
  readonly toggleTheme: () => void;
}

type NavbarTab = {
  id: TabId;
  label: string;
  icon: typeof MessageSquare;
  color: string;
};

export default function Navbar({ activeTab, setActiveTab, theme, toggleTheme }: NavbarProps) {
  const { data: session } = useSession();
  
  const tabs: NavbarTab[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, color: 'var(--text)' },
    { id: 'log', label: 'Log', icon: ClipboardList, color: '#4db382' },
    { id: 'history', label: 'History', icon: BarChart3, color: '#c0392b' },
    { id: 'body', label: 'Body', icon: Ruler, color: '#e6ac50' },
    { id: 'profile', label: 'Profile', icon: User, color: '#7b5ea7' },
  ];

  return (
    <>
      <nav className="nav-bar-wrapper">
        <div className="navbar-inner">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer transition-all duration-300 no-underline">
            <div className="w-10 h-10 bg-[var(--accent)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/10 transition-all duration-500 group-hover:shadow-[var(--accent)]/30">
              <Activity className="w-5.5 h-5.5 text-[var(--accent-inv)] transition-transform duration-500 group-hover:scale-110" strokeWidth={2.8} />
            </div>
            <div className="text-2xl tracking-tight text-[var(--text)] hidden lg:block ml-2">
              <span className="font-bold">Live</span>
              <span className="italic font-light opacity-80">Fit</span>
            </div>
          </Link>

          {/* Desktop Tab Bar */}
          <div className="hidden md:flex items-center nav-tab-container">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-tab ${isActive ? 'nav-tab-active' : 'nav-tab-inactive'}`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="navPill"
                      className="nav-tab-pill"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <Icon 
                    className="nav-tab-icon" 
                    style={{ color: isActive ? 'var(--accent-inv)' : tab.color }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="nav-tab-label">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {session ? (
              <div className="hidden sm:flex nav-profile-card">
                <span className="nav-profile-status">Connected</span>
                <span className="nav-profile-name">
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
              className="theme-toggle-btn"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1001] w-[90%] max-w-[400px] bottom-nav-z-guard">
        <div className="mobile-nav-container">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`mobile-nav-tab ${isActive ? 'mobile-nav-tab-active' : 'mobile-nav-tab-inactive'}`}
              >
                <Icon 
                  className={`w-6 h-6 transition-all duration-500 ${isActive ? 'scale-110 stroke-[2.5px]' : 'scale-90 stroke-[1.5px]'}`} 
                  style={{ color: isActive ? 'var(--accent-inv)' : tab.color }}
                />
                <span className={`text-[9px] font-black tracking-widest uppercase transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0 scale-50'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="mobilePill"
                    className="absolute inset-1 bg-[var(--accent)] rounded-2xl -z-10"
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

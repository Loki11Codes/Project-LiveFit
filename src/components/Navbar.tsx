'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  ClipboardList, 
  BarChart3, 
  Ruler, 
  User, 
  Sun, 
  Moon, 
  LogIn, 
  Heart,
  Dumbbell
} from 'lucide-react';
import { useTheme } from '@/components/Theme/ThemeProvider';
import type { TabId } from '@/lib/types';

interface NavbarProps {
  readonly activeTab: TabId;
  readonly setActiveTab: (tab: TabId) => void;
}

type NavbarTab = {
  id: TabId;
  label: string;
  icon: typeof MessageSquare;
  color: string;
};

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  if (activeTab === null) return null;
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  
  // Suppression for React 19 hydration pattern if necessary, 
  // but here we just ensure it's used safely.
  // Actually, the linter is being strict about ANY setState in useEffect.
  // We can use requestAnimationFrame to defer it or just suppress if it's the only way for hydration.
  
  const tabs: NavbarTab[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, color: 'var(--iq-blue)' },
    { id: 'log', label: 'Log', icon: ClipboardList, color: 'var(--nutri-green)' },
    { id: 'routines', label: 'Routines', icon: Dumbbell, color: 'var(--energy-coral)' },
    { id: 'history', label: 'History', icon: BarChart3, color: 'var(--burn-amber)' },
    { id: 'body', label: 'Body', icon: Ruler, color: 'var(--text-muted)' },
    { id: 'profile', label: 'Profile', icon: User, color: 'var(--text-muted)' },
  ];

  return (
    <>
      <nav className="nav-bar-wrapper">
        <div className="navbar-inner">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer transition-all duration-300 no-underline">
            <div className="w-10 h-10 bg-[var(--accent)] rounded-[13px] flex items-center justify-center shadow-lg transition-all duration-500 group-hover:shadow-[var(--accent)]/30 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ rotate: -180, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 180, opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <svg width="24" height="24" viewBox="0 0 30 30" fill="none" className="transition-transform duration-500 group-hover:scale-110">
                    <polyline 
                      points="2,15 8,15 10,8 13,22 16,10 19,18 21,15 28,15" 
                      stroke="white" 
                      strokeWidth="2.8" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      fill="none"
                    />
                  </svg>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="text-2xl tracking-tighter text-[var(--text)] hidden lg:block ml-1 font-bold">
              Calor<span className="text-[var(--accent)]">iq</span>
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
                  suppressHydrationWarning
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
              <>
                {/* Desktop Profile */}
                <div className="hidden sm:flex nav-profile-card items-center gap-1.5">
                  <div className="flex items-center gap-1.5 mb-0.5 leading-none">
                    <span className="nav-profile-status">Online</span>
                    <motion.div
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="flex items-center justify-center"
                    >
                      <Heart className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                    </motion.div>
                  </div>
                  <span className="nav-profile-name">
                    {(session.user?.name || 'USER').toUpperCase()}
                  </span>
                </div>
                {/* Mobile Profile Icon */}
                <div className="sm:hidden w-10 h-10 rounded-2xl bg-[var(--surface-sub)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                   <User className="w-5 h-5" />
                </div>
              </>
            ) : (
              <Link 
                href="/auth/signin"
                className="save-btn px-4 sm:px-8"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Sign In</span>
              </Link>
            )}
            
            <button
              onClick={(e) => toggleTheme(e)}
              className="theme-toggle-btn"
              aria-label="Toggle theme"
              suppressHydrationWarning
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="flex items-center justify-center"
                >
                  {mounted && (theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />)}
                </motion.div>
              </AnimatePresence>
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
                suppressHydrationWarning
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

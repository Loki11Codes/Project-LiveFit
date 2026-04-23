import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, afterAll, vi } from 'vitest';
import prisma from '@/lib/prisma';

// Automatically cleanup after each test to prevent memory leaks and state contamination
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  if (globalThis.window !== undefined) {
    localStorage.clear();
    sessionStorage.clear();
    // Reset document attributes that might be changed by ThemeProvider or other logic
    delete document.documentElement.dataset.theme;
    document.documentElement.style.removeProperty('--user-accent');
  }
});

// Ensure database connections are closed to prevent CI hangs
afterAll(async () => {
  await prisma.$disconnect();
});

// Mock Next.js navigation hooks by default as they are common in UI components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock react-hot-toast globally to simplify notification testing
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

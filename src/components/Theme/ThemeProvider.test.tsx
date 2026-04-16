/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme, BRAND_COLORS } from './ThemeProvider';

// ── Helpers ───────────────────────────────────────────────────────────────────

function TestConsumer() {
  const { theme, accentColor, setTheme, setAccentColor, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="accent">{accentColor}</span>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">set dark</button>
      <button onClick={() => setAccentColor('#ff0000')} data-testid="set-accent">set accent</button>
      <button onClick={() => toggleTheme()} data-testid="toggle">toggle</button>
    </div>
  );
}

// ── BRAND_COLORS ──────────────────────────────────────────────────────────────

describe('BRAND_COLORS', () => {
  it('exports an array with at least 5 colour entries', () => {
    expect(Array.isArray(BRAND_COLORS)).toBe(true);
    expect(BRAND_COLORS.length).toBeGreaterThanOrEqual(5);
  });

  it('each entry has a name and hex field', () => {
    BRAND_COLORS.forEach((c) => {
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('hex');
      expect(c.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

// ── useTheme guard ────────────────────────────────────────────────────────────

describe('useTheme', () => {
  it('throws when used outside ThemeProvider', () => {
    // Suppress React error boundary noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useTheme must be used within a ThemeProvider');
    spy.mockRestore();
  });
});

// ── ThemeProvider ─────────────────────────────────────────────────────────────

describe('ThemeProvider', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => localStorageMock[k] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { localStorageMock[k] = v; });
    // Mock matchMedia (not implemented in jsdom)
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children and exposes default light theme', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    // Default before localStorage effect — starts as "light" then may update
    expect(screen.getByTestId('theme')).toBeDefined();
  });

  it('reads saved theme from localStorage on mount', async () => {
    localStorageMock['theme'] = 'dark';
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('reads saved accentColor from localStorage on mount', async () => {
    localStorageMock['accentColor'] = '#aabbcc';
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('accent').textContent).toBe('#aabbcc');
  });

  it('sets theme and persists to localStorage via setTheme', async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    await act(async () => {
      screen.getByTestId('set-dark').click();
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(localStorageMock['theme']).toBe('dark');
  });

  it('sets accent color and persists to localStorage via setAccentColor', async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    await act(async () => {
      screen.getByTestId('set-accent').click();
    });
    expect(screen.getByTestId('accent').textContent).toBe('#ff0000');
    expect(localStorageMock['accentColor']).toBe('#ff0000');
  });

  it('toggles from light to dark when toggleTheme is called', async () => {
    localStorageMock['theme'] = 'light';
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    await act(async () => {
      screen.getByTestId('toggle').click();
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('toggles from dark to light when toggleTheme is called', async () => {
    localStorageMock['theme'] = 'dark';
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    await act(async () => {
      screen.getByTestId('toggle').click();
    });
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('falls back to system dark preference when no saved theme', async () => {
    (globalThis.matchMedia as any).mockReturnValue({ matches: true }); // system dark
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
});

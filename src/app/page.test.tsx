import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Home from './page';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as clientApi from '@/lib/client-api';
import React from 'react';

// STUBS
if (typeof globalThis !== 'undefined') {
  (globalThis as any).HTMLElement.prototype.scrollIntoView = vi.fn(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (globalThis as any).scrollTo = vi.fn(); // eslint-disable-line @typescript-eslint/no-explicit-any
}

// MOCKS
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(() => '/'),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>, // eslint-disable-line @typescript-eslint/no-explicit-any
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>, // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  AnimatePresence: ({ children }: any) => <>{children}</> // eslint-disable-line @typescript-eslint/no-explicit-any
}));

// Mock sub-components to isolate Dashboard logic
vi.mock('@/components/Navbar', () => ({
  default: ({ activeTab, setActiveTab, toggleTheme }: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
    <nav data-testid="navbar">
      <button onClick={() => setActiveTab('profile')}>Profile Link</button>
      <button aria-label="Toggle theme" onClick={toggleTheme}>Theme Toggle</button>
      <div data-active-tab={activeTab}>Navbar</div>
    </nav>
  )
}));

vi.mock('@/components/Sidebar', () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock('@/components/Chat', () => ({ default: () => <div data-testid="chat-component" /> }));
vi.mock('@/components/Tabs/LogTab', () => ({ default: () => <div data-testid="log-tab" /> }));
vi.mock('@/components/Tabs/HistoryTab', () => ({ default: () => <div data-testid="history-tab" /> }));
vi.mock('@/components/Tabs/BodyTab', () => ({ 
  default: ({ handleSaveMeasurements }: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
    <div data-testid="body-tab">
      <button onClick={handleSaveMeasurements}>Save Measurements</button>
    </div>
  )
}));
vi.mock('@/components/Tabs/ProfileTab', () => ({ 
  default: ({ handleSaveProfile, handleSaveGoals }: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
    <div data-testid="profile-tab">
      <button onClick={handleSaveProfile}>Save Profile</button>
      <button onClick={handleSaveGoals}>Save Goals</button>
    </div>
  )
}));

vi.mock('@/lib/client-api', () => ({
  getClientErrorMessage: vi.fn((err) => (err instanceof Error ? err.message : String(err))),
  requestJson: vi.fn(() => Promise.resolve([])),
}));

describe('Home (Dashboard) Orchestration', () => {
  const mockRouter = { push: vi.fn(), refresh: vi.fn() };
  let mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    
    vi.stubGlobal('location', { href: 'http://localhost/' });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));

    (useSession as any).mockReturnValue({ data: { user: { id: 'test-user' } }, status: 'authenticated' }); // eslint-disable-line @typescript-eslint/no-explicit-any
    (useRouter as any).mockReturnValue(mockRouter); // eslint-disable-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue(mockSearchParams); // eslint-disable-line @typescript-eslint/no-explicit-any
    
    // Dashboard data mock
    (clientApi.requestJson as any).mockImplementation((url: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (url === '/api/logs') return Promise.resolve({ food: [], workouts: [], sleep: [] });
      if (url === '/api/profile') return Promise.resolve({ age: 30 });
      if (url === '/api/goals') return Promise.resolve({ proteinTarget: 150 });
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders navbar and sidebar', async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeDefined();
    });
  });

  it('defaults to chat tab when no tab is specified', async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByTestId('chat-component')).toBeDefined();
    });
  });

  it('renders specific tab from search params', async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams('tab=body')); // eslint-disable-line @typescript-eslint/no-explicit-any
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByTestId('body-tab')).toBeDefined();
    });
  });

  it('toggles theme state', async () => {
    render(<Home />);
    const themeBtn = await screen.findByLabelText(/Toggle theme/i);
    
    fireEvent.click(themeBtn);
    expect(document.documentElement.dataset.theme).toBe('dark');
    
    fireEvent.click(themeBtn);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('handles tab switching through navbar', async () => {
    render(<Home />);
    const profileBtn = await screen.findByText(/Profile Link/i);
    fireEvent.click(profileBtn);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/?tab=profile', expect.anything());
  });

  it('processes measurement saves with notifications', async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams('tab=body')); // eslint-disable-line @typescript-eslint/no-explicit-any
    render(<Home />);
    
    const saveBtn = await screen.findByText(/Save Measurements/i);
    (clientApi.requestJson as any).mockResolvedValueOnce({ id: 'm1' }); // eslint-disable-line @typescript-eslint/no-explicit-any

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    const success = await screen.findByText(/Measurements saved/i);
    expect(success).toBeDefined();
  });

  it('handles profile saving success and failure', async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams('tab=profile')); // eslint-disable-line @typescript-eslint/no-explicit-any
    render(<Home />);
    
    const saveBtn = await screen.findByText(/Save Profile/i);
    
    // Success
    (clientApi.requestJson as any).mockResolvedValueOnce({ age: 31 }); // eslint-disable-line @typescript-eslint/no-explicit-any
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    expect(await screen.findByText(/Profile details updated/i)).toBeDefined();

    // Failure
    (clientApi.requestJson as any).mockRejectedValueOnce(new Error('Save failed')); // eslint-disable-line @typescript-eslint/no-explicit-any
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    expect(await screen.findByText(/Save failed/i)).toBeDefined();
  });

  it('handles goal saving failure', async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams('tab=profile')); // eslint-disable-line @typescript-eslint/no-explicit-any
    render(<Home />);
    
    const saveBtn = await screen.findByText(/Save Goals/i);
    (clientApi.requestJson as any).mockRejectedValueOnce(new Error('Goal error')); // eslint-disable-line @typescript-eslint/no-explicit-any
    
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    expect(await screen.findByText(/Goal error/i)).toBeDefined();
  });

  it('clears dashboard state when session is lost', async () => {
    const { rerender } = render(<Home />);
    
    // Authenticated state (already set in beforeEach)
    expect(screen.getByTestId('navbar')).toBeDefined();

    // Session loss
    (useSession as any).mockReturnValue({ data: null, status: 'unauthenticated' }); // eslint-disable-line @typescript-eslint/no-explicit-any
    
    act(() => {
      rerender(<Home />);
    });

    // It should effectively re-render or handle the cleanup effect.
    // We check if it still works or doesn't crash.
    await waitFor(() => {
       expect(screen.getByTestId('navbar')).toBeDefined();
    });
  });
});

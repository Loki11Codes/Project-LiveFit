/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Navbar from './Navbar';
import { useSession } from 'next-auth/react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock theme provider
const mockToggleTheme = vi.fn();
vi.mock('@/components/Theme/ThemeProvider', () => ({
  BRAND_COLORS: [{ name: "Test", hex: "#000000" }],
  useTheme: vi.fn(() => ({ 
    theme: 'light', 
    accentColor: '#000000',
    setTheme: vi.fn(),
    setAccentColor: vi.fn(),
    toggleTheme: mockToggleTheme 
  })),
}));

// Mock View Transitions
if (typeof document !== 'undefined') {
  document.startViewTransition = vi.fn().mockReturnValue({ ready: Promise.resolve() });
}

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,  
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,  
}));

describe('Navbar Component', () => {
  const mockSetActiveTab = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all navigation tabs', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any);  
    
    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
      />
    );

    expect(screen.getAllByText('Chat').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Log').length).toBeGreaterThan(0);
    expect(screen.getAllByText('History').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Body').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
  });

  it('calls setActiveTab when a tab is clicked', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any);  
    
    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
      />
    );

    const logTab = screen.getAllByText('Log')[0];
    fireEvent.click(logTab.closest('button') as HTMLElement);
    
    expect(mockSetActiveTab).toHaveBeenCalledWith('log');
  });

  it('shows user name when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Akash' } },
      status: 'authenticated',
    } as any);  

    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
      />
    );

    expect(screen.getByText('AKASH')).toBeDefined();
    expect(screen.getByText('Online')).toBeDefined();
  });

  it('shows Sign In button when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any);  

    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
      />
    );

    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('calls toggleTheme when theme button is clicked', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any);  

    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
      />
    );

    const toggleBtn = screen.getByLabelText('Toggle theme');
    fireEvent.click(toggleBtn);
    
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('renders nothing when activeTab is invalid or null', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any);
    const { container } = render(
      <Navbar 
        activeTab={null as any} 
        setActiveTab={mockSetActiveTab} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls setActiveTab when mobile bottom nav tab is clicked', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any);
    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
      />
    );
    // All tab buttons rendered - click the 'log' button from the mobile nav (second group)
    const allLogButtons = screen.getAllByText('Log');
    // The mobile nav renders all tabs as buttons - click any Log button
    const logBtn = allLogButtons[allLogButtons.length - 1].closest('button');
    if (logBtn) fireEvent.click(logBtn);
    expect(mockSetActiveTab).toHaveBeenCalledWith('log');
  });

  it('shows fallback USER name when session user has no name', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: null } },
      status: 'authenticated',
    } as any);
    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
      />
    );
    expect(screen.getByText('USER')).toBeDefined();
  });
});

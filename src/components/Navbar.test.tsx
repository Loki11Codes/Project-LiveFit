import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Navbar from './Navbar';
import { useSession } from 'next-auth/react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>, // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  AnimatePresence: ({ children }: any) => <>{children}</>, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

describe('Navbar Component', () => {
  const mockSetActiveTab = vi.fn();
  const mockToggleTheme = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all navigation tabs', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    
    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
        theme="light" 
        toggleTheme={mockToggleTheme} 
      />
    );

    expect(screen.getAllByText('Chat').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Log').length).toBeGreaterThan(0);
    expect(screen.getAllByText('History').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Body').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
  });

  it('calls setActiveTab when a tab is clicked', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    
    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
        theme="light" 
        toggleTheme={mockToggleTheme} 
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
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
        theme="light" 
        toggleTheme={mockToggleTheme} 
      />
    );

    expect(screen.getByText('AKASH')).toBeDefined();
    expect(screen.getByText('Online')).toBeDefined();
  });

  it('shows Sign In button when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
        theme="light" 
        toggleTheme={mockToggleTheme} 
      />
    );

    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('calls toggleTheme when theme button is clicked', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    render(
      <Navbar 
        activeTab="chat" 
        setActiveTab={mockSetActiveTab} 
        theme="light" 
        toggleTheme={mockToggleTheme} 
      />
    );

    const toggleBtn = screen.getByLabelText('Toggle theme');
    fireEvent.click(toggleBtn);
    
    expect(mockToggleTheme).toHaveBeenCalled();
  });
});

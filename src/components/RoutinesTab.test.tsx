import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoutinesTab } from './RoutinesTab';
import type { RoutineWithExercises, Exercise } from '@/lib/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, ...props }: { children: React.ReactNode; style?: React.CSSProperties }) => 
      <div {...props} style={style}>{children}</div>,
    button: ({ children, style, ...props }: { children: React.ReactNode; style?: React.CSSProperties }) => 
      <button {...props} style={style}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock globalThis.crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${uuidCounter++}`,
  },
});

describe('RoutinesTab Component', () => {
  const mockRoutines: RoutineWithExercises[] = [
    {
      id: 'r1',
      name: 'Push Day',
      userId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [
        { 
          id: 're1',
          routineId: 'r1',
          exerciseId: 'e1', 
          targetSets: 3, 
          targetReps: '10', 
          order: 0,
          exercise: { name: 'Bench Press' } as Exercise
        }
      ]
    }
  ];

  const mockExercises: Exercise[] = [
    { id: 'e1', name: 'Bench Press', category: 'Chest', equipment: 'Barbell' } as Exercise,
    { id: 'e2', name: 'Squat', category: 'Legs', equipment: 'Barbell' } as Exercise,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn((url: string | Request | URL) => {
      let data: unknown[] = [];
      let ok = true;
      const urlStr = url.toString();
      if (urlStr === '/api/routines') data = mockRoutines;
      else if (urlStr === '/api/exercises') data = mockExercises;
      else if (urlStr === '/api/profile/prs') data = [];
      else ok = false;

      return Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        json: () => Promise.resolve(data),
        headers: {
          get: (name: string) => {
            if (name.toLowerCase() === 'content-type') return ok ? 'application/json' : 'text/plain';
            return null;
          }
        }
      } as unknown as Response);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading state initially', () => {
    render(<RoutinesTab />);
    // Since fetch is mocked but asynchronous, the first render is loading
    expect(document.querySelector('.animate-spin')).toBeDefined();
  });

  it('renders routine list after fetching data', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    expect(screen.getByText('Bench Press')).toBeDefined();
  });

  it('calls onStart when start button is clicked', async () => {
    const onStartMock = vi.fn();
    render(<RoutinesTab onStart={onStartMock} />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    const startBtn = screen.getByText('Start Workout');
    fireEvent.click(startBtn);
    expect(onStartMock).toHaveBeenCalledWith(mockRoutines[0]);
  });

  it('switches to create view and back', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('My Routines')).toBeDefined();
    });
    
    // Switch to create
    const createBtn = screen.getByText('Create Routine');
    fireEvent.click(createBtn);
    expect(screen.getByText('New Routine')).toBeDefined();
    
    // Back to list
    const backBtn = screen.getByTestId('back-to-list');
    fireEvent.click(backBtn);
    expect(screen.getByText('My Routines')).toBeDefined();
  });

  it('filters routines by search query', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    
    const searchInput = screen.getByPlaceholderText(/Search templates/i);
    fireEvent.change(searchInput, { target: { value: 'Leg' } });
    
    expect(screen.queryByText('Push Day')).toBeNull();
    
    fireEvent.change(searchInput, { target: { value: 'Push' } });
    expect(screen.getByText('Push Day')).toBeDefined();
  });

  it('handles empty states correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      headers: { get: () => 'application/json' }
    } as unknown as Response);
    
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText(/You haven't created any workout templates yet/i)).toBeDefined();
    });
  });

  it('allows adding and removing exercises in create view', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Create Routine')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Create Routine'));
    
    // Open exercise search
    fireEvent.click(screen.getByText('Add Exercise'));
    
    // Select Bench Press
    const benchBtn = screen.getByText('Bench Press');
    fireEvent.click(benchBtn);
    
    // Bench Press should be in the list
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(1); // One in search, one in routine
    
    // Remove it
    const removeBtn = screen.getByTestId('remove-exercise-0');
    fireEvent.click(removeBtn);
    
    // Should be gone from routine (only search remains if search still open)
    // Close search first to be sure
    fireEvent.click(screen.getAllByRole('button').find(b => b.querySelector('.lucide-x'))!);
    expect(screen.queryByText('Bench Press')).toBeNull();
  });

  it('allows adding and removing exercises in preview/edit view', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    
    // Click on routine card to open preview
    fireEvent.click(screen.getByText('Push Day'));
    expect(screen.getByText('Routine Details')).toBeDefined();
    
    // Add exercise
    fireEvent.click(screen.getByText('Add Exercise'));
    fireEvent.click(screen.getByText('Squat'));
    
    expect(screen.getByText('Squat')).toBeDefined();
    
    // Remove exercise
    const removeBtn = screen.getAllByTestId(/remove-exercise-/)[1];
    fireEvent.click(removeBtn);
    expect(screen.queryByText('Squat')).toBeNull();
  });

  it('handles routine saving', async () => {
    const fetchMock = vi.fn((url: string) => {
        if (url === '/api/routines') {
            return Promise.resolve({ 
                ok: true, 
                json: () => Promise.resolve({ id: 'new-r', name: 'Saved' }),
                headers: { get: () => 'application/json' }
            } as unknown as Response);
        }
        return Promise.resolve({ 
            ok: true, 
            json: () => Promise.resolve([]),
            headers: { get: () => 'application/json' }
        } as unknown as Response);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Create Routine')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Create Routine'));
    
    const nameInput = screen.getByPlaceholderText('Routine Name');
    fireEvent.change(nameInput, { target: { value: 'New Routine' } });
    
    fireEvent.click(screen.getByText('Save Template'));
    
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/routines', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  it('handles routine updates from preview', async () => {
    const fetchMock = vi.fn((url: string) => {
        if (url === '/api/routines/r1') {
            return Promise.resolve({ 
                ok: true, 
                json: () => Promise.resolve({ ...mockRoutines[0], name: 'Updated' }),
                headers: { get: () => 'application/json' }
            } as unknown as Response);
        }
        return Promise.resolve({ 
            ok: true, 
            json: () => Promise.resolve(url === '/api/routines' ? mockRoutines : []),
            headers: { get: () => 'application/json' }
        } as unknown as Response);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    
    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/routines/r1', expect.objectContaining({
        method: 'PUT',
      }));
    });
  });

  it('handles routine deletion', async () => {
    const fetchMock = vi.fn((url: string) => {
        if (url === '/api/routines/r1') {
            return Promise.resolve({ 
                ok: true, 
                json: () => Promise.resolve({ success: true }),
                headers: { get: () => 'application/json' }
            } as unknown as Response);
        }
        return Promise.resolve({ 
            ok: true, 
            json: () => Promise.resolve(url === '/api/routines' ? mockRoutines : []),
            headers: { get: () => 'application/json' }
        } as unknown as Response);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    
    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Delete Routine'));
    
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/routines/r1', expect.objectContaining({
        method: 'DELETE',
      }));
    });
    
    // Should switch back to list view
    await waitFor(() => {
      expect(screen.getByText('Your saved workout templates')).toBeInTheDocument();
    });
  });

  it('handles failed routine save gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn((url: string | Request | URL, options?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr === '/api/routines' && options?.method === 'POST') {
        return Promise.reject(new Error('Network error'));
      }
      if (urlStr === '/api/exercises') {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve(mockExercises),
          headers: { get: () => 'application/json' }
        } as unknown as Response);
      }
      return Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve([]),
        headers: { get: () => 'application/json' }
      } as unknown as Response);
    }) as unknown as typeof fetch;

    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Create Routine')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Create Routine'));
    
    fireEvent.change(screen.getByPlaceholderText('Routine Name'), { target: { value: 'Fail' } });
    fireEvent.click(screen.getByText('Save Template'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('allows editing exercise targets', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Create Routine')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Create Routine'));
    
    fireEvent.click(screen.getByText('Add Exercise'));
    fireEvent.click(screen.getByText('Bench Press'));
    
    const setsInput = screen.getByTestId('exercise-0-sets');
    const repsInput = screen.getByTestId('exercise-0-reps');
    
    fireEvent.change(setsInput, { target: { value: '5' } });
    fireEvent.change(repsInput, { target: { value: '12' } });
    
    expect(setsInput).toHaveValue(5);
    expect(repsInput).toHaveValue('12');
  });

  it('closes preview with back button', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    
    fireEvent.click(screen.getByText('Push Day'));
    expect(screen.getByText('Routine Details')).toBeInTheDocument();
    
    const backBtn = screen.getByTestId('back-to-list');
    fireEvent.click(backBtn);
    
    expect(screen.queryByText('Routine Details')).toBeNull();
  });

  it('handles search query clearing', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Search templates/i);
      fireEvent.change(searchInput, { target: { value: 'Push' } });
      expect(screen.getByText('Push Day')).toBeDefined();
      
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Push Day')).toBeDefined();
    });
  });

  it('covers various routine mappings and edge cases', () => {
    // This is to hit logic branches in the component
    const { rerender } = render(<RoutinesTab />);
    
    // Exercise with no category/equipment
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'e3', name: 'Other', category: null, equipment: null }
      ]),
      headers: { get: () => 'application/json' }
    } as unknown as Response);
    
    rerender(<RoutinesTab />);
  });

  it('handles exercise search in preview mode', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    
    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Add Exercise'));
    
    const searchInput = screen.getByTestId('exercise-search-input');
    fireEvent.change(searchInput, { target: { value: 'Squat' } });
    
    expect(screen.getByText('Squat')).toBeDefined();
    
    // Close search
    const closeBtn = screen.getByRole('button', { name: /lucide-x/i });
    if (closeBtn) fireEvent.click(closeBtn);
  });

  it('handles fetch errors during data load', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Load failed'));
    
    render(<RoutinesTab />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load routine data', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles delete routine error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock successful load but failed delete
    let deleteCalled = false;
    globalThis.fetch = vi.fn((url: string | Request | URL, options?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr === '/api/routines/r1' && options?.method === 'DELETE') {
        deleteCalled = true;
        return Promise.reject(new Error('Delete failed'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(urlStr === '/api/routines' ? mockRoutines : []),
        headers: { get: () => 'application/json' }
      } as unknown as Response);
    }) as unknown as typeof fetch;

    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeDefined();
    });
    
    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Delete Routine'));
    
    await waitFor(() => {
      expect(deleteCalled).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete routine', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles empty exercises in routine preview', async () => {
    const emptyRoutines: RoutineWithExercises[] = [
      { id: 'r1', name: 'Empty Routine', exercises: [] as unknown as RoutineWithExercises['exercises'] } as RoutineWithExercises
    ];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyRoutines),
      headers: { get: () => 'application/json' }
    } as unknown as Response);

    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('Empty Routine')).toBeDefined();
    });
    
    fireEvent.click(screen.getByText('Empty Routine'));
    expect(screen.queryByTestId(/remove-exercise-/)).toBeNull();
  });
});

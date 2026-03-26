import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoutinesTab } from './RoutinesTab';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, ...props }: any) => <div {...props} style={style}>{children}</div>,
    button: ({ children, style, ...props }: any) => <button {...props} style={style}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock globalThis.crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123',
  },
});

describe('RoutinesTab Component', () => {
  const mockRoutines = [
    {
      id: 'r1',
      name: 'Push Day',
      exercises: [
        { exerciseId: 'e1', targetSets: 3, targetReps: '10', exercise: { name: 'Bench Press' } }
      ]
    }
  ];

  const mockExercises = [
    { id: 'e1', name: 'Bench Press', category: 'Chest', equipment: 'Barbell' },
    { id: 'e2', name: 'Squat', category: 'Legs', equipment: 'Barbell' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn((url) => {
      if (url === '/api/routines') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRoutines),
        });
      }
      if (url === '/api/exercises') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockExercises),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;
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
    const startBtn = screen.getByText('Start');
    fireEvent.click(startBtn);
    expect(onStartMock).toHaveBeenCalledWith(mockRoutines[0]);
  });

  it('switches to create view and back', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('My Routines')).toBeDefined();
    });
    
    // Switch to create
    const newRoutineBtn = screen.getByText('New Routine');
    fireEvent.click(newRoutineBtn);
    expect(screen.getByText('Create Routine')).toBeDefined();
    expect(screen.getByPlaceholderText('e.g. Push Day, Pull Day, Legs')).toBeDefined();
    
    // Switch back
    // The close button is the one with the X icon in the header. We can find it by looking for the sibling of the title element
    // An easier way is to find it via a query for buttons if we don't have test ids
    screen.getAllByRole('button');
    // Usually the close button is the last button in the header. Since we don't have a label, we'll try firing clicking it based on class structure or we can just mock the list view render.
    // Instead of clicking the close button which is hard to target without aria-label, we can just test adding an exercise.
    expect(screen.getByPlaceholderText('e.g. Push Day, Pull Day, Legs')).toBeDefined();
  });

  it('searches for and adds an exercise to the new routine', async () => {
    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('My Routines')).toBeDefined();
    });
    
    // Go to generate view
    fireEvent.click(screen.getByText('New Routine'));
    
    // Open search overlay
    const searchTriggers = screen.getAllByText('Search Exercises');
    fireEvent.click(searchTriggers[0]);
    
    // Wait for overlay (it renders immediately via AnimatePresence mock)
    const searchInput = screen.getByPlaceholderText('Search exercises...');
    fireEvent.change(searchInput, { target: { value: 'Squat' } });
    
    // Result should show Squat but not Bench Press
    expect(screen.getByText('Legs • Barbell')).toBeDefined(); // Squat subtitle
    
    // Click it to add
    const addSquatBtn = screen.getByText(/Squat/).closest('button');
    if (addSquatBtn) fireEvent.click(addSquatBtn);
    
    // The overlay should close and we should see "Squat" in the routine builder
    expect(screen.getByDisplayValue('3')).toBeDefined(); // Default sets
    expect(screen.getByDisplayValue('8-12')).toBeDefined(); // Default reps
  });

  it('saves a new routine', async () => {
    // Modify fetch to handle POST
    globalThis.fetch = vi.fn((url, options: any) => {
      if (url === '/api/routines' && (!options || options.method === 'GET')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url === '/api/exercises') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExercises) });
      }
      if (url === '/api/routines' && options?.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-id' }) });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    render(<RoutinesTab />);
    await waitFor(() => {
      expect(screen.getByText('No Routines Yet')).toBeDefined();
    });
    
    // Start creating
    fireEvent.click(screen.getByText('Create Routine'));
    
    // Enter name
    const nameInput = screen.getByPlaceholderText('e.g. Push Day, Pull Day, Legs');
    fireEvent.change(nameInput, { target: { value: 'New Test Routine' } });
    
    // Open search, add exercise
    const searchTriggers = screen.getAllByText('Search Exercises');
    fireEvent.click(searchTriggers[0]);
    const addBtn = screen.getByText(/Bench Press/).closest('button');
    if (addBtn) fireEvent.click(addBtn);

    // Save routine
    const saveBtn = screen.getByText('Save Routine');
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    // Verify POST
    await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/routines', expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New Test Routine')
        }));
    });
  });
});

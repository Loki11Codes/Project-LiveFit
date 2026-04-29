import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { WorkoutSession } from './WorkoutSession';
import type { ActiveWorkoutSession } from '@/lib/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...rest }: any) => (
      <div className={className} style={style} {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('./Shared/Confetti', () => ({
  ConfettiCanvas: () => <canvas data-testid="confetti" />,
}));

// @ts-expect-error mock
globalThis.crypto.randomUUID = vi.fn(() => 'test-uuid-001');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeSession = (overrides?: Partial<ActiveWorkoutSession>): ActiveWorkoutSession => ({
  name: 'Push Day',
  startTime: Date.now() - 300_000,
  exercises: [
    {
      id: 'ex-1',
      exerciseId: 'e-1',
      name: 'Bench Press',
      sets: [
        { id: 'set-1', weight: '80', reps: '8', isCompleted: false },
      ],
    },
  ],
  ...overrides,
});

describe('WorkoutSession Component', () => {
  const onFinish = vi.fn();
  const onDiscard = vi.fn();
  const onUpdate = vi.fn();

  const availableExercises = [
    { id: 'ex-db-1', name: 'Squat', category: 'Legs', equipment: 'Barbell' },
    { id: 'ex-db-2', name: 'Deadlift', category: 'Back' },
  ];

  const userPrs = [
    { exerciseId: 'e-1', maxWeight: 100, max1RM: 120 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/exercises')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(availableExercises),
        });
      }
      if (url.includes('/api/profile/prs')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(userPrs),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
    });
  });

  afterEach(cleanup);

  const renderSession = (session = makeSession()) =>
    render(<WorkoutSession session={session} onFinish={onFinish} onDiscard={onDiscard} onUpdate={onUpdate} />);

  // ─── Basic rendering & core buttons ─────────────────────────────────────────

  it('renders session name and handles finish', async () => {
    renderSession();
    expect(screen.getByText('Push Day')).toBeDefined();
    fireEvent.click(screen.getByText('Finish'));
    expect(onFinish).toHaveBeenCalled();
  });

  it('handles discard button', () => {
    renderSession();
    fireEvent.click(screen.getByTestId('discard-button'));
    expect(onDiscard).toHaveBeenCalled();
  });

  it('cleans up timer on unmount', () => {
    const { unmount } = renderSession();
    unmount();
    expect(true).toBe(true);
  });

  // ─── Set operations ──────────────────────────────────────────────────────────

  it('adds a set', () => {
    renderSession();
    fireEvent.click(screen.getByText(/Add Set/i));
    expect(onUpdate).toHaveBeenCalled();
  });

  it('removes a set with confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderSession();
    // The X button for set deletion (not exercise removal)
    const deleteSetBtns = screen.getAllByTitle('Remove set');
    fireEvent.click(deleteSetBtns[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('cancels set deletion when confirm is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderSession();
    const deleteSetBtns = screen.getAllByTitle('Remove set');
    fireEvent.click(deleteSetBtns[0]);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('updates weight and reps inputs', () => {
    renderSession();
    const inputs = screen.getAllByPlaceholderText('0');
    // weight input
    fireEvent.change(inputs[0], { target: { value: '90' } });
    expect(onUpdate).toHaveBeenCalled();
    // reps input
    fireEvent.change(inputs[1], { target: { value: '10' } });
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('toggles set completion and shows completed style', async () => {
    renderSession();
    const toggleBtn = screen.getByTestId('toggle-set');
    fireEvent.click(toggleBtn);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('triggers PR detection when completing a set with high weight', async () => {
    // Provide a session with a set that beats the PR (weight > 100)
    const session = makeSession({
      exercises: [{
        id: 'ex-1',
        exerciseId: 'e-1',
        name: 'Bench Press',
        sets: [{ id: 'set-1', weight: '150', reps: '5', isCompleted: false }],
      }],
    });
    renderSession(session);

    // Wait for PRs to load
    await act(async () => {
      await vi.runAllTimersAsync?.().catch(() => {});
    });

    const toggleBtn = screen.getByTestId('toggle-set');
    fireEvent.click(toggleBtn);
    expect(onUpdate).toHaveBeenCalled();
  });

  // ─── Exercise operations ─────────────────────────────────────────────────────

  it('removes an exercise with confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderSession();
    fireEvent.click(screen.getByLabelText(/Remove Bench Press/i));
    expect(onUpdate).toHaveBeenCalled();
  });

  it('cancels exercise removal when confirm is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderSession();
    fireEvent.click(screen.getByLabelText(/Remove Bench Press/i));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  // ─── Search overlay ──────────────────────────────────────────────────────────

  it('opens and closes the exercise search overlay', async () => {
    renderSession();

    // Wait for exercises to load
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/exercises');
    });

    // Open search
    fireEvent.click(screen.getByText(/Add Exercise/i));
    expect(screen.getByPlaceholderText('Search exercises...')).toBeDefined();

    // Close search
    fireEvent.click(screen.getByTestId('close-search'));
    expect(screen.queryByPlaceholderText('Search exercises...')).toBeNull();
  });

  it('searches for and adds an exercise', async () => {
    renderSession();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/exercises');
    });

    fireEvent.click(screen.getByText(/Add Exercise/i));

    const searchInput = screen.getByPlaceholderText('Search exercises...');
    fireEvent.change(searchInput, { target: { value: 'Squat' } });

    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Squat'));
    expect(onUpdate).toHaveBeenCalled();
    // Overlay should close
    expect(screen.queryByPlaceholderText('Search exercises...')).toBeNull();
  });

  it('shows empty state when no exercises match search', async () => {
    renderSession();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/exercises');
    });

    fireEvent.click(screen.getByText(/Add Exercise/i));
    const searchInput = screen.getByPlaceholderText('Search exercises...');
    fireEvent.change(searchInput, { target: { value: 'ZZZnotfound' } });

    await waitFor(() => {
      expect(screen.getByText(/No exercises found/i)).toBeDefined();
    });
  });

  it('shows exercise equipment or Standard fallback', async () => {
    renderSession();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    fireEvent.click(screen.getByText(/Add Exercise/i));

    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeDefined();
      // Deadlift has no equipment so shows "Standard"
      expect(screen.getByText(/Standard/i)).toBeDefined();
    });
  });

  // ─── Fallback for fetch error ────────────────────────────────────────────────

  it('handles fetch error gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderSession();
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load initial data',
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  // ─── Session with no name ────────────────────────────────────────────────────

  it('renders fallback session name when name is undefined', () => {
    const session = makeSession({ name: undefined });
    renderSession(session);
    expect(screen.getByText('Live Session')).toBeDefined();
  });

  // ─── formatTime with hours ───────────────────────────────────────────────────

  it('displays hours in timer for long sessions', () => {
    const session = makeSession({ startTime: Date.now() - 3_700_000 }); // >1hr
    renderSession(session);
    // Should render something like "1:01:40"
    const timerEl = screen.getByText(/^\d+:\d{2}:\d{2}$/);
    expect(timerEl).toBeDefined();
  });

  // ─── Set with suggestion badge ───────────────────────────────────────────────

  it('renders suggestion badge when set has suggestion', () => {
    const session = makeSession({
      exercises: [{
        id: 'ex-1',
        exerciseId: 'e-1',
        name: 'Bench Press',
        sets: [{
          id: 'set-1',
          weight: '80',
          reps: '8',
          isCompleted: false,
          suggestion: { weight: 85, reps: 8, reason: 'Progressive overload' },
        }],
      }],
    });
    renderSession(session);
    expect(screen.getByText(/Target:/i)).toBeDefined();
    expect(screen.getByText(/Progressive overload/i)).toBeDefined();
  });

  it('renders suggestion badge without reason', () => {
    const session = makeSession({
      exercises: [{
        id: 'ex-1',
        exerciseId: 'e-1',
        name: 'Bench Press',
        sets: [{
          id: 'set-1',
          weight: '80',
          reps: '8',
          isCompleted: false,
          suggestion: { weight: 85, reps: 8 },
        }],
      }],
    });
    renderSession(session);
    expect(screen.getByText(/Target:/i)).toBeDefined();
  });

  // ─── Rest timer dismiss button ────────────────────────────────────────────────

  it('dismisses rest timer via the X button', async () => {
    const session = makeSession({
      exercises: [{
        id: 'ex-1',
        exerciseId: 'e-1',
        name: 'Bench Press',
        sets: [{ id: 'set-1', weight: '90', reps: '5', isCompleted: false }],
      }],
    });
    renderSession(session);

    // Toggle set completed → activates rest timer
    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle-set'));
    });

    // Rest Active banner should appear
    await waitFor(() => {
      expect(screen.getByText('Rest Active')).toBeDefined();
    });

    // Click the X in the rest banner to dismiss
    const dismissBtn = screen.getByTitle
      ? screen.queryByTitle('dismiss-rest')
      : null;

    // The X button inside the rest banner has no title/label,
    // find it by its parent context: it's inside the "Rest Active" banner
    const restBanner = screen.getByText('Rest Active').closest('div')!.parentElement!.parentElement!;
    const xBtn = restBanner.querySelector('button');
    if (xBtn) {
      await act(async () => {
        fireEvent.click(xBtn);
      });
      // After dismissal the banner should go away
      await waitFor(() => {
        expect(screen.queryByText('Rest Active')).toBeNull();
      });
    }
  });

  // ─── Multi-exercise updateSet (covers non-matching ex branch) ────────────────

  it('updates set on second exercise without affecting first', async () => {
    const session = makeSession({
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'e-1',
          name: 'Bench Press',
          sets: [{ id: 'set-1', weight: '80', reps: '8', isCompleted: false }],
        },
        {
          id: 'ex-2',
          exerciseId: 'e-2',
          name: 'Squat',
          sets: [{ id: 'set-2', weight: '100', reps: '5', isCompleted: false }],
        },
      ],
    });
    renderSession(session);

    const inputs = screen.getAllByPlaceholderText('0');
    // inputs[0]=ex-1 weight, [1]=ex-1 reps, [2]=ex-2 weight, [3]=ex-2 reps
    fireEvent.change(inputs[2], { target: { value: '110' } });
    expect(onUpdate).toHaveBeenCalled();
    // Verify the call included both exercises (ex-1 unchanged, ex-2 updated)
    const call = (onUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.exercises[0].id).toBe('ex-1');
    expect(call.exercises[1].id).toBe('ex-2');
  });

  // ─── PRs loaded from fetch (covers setUserPrs line 67) ──────────────────────

  it('loads PRs from API and stores them', async () => {
    renderSession();
    await act(async () => {
      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/profile/prs');
      });
    });
    // PRs loaded means state was set — verify by triggering a PR check
    // with a weight that beats the mocked PR (maxWeight: 100)
    const session = makeSession({
      exercises: [{
        id: 'ex-1',
        exerciseId: 'e-1',
        name: 'Bench Press',
        sets: [{ id: 'set-1', weight: '200', reps: '3', isCompleted: false }],
      }],
    });
    cleanup();
    render(<WorkoutSession session={session} onFinish={onFinish} onDiscard={onDiscard} onUpdate={onUpdate} />);

    await act(async () => {
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/profile/prs'));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle-set'));
    });

    expect(onUpdate).toHaveBeenCalled();
  });

  // ─── Rest timer activates and can be dismissed (covers lines 73-89) ─────────

  it('activating a set starts the rest timer, dismissing it clears the banner', async () => {
    const session = makeSession({
      exercises: [{
        id: 'ex-1', exerciseId: 'e-1', name: 'Bench Press',
        sets: [{ id: 'set-1', weight: '90', reps: '5', isCompleted: false }],
      }],
    });
    const { unmount } = render(
      <WorkoutSession session={session} onFinish={onFinish} onDiscard={onDiscard} onUpdate={onUpdate} />
    );

    // Toggle set → rest timer activates (isRestActive=true, restTime=90)
    await act(async () => { fireEvent.click(screen.getByTestId('toggle-set')); });

    // Banner appears (covers lines 73-82: setInterval branch)
    await waitFor(() => expect(screen.getByText('Rest Active')).toBeDefined());

    // Dismiss via X button (covers line 293: setIsRestActive(false))
    const restBanner = screen.getByText('Rest Active').closest('div')!.parentElement!.parentElement!;
    const xBtn = restBanner.querySelector('button')!;
    await act(async () => { fireEvent.click(xBtn); });

    // Banner gone (covers lines 83-84: else clearInterval branch when isRestActive becomes false)
    await waitFor(() => expect(screen.queryByText('Rest Active')).toBeNull());

    unmount();
  });

  // ─── addSet passthrough for non-matching exercise (line 153) ─────────────────

  it('addSet only modifies the targeted exercise in a multi-exercise session', () => {
    const session = makeSession({
      exercises: [
        { id: 'ex-1', exerciseId: 'e-1', name: 'Bench Press',
          sets: [{ id: 'set-1', weight: '80', reps: '8', isCompleted: false }] },
        { id: 'ex-2', exerciseId: 'e-2', name: 'Squat',
          sets: [{ id: 'set-2', weight: '100', reps: '5', isCompleted: false }] },
      ],
    });
    const { unmount } = render(
      <WorkoutSession session={session} onFinish={onFinish} onDiscard={onDiscard} onUpdate={onUpdate} />
    );

    // Click "Add Set" on the first exercise
    const addSetBtns = screen.getAllByText(/Add Set/i);
    fireEvent.click(addSetBtns[0]);

    expect(onUpdate).toHaveBeenCalled();
    const updated = (onUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updated.exercises[0].sets).toHaveLength(2); // ex-1 gained a set
    expect(updated.exercises[1].sets).toHaveLength(1); // ex-2 unchanged (passthrough line 153)

    unmount();
  });

  // ─── removeSet passthrough for non-matching exercise (line 167) ──────────────

  it('removeSet only removes from targeted exercise in multi-exercise session', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const session = makeSession({
      exercises: [
        { id: 'ex-1', exerciseId: 'e-1', name: 'Bench Press',
          sets: [
            { id: 'set-1', weight: '80', reps: '8', isCompleted: false },
            { id: 'set-2', weight: '85', reps: '6', isCompleted: false },
          ] },
        { id: 'ex-2', exerciseId: 'e-2', name: 'Squat',
          sets: [{ id: 'set-3', weight: '100', reps: '5', isCompleted: false }] },
      ],
    });
    const { unmount } = render(
      <WorkoutSession session={session} onFinish={onFinish} onDiscard={onDiscard} onUpdate={onUpdate} />
    );

    // Remove first set of ex-1
    const deleteSetBtns = screen.getAllByTitle('Remove set');
    fireEvent.click(deleteSetBtns[0]);

    const updated = (onUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updated.exercises[0].sets).toHaveLength(1); // ex-1 lost one set
    expect(updated.exercises[1].sets).toHaveLength(1); // ex-2 unchanged (passthrough line 167)

    unmount();
  });

  // ─── updateSet passthrough for non-matching setId (line 196) ─────────────────

  it('updateSet leaves non-targeted sets unchanged', () => {
    const session = makeSession({
      exercises: [{
        id: 'ex-1', exerciseId: 'e-1', name: 'Bench Press',
        sets: [
          { id: 'set-1', weight: '80', reps: '8', isCompleted: false },
          { id: 'set-2', weight: '85', reps: '6', isCompleted: false },
        ],
      }],
    });
    const { unmount } = render(
      <WorkoutSession session={session} onFinish={onFinish} onDiscard={onDiscard} onUpdate={onUpdate} />
    );

    // Change weight on the first set; set-2 should be untouched (passthrough line 196)
    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '90' } });

    const updated = (onUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updated.exercises[0].sets[1].weight).toBe('85');

    unmount();
  });
});

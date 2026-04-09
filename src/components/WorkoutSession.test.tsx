import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { WorkoutSession } from './WorkoutSession';
import type { ActiveWorkoutSession } from '@/lib/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// @ts-expect-error mock
globalThis.crypto.randomUUID = vi.fn(() => 'test-uuid-001');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeSession = (overrides?: Partial<ActiveWorkoutSession>): ActiveWorkoutSession => ({
  name: 'Push Day',
  startTime: Date.now() - 300_000, // 5 minutes ago
  exercises: [
    {
      id: 'ex-1',
      exerciseId: 'e-1',
      name: 'Bench Press',
      sets: [
        { id: 'set-1', weight: '80', reps: '8', isCompleted: false },
        { id: 'set-2', weight: '80', reps: '8', isCompleted: true },
      ],
    },
  ],
  ...overrides,
});

describe('WorkoutSession Component', () => {
  const onFinish = vi.fn();
  const onDiscard = vi.fn();
  const onUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([
        { id: 'e-1', name: 'Bench Press', category: 'Chest', equipment: 'Barbell' },
        { id: 'e-2', name: 'Squat', category: 'Legs', equipment: 'Barbell' },
      ]),
    });
  });

  afterEach(cleanup);

  const renderSession = (session = makeSession()) =>
    render(<WorkoutSession session={session} onFinish={onFinish} onDiscard={onDiscard} onUpdate={onUpdate} />);

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders session name in the header', () => {
    renderSession();
    expect(screen.getByText('Push Day')).toBeDefined();
  });

  it('renders a timer in the header', () => {
    renderSession();
    // formatTime for ~5 mins gives "5:00" or similar
    expect(screen.getByText(/\d+:\d{2}/)).toBeDefined();
  });

  it('renders exercise names', () => {
    renderSession();
    expect(screen.getByText('Bench Press')).toBeDefined();
  });

  it('renders set inputs for each set', () => {
    renderSession();
    // Two sets → two weight inputs and two reps inputs
    const weightInputs = screen.getAllByPlaceholderText('0');
    expect(weightInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders Finish button', () => {
    renderSession();
    expect(screen.getByText('Finish')).toBeDefined();
  });

  it('renders Add Exercise button', () => {
    renderSession();
    expect(screen.getByText('Add Exercise')).toBeDefined();
  });

  it('renders empty session gracefully (no exercises)', () => {
    renderSession(makeSession({ exercises: [] }));
    expect(screen.getByText('Add Exercise')).toBeDefined();
  });

  // ── Timer / elapsed formatting ────────────────────────────────────────────

  it('formats minutes-only elapsed time correctly', () => {
    // startTime 5 minutes ago → should show "5:00"
    renderSession(makeSession({ startTime: Date.now() - 5 * 60 * 1000 }));
    expect(screen.getByText(/5:\d{2}/)).toBeDefined();
  });

  it('shows session name fallback "Live Session" when name is empty', () => {
    renderSession(makeSession({ name: '' }));
    expect(screen.getByText('Live Session')).toBeDefined();
  });

  // ── Button interactions ───────────────────────────────────────────────────

  it('calls onFinish with the session when Finish is clicked', () => {
    const session = makeSession();
    renderSession(session);
    fireEvent.click(screen.getByText('Finish'));
    expect(onFinish).toHaveBeenCalledWith(session);
  });

  it('calls onDiscard when the discard (trash) button is clicked', () => {
    renderSession();
    // The discard button wraps the Trash2 icon — find it by its parent role
    const discardBtn = screen.getAllByRole('button').find(
      (b) => b.querySelector('svg') && b.className.includes('hover:text-red-500')
        && !b.className.includes('rounded-xl'), // header button, not set remove
    );
    if (discardBtn) fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalled();
  });

  // ── updateSet (weight / reps changes) ────────────────────────────────────

  it('calls onUpdate when weight input changes', () => {
    renderSession();
    const [firstWeight] = screen.getAllByPlaceholderText('0');
    fireEvent.change(firstWeight, { target: { value: '90' } });
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: expect.arrayContaining([
          expect.objectContaining({
            sets: expect.arrayContaining([
              expect.objectContaining({ weight: '90' }),
            ]),
          }),
        ]),
      }),
    );
  });

  it('calls onUpdate when reps input changes', () => {
    renderSession();
    // reps inputs come after weight inputs in DOM order
    const inputs = screen.getAllByPlaceholderText('0');
    // inputs: [weight-set1, reps-set1, weight-set2, reps-set2]
    fireEvent.change(inputs[1], { target: { value: '10' } });
    expect(onUpdate).toHaveBeenCalled();
  });

  // ── toggleSet (complete / incomplete) ────────────────────────────────────

  it('calls onUpdate toggling set completion to true when circle button clicked', () => {
    renderSession();
    // First set is NOT completed — find its toggle button (has rounded-xl styling)
    const toggleButtons = screen.getAllByRole('button').filter(
      (b) => b.className.includes('rounded-xl') && b.className.includes('h-9'),
    );
    fireEvent.click(toggleButtons[0]);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: expect.arrayContaining([
          expect.objectContaining({
            sets: expect.arrayContaining([
              expect.objectContaining({ isCompleted: true }),
            ]),
          }),
        ]),
      }),
    );
  });

  // ── addSet ────────────────────────────────────────────────────────────────

  it('calls onUpdate with a new set when Add Set is clicked', () => {
    renderSession();
    fireEvent.click(screen.getByText(/Add Set/i));
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: expect.arrayContaining([
          expect.objectContaining({
            sets: expect.arrayContaining([
              expect.objectContaining({ id: 'test-uuid-001', isCompleted: false }),
            ]),
          }),
        ]),
      }),
    );
  });

  // ── removeSet ─────────────────────────────────────────────────────────────

  it('calls onUpdate removing a set when remove button is confirmed', () => {
    globalThis.confirm = vi.fn().mockReturnValue(true);
    renderSession();
    // Find all X-icon remove buttons for sets (they have title="Remove set")
    const removeSetBtns = screen.getAllByTitle('Remove set');
    fireEvent.click(removeSetBtns[0]);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: expect.arrayContaining([
          expect.objectContaining({
            sets: expect.not.arrayContaining([
              expect.objectContaining({ id: 'set-1' }),
            ]),
          }),
        ]),
      }),
    );
  });

  it('does NOT call onUpdate if remove set is cancelled', () => {
    globalThis.confirm = vi.fn().mockReturnValue(false);
    renderSession();
    const removeSetBtns = screen.getAllByTitle('Remove set');
    fireEvent.click(removeSetBtns[0]);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  // ── removeExercise ───────────────────────────────────────────────────────

  it('calls onUpdate removing exercise when confirm returns true', () => {
    globalThis.confirm = vi.fn().mockReturnValue(true);
    renderSession();
    // The X button in the exercise header (opacity-0 group-hover:opacity-100)
    const exerciseRemoveBtns = screen.getAllByRole('button').filter(
      (b) => b.className.includes('opacity-0'),
    );
    fireEvent.click(exerciseRemoveBtns[0]);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ exercises: [] }),
    );
  });

  it('does NOT remove exercise when confirm is cancelled', () => {
    globalThis.confirm = vi.fn().mockReturnValue(false);
    renderSession();
    const exerciseRemoveBtns = screen.getAllByRole('button').filter(
      (b) => b.className.includes('opacity-0'),
    );
    fireEvent.click(exerciseRemoveBtns[0]);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  // ── Search overlay ────────────────────────────────────────────────────────

  it('opens search overlay when Add Exercise is clicked', async () => {
    renderSession();
    fireEvent.click(screen.getByText(/Add Exercise/i));
    expect(screen.getByPlaceholderText('Search exercises...')).toBeDefined();
  });

  it('closes search overlay when X button in search is clicked', async () => {
    renderSession();
    fireEvent.click(screen.getByText(/Add Exercise/i));
    // Wait for the search overlay to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search exercises...')).toBeDefined();
    });
    // The first button in the search overlay is the close (X) button
    const searchOverlayButtons = screen.getAllByRole('button').filter(
      (b) => b.className.includes('p-2') && b.className.includes('text-[var(--foreground-muted)]'),
    );
    fireEvent.click(searchOverlayButtons[0]);
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search exercises...')).toBeNull();
    });
  });

  it('loads and displays exercises from API after opening search', async () => {
    renderSession();
    fireEvent.click(screen.getByText(/Add Exercise/i));
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeDefined();
    });
  });

  it('filters exercises by search query', async () => {
    renderSession();
    fireEvent.click(screen.getByText(/Add Exercise/i));
    await waitFor(() => expect(screen.getByText('Squat')).toBeDefined());

    const searchInput = screen.getByPlaceholderText('Search exercises...');
    // Filter to 'squat' — only Squat should remain in the search results
    fireEvent.change(searchInput, { target: { value: 'squat' } });

    expect(screen.getByText('Squat')).toBeDefined();
    // 'Chest' category of Bench Press should not appear (exercise is hidden)
    expect(screen.queryByText('Chest • Barbell')).toBeNull();
  });

  it('shows "no exercises found" when search has no results', async () => {
    renderSession();
    fireEvent.click(screen.getByText(/Add Exercise/i));
    await waitFor(() => expect(screen.getByText('Squat')).toBeDefined());

    const searchInput = screen.getByPlaceholderText('Search exercises...');
    fireEvent.change(searchInput, { target: { value: 'xyzabc' } });

    expect(screen.getByText(/No exercises found/i)).toBeDefined();
  });

  it('adds exercise and closes search when an exercise is selected', async () => {
    renderSession();
    fireEvent.click(screen.getByText(/Add Exercise/i));
    await waitFor(() => expect(screen.getByText('Squat')).toBeDefined());

    fireEvent.click(screen.getByText('Squat'));

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: expect.arrayContaining([
          expect.objectContaining({ name: 'Squat' }),
        ]),
      }),
    );
    expect(screen.queryByPlaceholderText('Search exercises...')).toBeNull();
  });

  it('handles API failure gracefully (no crash)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    // Should render without throwing
    renderSession();
    fireEvent.click(screen.getByText(/Add Exercise/i));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search exercises...')).toBeDefined();
    });
  });
});

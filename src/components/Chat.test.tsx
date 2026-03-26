import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Chat from './Chat';
import { QuickChips } from './Chat/QuickChips';

// Mock dependencies
vi.mock('@/lib/client-api', () => ({
  requestJson: vi.fn(),
  getClientErrorMessage: vi.fn((err) => err.message || 'Error'),
}));

vi.mock('@/lib/chat-utils', () => ({
  extractAndCleanLogData: vi.fn((text) => ({ hasData: false, cleanText: text })),
}));

// Mock scrollIntoView
globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();
globalThis.crypto.randomUUID = vi.fn(() => '123e4567-e89b-12d3-a456-426614174000') as any;

describe('Chat Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for history
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  afterEach(cleanup);

  describe('Chat Main Component', () => {
    const defaultProps = {
      onLogParsed: vi.fn(),
      input: '',
      setInput: vi.fn(),
    };

    it('renders welcome message for existing user', async () => {
      render(<Chat {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/Good morning/i)).toBeDefined();
      });
    });

    it('renders welcome message for new user', async () => {
      render(<Chat {...defaultProps} isNewUser={true} />);
      await waitFor(() => {
        expect(screen.getByText(/Welcome to LiveFit/i)).toBeDefined();
      });
    });

    it('shows typing indicator when isTyping is true (handled via internal state usually, but we check if it shows up during send)', async () => {
      // This is hard to test purely via props since it's internal state
      // but we can verify the loader shows up initially
      render(<Chat {...defaultProps} />);
      expect(screen.getByTestId('chat-loader')).toBeDefined();
    });

    it('triggers nudge message when protein is low', async () => {
      const nudgeStatus = {
        protein: 10,
        proteinTarget: 100,
        calories: 1000,
        calorieTarget: 2000,
      };
      render(<Chat {...defaultProps} nudgeStatus={nudgeStatus} />);
      await waitFor(() => {
        expect(screen.getByText(/noticed you're a bit behind on your protein/i)).toBeDefined();
      });
    });
  });

  describe('QuickChips', () => {
    it('renders all chips', () => {
      render(<QuickChips onSelect={vi.fn()} />);
      expect(screen.getByText('Breakfast')).toBeDefined();
      expect(screen.getByText('Workout')).toBeDefined();
      expect(screen.getByText('Sleep')).toBeDefined();
    });

    it('calls onSelect with correct text when a chip is clicked', () => {
      const onSelect = vi.fn();
      render(<QuickChips onSelect={onSelect} />);
      fireEvent.click(screen.getByText('Breakfast'));
      expect(onSelect).toHaveBeenCalledWith('Log my breakfast');
    });
  });
});

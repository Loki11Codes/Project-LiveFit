import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MealPlanningTab from './MealPlanningTab';
import { requestJson } from '@/lib/client-api';

vi.mock('@/lib/client-api', () => ({
  requestJson: vi.fn(),
}));

describe('MealPlanningTab', () => {
  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const mockPlan = {
    id: 'plan-1',
    weekStarting: new Date().toISOString(),
    entries: [
      { id: '1', dayIndex: currentDayIndex, mealType: 'Breakfast', title: 'Healthy Oats', kcal: 450, protein: 20, carbs: 60, fats: 10 }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    vi.mocked(requestJson).mockReturnValue(new Promise(() => {}));
    const { container } = render(<MealPlanningTab />);
    // Check for the pulse animation class
    expect(container.querySelector('.animate-pulse')).toBeDefined();
  });

  it('renders a meal plan when data is loaded', async () => {
    vi.mocked(requestJson).mockResolvedValue(mockPlan);
    render(<MealPlanningTab />);

    await waitFor(() => {
      expect(screen.getByText('Healthy Oats')).toBeDefined();
      expect(screen.getByText('450')).toBeDefined();
    });
  });

  it('dispatches ai-chat-prompt event when Generate button is clicked', async () => {
    vi.mocked(requestJson).mockResolvedValue(null);
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
    render(<MealPlanningTab />);

    const generateBtn = await screen.findByText('Generate with AI');
    fireEvent.click(generateBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('ai-chat-prompt');
    expect(event.detail).toContain('generate a structured weekly meal plan');
  });

  it('dispatches ai-chat-prompt event when Shopping List button is clicked', async () => {
    vi.mocked(requestJson).mockResolvedValue(mockPlan);
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
    render(<MealPlanningTab />);

    const shoppingBtn = await screen.findByText(/Shopping List/i);
    fireEvent.click(shoppingBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls.find(call => (call[0] as CustomEvent).type === 'ai-chat-prompt')?.[0] as CustomEvent;
    expect(event.detail).toContain('organized by supermarket aisle');
  });

  it('switches between days and filters meals correctly', async () => {
    const multiDayPlan = {
      ...mockPlan,
      entries: [
        { id: '1', dayIndex: 0, mealType: 'Breakfast', title: 'Monday Oats', kcal: 400 },
        { id: '2', dayIndex: 1, mealType: 'Lunch', title: 'Tuesday Salad', kcal: 500 },
      ]
    };
    vi.mocked(requestJson).mockResolvedValue(multiDayPlan);
    render(<MealPlanningTab />);

    // Select Monday
    fireEvent.click(screen.getByText('Monday'));
    await waitFor(() => expect(screen.getByText('Monday Oats')).toBeDefined());
    expect(screen.queryByText('Tuesday Salad')).toBeNull();

    // Select Tuesday
    fireEvent.click(screen.getByText('Tuesday'));
    await waitFor(() => expect(screen.getByText('Tuesday Salad')).toBeDefined());
    expect(screen.queryByText('Monday Oats')).toBeNull();
  });

  it('shows empty day message when a day has no entries', async () => {
    vi.mocked(requestJson).mockResolvedValue(mockPlan); // Only has entry for currentDayIndex
    render(<MealPlanningTab />);

    // Pick a day that definitely doesn't have the entry
    const otherDayIndex = (currentDayIndex + 1) % 7;
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    fireEvent.click(screen.getByText(days[otherDayIndex]));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`No meals planned for ${days[otherDayIndex]}`, 'i'))).toBeDefined();
    });
  });

  it('handles fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(requestJson).mockRejectedValue(new Error('Fetch failed'));
    render(<MealPlanningTab />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch plan:', expect.any(Error));
      expect(screen.getByText("You don't have a meal plan yet")).toBeDefined();
    });
  });
});


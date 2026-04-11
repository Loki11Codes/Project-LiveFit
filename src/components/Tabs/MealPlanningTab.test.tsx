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
    (requestJson as any).mockReturnValue(new Promise(() => {}));
    const { container } = render(<MealPlanningTab />);
    // Check for the pulse animation class
    expect(container.querySelector('.animate-pulse')).toBeDefined();
  });

  it('renders a meal plan when data is loaded', async () => {
    (requestJson as any).mockResolvedValue(mockPlan);
    render(<MealPlanningTab />);

    await waitFor(() => {
      expect(screen.getByText('Healthy Oats')).toBeDefined();
      expect(screen.getByText('450')).toBeDefined();
    });
  });

  it('dispatches ai-chat-prompt event when Generate button is clicked', async () => {
    (requestJson as any).mockResolvedValue(null);
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
    render(<MealPlanningTab />);

    const generateBtn = await screen.findByText('Generate with AI');
    fireEvent.click(generateBtn);

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('ai-chat-prompt');
    expect(event.detail).toContain('generate a structured weekly meal plan');
  });

  it('shows empty state when no plan exists', async () => {
    (requestJson as any).mockResolvedValue(null);
    render(<MealPlanningTab />);

    await waitFor(() => {
      expect(screen.getByText("You don't have a meal plan yet")).toBeDefined();
    });
  });
});

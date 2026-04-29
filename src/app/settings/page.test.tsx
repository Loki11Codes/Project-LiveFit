import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsPage from "./page";
import { signOut } from "next-auth/react";
import { requestJson } from "@/lib/client-api";
import { toast } from "react-hot-toast";
import React from "react";

// Mock dependencies
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: { user: { id: "u1" } }, status: "authenticated" })),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ back: vi.fn() })),
}));
vi.mock("@/lib/client-api", () => ({
  requestJson: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSetAccentColor = vi.fn();
vi.mock("@/components/Theme/ThemeProvider", () => ({
  BRAND_COLORS: [{ name: "Amber", hex: "#f59e0b" }, { name: "Rose", hex: "#f43f5e" }],
  useTheme: vi.fn(() => ({ 
    theme: { accentColor: "#f59e0b" }, 
    setAccentColor: mockSetAccentColor 
  })),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({ 
      ok: true, 
      json: () => Promise.resolve({}),
      headers: new Headers({ 'content-type': 'application/json' })
    });
    
    vi.mocked(requestJson).mockResolvedValue({ name: "Test User" } as any);
  });

  it("handles core flows", async () => {
    render(<SettingsPage />);
    
    // Tab switching
    const fitnessTab = screen.getByText(/Fitness & Goals/i);
    fireEvent.click(fitnessTab);
    
    const nutritionTab = screen.getByText(/Nutrition & Diet/i);
    fireEvent.click(nutritionTab);

    // Save flow
    const saveBtn = screen.getByText(/Save Changes/i);
    fireEvent.click(saveBtn);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    // Sign out
    const signOutBtn = screen.getByText(/Sign Out/i);
    fireEvent.click(signOutBtn);
    expect(signOut).toHaveBeenCalled();
  });

  it("handles numeric inputs", async () => {
    render(<SettingsPage />);
    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement;
    fireEvent.change(ageInput, { target: { value: "30" } });
    expect(ageInput.value).toBe("30");
  });

  it("handles profile panel inputs", () => {
    render(<SettingsPage />);
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: "John Doe" } });

    const usernameInput = screen.getByLabelText(/Username/i);
    fireEvent.change(usernameInput, { target: { value: "johndoe" } });

    const phoneInput = screen.getByLabelText(/Phone/i);
    fireEvent.change(phoneInput, { target: { value: "1234567890" } });

    const heightInput = screen.getByLabelText(/Height/i);
    if (heightInput) fireEvent.change(heightInput, { target: { value: "180" } });

    const maleBtn = screen.getByText("male", { selector: "button" });
    if (maleBtn) fireEvent.click(maleBtn);

    const othersBtn = screen.getByText("Others", { selector: "button" });
    if (othersBtn) {
      fireEvent.click(othersBtn);
      const customGenderInput = screen.getByPlaceholderText(/Enter gender identity/i);
      if (customGenderInput) fireEvent.change(customGenderInput, { target: { value: "Non-binary" } });
    }

    const hapticToggle = screen.getByText(/Haptic Feedback/i).closest("div")?.parentElement?.querySelector("button");
    if (hapticToggle) fireEvent.click(hapticToggle);
    expect(nameInput).toBeInTheDocument();
  });

  it("handles accent color selection", () => {
    render(<SettingsPage />);
    const roseBtn = screen.getByText("Rose").closest("button");
    if (roseBtn) {
      fireEvent.click(roseBtn);
      expect(mockSetAccentColor).toHaveBeenCalledWith("#f43f5e");
    }
  });

  it("handles fitness panel inputs", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText(/Fitness & Goals/i));
    
    const primaryGoal = screen.getByLabelText(/Primary Goal/i);
    fireEvent.change(primaryGoal, { target: { value: "Fat Loss" } });

    const activityPref = screen.getByLabelText(/Activity Preference/i);
    fireEvent.change(activityPref, { target: { value: "Running / Cardio" } });

    const calGoal = screen.getByLabelText(/Daily Calorie Goal/i);
    if (calGoal) fireEvent.change(calGoal, { target: { value: "2500" } });

    const duration = screen.getByLabelText(/Workout Duration/i);
    if (duration) fireEvent.change(duration, { target: { value: "60" } });
    expect(primaryGoal).toBeInTheDocument();
  });

  it("handles nutrition panel inputs", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText(/Nutrition & Diet/i));
    
    const dietaryPref = screen.getByLabelText(/Dietary Preference/i);
    fireEvent.change(dietaryPref, { target: { value: "Vegan" } });

    const calories = screen.getByLabelText(/Calorie Target/i);
    if (calories) fireEvent.change(calories, { target: { value: "2000" } });

    const protein = screen.getByLabelText(/Protein \(g\)/i);
    if (protein) fireEvent.change(protein, { target: { value: "150" } });

    const carbs = screen.getByLabelText(/Carbs \(g\)/i);
    if (carbs) fireEvent.change(carbs, { target: { value: "250" } });

    const fats = screen.getByLabelText(/Fats \(g\)/i);
    if (fats) fireEvent.change(fats, { target: { value: "70" } });
    expect(dietaryPref).toBeInTheDocument();
  });

  it("handles notifications panel interactions", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText(/Notifications/i));

    const workoutReminders = screen.getByText(/Workout Reminders/i).closest("div")?.parentElement?.querySelector("button");
    if (workoutReminders) fireEvent.click(workoutReminders);

    const mealLogging = screen.getByText(/Meal Logging/i).closest("div")?.parentElement?.querySelector("button");
    if (mealLogging) fireEvent.click(mealLogging);

    const waterCheckIns = screen.getByText(/Water Check-ins/i).closest("div")?.parentElement?.querySelector("button");
    if (waterCheckIns) fireEvent.click(waterCheckIns);
    expect(screen.getAllByText(/Notifications/i)[0]).toBeInTheDocument();
  });

  it("handles privacy panel interactions", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText(/Privacy & Advanced/i));

    const exportBtn = screen.getByText(/Export Data/i);
    fireEvent.click(exportBtn);

    const deleteAccountBtn = screen.getAllByText(/Delete Account/i)[1];
    if (deleteAccountBtn) fireEvent.click(deleteAccountBtn);
    expect(screen.getAllByText(/Privacy & Advanced/i)[0]).toBeInTheDocument();
  });
});

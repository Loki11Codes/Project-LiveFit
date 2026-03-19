import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProfileTab from './ProfileTab';
import { signOut, signIn } from 'next-auth/react';
import React from 'react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

describe('ProfileTab Component', () => {
  const mockSetGoals = vi.fn();
  const mockHandleSaveGoals = vi.fn();
  const mockSetProfile = vi.fn();
  const mockHandleSaveProfile = vi.fn();

  const defaultProps = {
    session: {
      user: { name: 'Test User', email: 'test@example.com', id: 'user-1', image: '/test.jpg' },
      expires: '9999-12-31',
    },
    goals: {
      proteinTraining: 100,
      proteinRest: 80,
      proteinLite: 60,
      waterTarget: 2.5,
      sleepTarget: 8,
      proteinTarget: 150,
      kcalTarget: 2000,
    },
    setGoals: mockSetGoals,
    handleSaveGoals: mockHandleSaveGoals,
    profile: {
      age: 30,
      gender: 'Male',
      height: 180,
      startDay: 1,
      primaryGoal: 'Muscle Gain',
      day1: 'Push',
      day2: 'Pull',
      day3: 'Legs',
      day4: 'Rest',
      day5: 'Upper',
      day6: 'Lower',
    },
    setProfile: mockSetProfile,
    handleSaveProfile: mockHandleSaveProfile,
    analytics: {
      averages: { protein: 90, kcal: 2000 },
      nutritionStats: [],
      weightTrend: [],
      meta: { period: '7d', logCount: 14, measurementCount: 2 }
    },
    trackedDayCount: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders user info when authenticated', () => {
    render(<ProfileTab {...defaultProps} />);
    expect(screen.getByText('Test User')).toBeDefined();
    expect(screen.getByText('test@example.com')).toBeDefined();
    expect(screen.getByText('Verified')).toBeDefined();
  });

  it('renders Sign In button when not authenticated', () => {
    render(<ProfileTab {...defaultProps} session={null} />);
    expect(screen.getByText('Sign In')).toBeDefined();
    fireEvent.click(screen.getByText('Sign In'));
    expect(signIn).toHaveBeenCalled();
  });

  it('calls signOut when Sign Out button is clicked', () => {
    render(<ProfileTab {...defaultProps} />);
    const signOutBtn = screen.getByText('Sign Out');
    fireEvent.click(signOutBtn.closest('button')!);
    expect(signOut).toHaveBeenCalled();
  });

  it('updates goal fields and calls setGoals', () => {
    render(<ProfileTab {...defaultProps} />);
    const trainingInput = screen.getByDisplayValue('100');
    fireEvent.change(trainingInput, { target: { value: '110' } });
    
    expect(mockSetGoals).toHaveBeenCalled();
    const updateFn = mockSetGoals.mock.calls[0][0];
    const newState = updateFn(defaultProps.goals);
    expect(newState.proteinTraining).toBe(110);
  });

  it('calls handleSaveGoals when Update Targets is clicked', () => {
    render(<ProfileTab {...defaultProps} />);
    const saveBtn = screen.getByText('Update Targets');
    fireEvent.click(saveBtn.closest('button')!);
    expect(mockHandleSaveGoals).toHaveBeenCalled();
  });

  it('updates profile fields and calls setProfile', () => {
    render(<ProfileTab {...defaultProps} />);
    
    // Testing Age input
    const ageInput = screen.getByDisplayValue('30');
    fireEvent.change(ageInput, { target: { value: '31' } });
    
    expect(mockSetProfile).toHaveBeenCalled();
    const updateFn = mockSetProfile.mock.calls[0][0];
    const newState = updateFn(defaultProps.profile);
    expect(newState.age).toBe(31);

    // Testing Gender select
    const genderSelect = screen.getByDisplayValue('Male');
    fireEvent.change(genderSelect, { target: { value: 'Female' } });
    
    const genderUpdateFn = mockSetProfile.mock.calls[1][0];
    const genderNewState = genderUpdateFn(defaultProps.profile);
    expect(genderNewState.gender).toBe('Female');
  });

  it('calls handleSaveProfile when Save Profile is clicked', () => {
    render(<ProfileTab {...defaultProps} />);
    const saveBtn = screen.getByText('Save Profile');
    fireEvent.click(saveBtn.closest('button')!);
    expect(mockHandleSaveProfile).toHaveBeenCalled();
  });

  it('updates workout split fields', () => {
    render(<ProfileTab {...defaultProps} />);
    const day1Input = screen.getByDisplayValue('Push');
    fireEvent.change(day1Input, { target: { value: 'Hypertrophy' } });
    
    expect(mockSetProfile).toHaveBeenCalled();
    const updateFn = mockSetProfile.mock.calls[0][0];
    const newState = updateFn(defaultProps.profile);
    expect(newState.day1).toBe('Hypertrophy');
  });

  it('handles missing analytics safely', () => {
    render(<ProfileTab {...defaultProps} analytics={null} />);
    expect(screen.getByText('0g')).toBeDefined();
  });

  it('handles empty input values by setting null', () => {
    render(<ProfileTab {...defaultProps} />);
    const trainingInput = screen.getByDisplayValue('100');
    fireEvent.change(trainingInput, { target: { value: '' } });
    
    expect(mockSetGoals).toHaveBeenCalled();
    const updateFn = mockSetGoals.mock.calls[0][0];
    const newState = updateFn(defaultProps.goals);
    expect(newState.proteinTraining).toBe(null);
  });

  it('updates water target and sleep target', () => {
    render(<ProfileTab {...defaultProps} />);
    const waterInput = screen.getByDisplayValue('2.5');
    fireEvent.change(waterInput, { target: { value: '3.0' } });
    expect(mockSetGoals).toHaveBeenCalled();

    const sleepInput = screen.getByDisplayValue('8');
    fireEvent.change(sleepInput, { target: { value: '7.5' } });
    expect(mockSetGoals).toHaveBeenCalledTimes(2);
  });

  it('updates profile info (height, startDay, gender, primaryGoal)', () => {
    render(<ProfileTab {...defaultProps} />);
    const heightInput = screen.getByDisplayValue('180');
    fireEvent.change(heightInput, { target: { value: '185' } });
    expect(mockSetProfile).toHaveBeenCalled();

    const startDayInput = screen.getByDisplayValue('1');
    fireEvent.change(startDayInput, { target: { value: '2' } });
    expect(mockSetProfile).toHaveBeenCalledTimes(2);

    const goalSelect = screen.getByDisplayValue('Muscle Gain');
    fireEvent.change(goalSelect, { target: { value: 'Weight Loss' } });
    expect(mockSetProfile).toHaveBeenCalledTimes(3);
  });
});

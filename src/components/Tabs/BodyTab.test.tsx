import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BodyTab from './BodyTab';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    button: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children as React.ReactNode}</button>,
    tr: ({ children, ...props }: Record<string, unknown>) => <tr {...props}>{children as React.ReactNode}</tr>,
  },
}));

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('BodyTab Component', () => {
  const mockSetMeasurements = vi.fn();
  const mockHandleSaveMeasurements = vi.fn();

  const defaultProps = {
    measurements: {
      weight: '75',
      waist: '85',
      chest: '',
      arms: '',
      thighs: '',
      hips: '',
      calves: '',
      neck: '',
      bodyFat: '',
    },
    setMeasurements: mockSetMeasurements,
    handleSaveMeasurements: mockHandleSaveMeasurements,
    latestMeasurement: {
      id: 'm1',
      weight: 75,
      waist: 85,
      chest: 100,
      arms: 35,
      thighs: 55,
      hips: 95,
      calves: 38,
      neck: 40,
      bodyFat: 15,
      time: new Date('2026-03-18T10:00:00Z'),
      userId: 'u1',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve([defaultProps.latestMeasurement]),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders measurement inputs correctly', () => {
    render(<BodyTab {...defaultProps} />);
    expect(screen.getByText('Log Measurements')).toBeDefined();
    expect(screen.getByDisplayValue('75')).toBeDefined();
    expect(screen.getByDisplayValue('85')).toBeDefined();
  });

  it('calls setMeasurements when an input changes', async () => {
    render(<BodyTab {...defaultProps} />);
    
    const weightInput = screen.getByTestId('input-weight');
    
    await act(async () => {
      fireEvent.change(weightInput, { target: { value: '76' } });
    });
    
    expect(mockSetMeasurements).toHaveBeenCalled();
    const updateFn = mockSetMeasurements.mock.calls[0][0];
    const newState = updateFn({ weight: '75', waist: '85' });
    expect(newState.weight).toBe('76');
    expect(newState.waist).toBe('85');
  });

  it('calls handleSaveMeasurements when button is clicked', () => {
    render(<BodyTab {...defaultProps} />);
    const saveBtn = screen.getByText('Save Measurements');
    fireEvent.click(saveBtn);
    expect(mockHandleSaveMeasurements).toHaveBeenCalled();
  });

  it('renders latest stats when available', () => {
    render(<BodyTab {...defaultProps} />);
    expect(screen.getByText('Latest Stats')).toBeDefined();
    expect(screen.getAllByText('75').length).toBeGreaterThan(0);
    expect(screen.getByText(/Updated: Mar 18, 2026/i)).toBeDefined();
  });

  it('renders measurement history table after fetch', async () => {
    render(<BodyTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Measurement History')).toBeDefined();
      expect(screen.getByText('1 records')).toBeDefined();
    });
    // Check table content
    expect(screen.getAllByText('75').length).toBeGreaterThan(1); // One in stats, one in table
  });

  it('renders empty message when no latest measurement', () => {
    render(<BodyTab {...defaultProps} latestMeasurement={null} />);
    expect(screen.getByText('No data recorded')).toBeDefined();
  });
});

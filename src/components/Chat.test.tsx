import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// STUB scrollIntoView for JSDOM
if (globalThis.window !== undefined) {
  globalThis.window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// MOCKS MUST BE BEFORE IMPORTS
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>, // eslint-disable-line @typescript-eslint/no-explicit-any
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>, // eslint-disable-line @typescript-eslint/no-explicit-any
  },
  AnimatePresence: ({ children }: any) => <>{children}</> // eslint-disable-line @typescript-eslint/no-explicit-any
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} style={{ width: '100px', height: '100px' }} /> // eslint-disable-line @typescript-eslint/no-explicit-any, @next/next/no-img-element
}));

vi.mock('lucide-react', () => ({
  Activity: () => <div data-testid="icon-activity" />,
  User: () => <div data-testid="icon-user" />,
  ArrowUp: () => <div data-testid="icon-arrow-up" />,
  ImageIcon: () => <div data-testid="icon-image" />,
  Coffee: () => <div data-testid="icon-coffee" />,
  Dumbbell: () => <div data-testid="icon-dumbbell" />,
  Moon: () => <div data-testid="icon-moon" />,
  Info: () => <div data-testid="icon-info" />,
  X: () => <div data-testid="icon-x" />,
  Mic: () => <div data-testid="icon-mic" />,
  Square: () => <div data-testid="icon-square" />,
}));

vi.mock('@/lib/client-api', () => ({
  getClientErrorMessage: vi.fn((err) => (err instanceof Error ? err.message : String(err))),
  requestJson: vi.fn(() => Promise.resolve({})),
}));

// Import the component AFTER mocks and stubs
import Chat from './Chat';
import * as clientApi from '@/lib/client-api';

describe('Chat Component', () => {
  const mockOnLogParsed = vi.fn();
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Stub Globals
    vi.stubGlobal('fetch', mockFetch);
    
    // Forced crypto mock for JSDOM
    const mockCrypto = {
      randomUUID: vi.fn().mockImplementation(() => `uuid-${Math.random().toString(36).substring(2, 9)}`),
    };
    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      writable: true,
      configurable: true,
    });
    
    // Mock FileReader
    class MockFileReader {
      onload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      result: string = 'data:image/jpeg;base64,test-base64';
      readAsDataURL() {
        setTimeout(() => { if (this.onload) this.onload(); }, 10);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const waitForLoader = async () => {
    await waitFor(() => {
      expect(screen.queryByTestId('chat-loader')).toBeNull();
    }, { timeout: 3000 });
  };

  it('renders welcome message for existing user', async () => {
    render(<Chat onLogParsed={mockOnLogParsed} isNewUser={false} />);
    await waitForLoader();
    expect(screen.getByText(/Good morning!/i)).toBeDefined();
    expect(screen.getByTestId('chat-input')).toBeDefined();
  });

  it('renders welcome message for new user', async () => {
    render(<Chat onLogParsed={mockOnLogParsed} isNewUser={true} />);
    await waitForLoader();
    expect(screen.getByText(/Welcome to LiveFit!/i)).toBeDefined();
  });

  it('loads chat history on mount', async () => {
    const historicalMessages = [
      { id: '1', role: 'user', text: 'Hello history', timestamp: '10:00 AM' },
      { id: '2', role: 'model', text: 'Hi history', timestamp: '10:01 AM' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(historicalMessages),
    });

    render(<Chat onLogParsed={mockOnLogParsed} />);
    await waitForLoader();
    expect(screen.getByText('Hello history')).toBeDefined();
    expect(screen.getByText('Hi history')).toBeDefined();
  });

  it('sends a message and processes AI response', async () => {
    (clientApi.requestJson as any).mockResolvedValueOnce({ // eslint-disable-line @typescript-eslint/no-explicit-any
      text: 'Logged your meal! |||DATA{"type":"food"}|||',
    });

    render(<Chat onLogParsed={mockOnLogParsed} />);
    await waitForLoader();

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Had 3 eggs' } });
    
    const sendBtn = screen.getByLabelText('Send message');
    
    await act(async () => {
       fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Had 3 eggs')).toBeDefined();
      expect(screen.getByText(/Logged your meal!/)).toBeDefined();
    }, { timeout: 5000 });

    expect(mockOnLogParsed).toHaveBeenCalled();
  });

  it('handles chat errors gracefully', async () => {
    (clientApi.requestJson as any).mockRejectedValueOnce(new Error('Network Error')); // eslint-disable-line @typescript-eslint/no-explicit-any

    render(<Chat onLogParsed={mockOnLogParsed} />);
    await waitForLoader();

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Test error' } });
    
    const sendBtn = screen.getByLabelText('Send message');
    
    await act(async () => {
       fireEvent.click(sendBtn);
    });

    // Use findBy for robust async selection
    const errorMsg = await screen.findByText(/Unable to connect to AI service/i, {}, { timeout: 5000 });
    expect(errorMsg).toBeDefined();
    
    // Check for "Network Error" part - use getAll if multiple show up
    const networkErrors = screen.getAllByText(/Network Error/i);
    expect(networkErrors.at(0)).toBeDefined();
  });

  it('populates input when quick chips are clicked', async () => {
    render(<Chat onLogParsed={mockOnLogParsed} />);
    await waitForLoader();

    const chips = [
      { text: 'Breakfast', expected: 'Log my breakfast' },
      { text: 'Workout', expected: 'Record my training session' },
      { text: 'Sleep', expected: 'Show my sleep data' },
      { text: 'Protein left?', expected: 'How is my protein intake?' },
      { text: 'Summary', expected: 'Give me a summary' },
    ];

    for (const chip of chips) {
      const chipBtn = screen.getByText(chip.text);
      fireEvent.click(chipBtn);
      const input = screen.getByTestId('chat-input');
      expect((input as any).value).toBe(chip.expected); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  });

  it('handles image attachments', async () => {
    render(<Chat onLogParsed={mockOnLogParsed} />);
    await waitForLoader();

    const photoBtn = screen.getByLabelText(/Attach images/i);
    const fileInput = photoBtn.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    const removeBtn = await screen.findByLabelText('Remove test.jpg', {}, { timeout: 5000 });
    expect(removeBtn).toBeDefined();

    fireEvent.click(removeBtn);
    await waitFor(() => {
        expect(screen.queryByLabelText('Remove test.jpg')).toBeNull();
    }, { timeout: 5000 });
  });
});

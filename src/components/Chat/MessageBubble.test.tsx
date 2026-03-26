import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MessageBubble } from './MessageBubble';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, layout, ...props }: any) => <div {...props} style={style}>{children}</div>,
  },
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="mock-image" />,
}));

describe('MessageBubble Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a user message correctly', () => {
    const msg = {
      id: '1',
      role: 'user' as const,
      text: 'Tested the user message component',
      timestamp: '10:00 AM',
    };
    render(<MessageBubble msg={msg} isFirstInGroup={true} />);
    expect(screen.getByText('Tested the user message component')).toBeDefined();
    expect(screen.getByText('10:00 AM')).toBeDefined();
  });

  it('renders a model message correctly', () => {
    const msg = {
      id: '2',
      role: 'model' as const,
      text: 'Here is your response',
      timestamp: '10:01 AM',
    };
    render(<MessageBubble msg={msg} isFirstInGroup={true} />);
    expect(screen.getByText('Here is your response')).toBeDefined();
  });

  it('renders attachments', () => {
    const msg = {
      id: '3',
      role: 'user' as const,
      text: 'Look at this photo',
      timestamp: '10:02 AM',
      attachments: [
        { id: 'att1', file: new File([], 'img.png'), previewUrl: 'preview.png', mediaType: 'image/png', name: 'img.png', base64: 'data:image/png;base64,foo' },
      ],
    };
    render(<MessageBubble msg={msg} isFirstInGroup={true} />);
    expect(screen.getByTestId('mock-image')).toBeDefined();
    expect(screen.getByText('Look at this photo')).toBeDefined();
  });

  it('renders standard welcome message formatted incorrectly if not new user', () => {
    const msg = {
      id: 'welcome-msg',
      role: 'model' as const,
      text: 'Welcome text that is overridden',
      timestamp: '10:03 AM',
    };
    // The specific logic renders custom JSX if id="welcome-msg" and !isNewUser
    render(<MessageBubble msg={msg} isFirstInGroup={true} isNewUser={false} />);
    expect(screen.getByText(/speak naturally to log anything/i)).toBeDefined();
  });
});

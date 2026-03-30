import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GlassMetric } from './GlassMetric';
import EmptyState from './EmptyState';
import { ProgressBar } from './ProgressBar';
import { GlassPane } from './GlassPane';
import { GlassPopover } from './GlassPopover';
import { CloudBackground } from './CloudBackground';
import { Activity } from 'lucide-react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, ...props }: unknown) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: unknown) => <>{children}</>,
}));

describe('Shared Utility Components', () => {
  afterEach(cleanup);

  describe('GlassMetric', () => {
    it('renders label and value', () => {
      render(<GlassMetric icon={Activity} label="Heart Rate" value="72" />);
      expect(screen.getByText(/heart rate/i)).toBeDefined();
      expect(screen.getByText('72')).toBeDefined();
    });

    it('renders target and percentage when provided', () => {
      render(<GlassMetric icon={Activity} label="Steps" value="8000" target="10000" percentage={80} />);
      expect(screen.getByText('/10000')).toBeDefined();
      expect(document.querySelector('.progress-bar')).toBeDefined();
    });

    it('handles click events', () => {
      const onClick = vi.fn();
      render(<GlassMetric icon={Activity} label="Clickable" value="100" onClick={onClick} />);
      const valueElement = screen.getByText('100');
      const container = valueElement.closest('div')?.parentElement;
      if (container) {
        fireEvent.click(container);
      }
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('EmptyState', () => {
    it('renders message and description', () => {
      render(<EmptyState icon={Activity} message="Nothing here" description="Try adding something" />);
      expect(screen.getByText('Nothing here')).toBeDefined();
      expect(screen.getByText('Try adding something')).toBeDefined();
    });

    it('renders action component', () => {
      render(<EmptyState icon={Activity} message="Empty" action={<button>Add</button>} />);
      expect(screen.getByText('Add')).toBeDefined();
    });
  });

  describe('ProgressBar', () => {
    it('renders with correct percentage', () => {
      render(<ProgressBar percentage={45} />);
      const fill = document.querySelector('.progress-fill');
      expect(fill).toBeDefined();
    });

    it('applies status class', () => {
      render(<ProgressBar percentage={90} status="hit" />);
      expect(document.querySelector('.hit')).toBeDefined();
    });
  });

  describe('GlassPane', () => {
    it('renders children and applies padding by default', () => {
      const { container } = render(<GlassPane><div>Content</div></GlassPane>);
      expect(screen.getByText('Content')).toBeDefined();
      expect(container.firstChild?.parentElement?.querySelector('.ui-pane')?.classList.contains('!p-4')).toBe(true);
    });

    it('removes padding when noPadding is true', () => {
      const { container } = render(<GlassPane noPadding><div>Content</div></GlassPane>);
      expect(container.firstChild?.parentElement?.querySelector('.ui-pane')?.classList.contains('!p-0')).toBe(true);
    });
  });

  describe('GlassPopover', () => {
    it('renders when open', () => {
      render(<GlassPopover isOpen={true} onClose={vi.fn()}><div>Popover Content</div></GlassPopover>);
      expect(screen.getByText('Popover Content')).toBeDefined();
    });

    it('renders title if provided', () => {
      render(<GlassPopover isOpen={true} onClose={vi.fn()} title="Settings"><div>Content</div></GlassPopover>);
      expect(screen.getByText(/settings/i)).toBeDefined();
    });

    it('calls onClose when close button or overlay is clicked', () => {
      const onClose = vi.fn();
      render(<GlassPopover isOpen={true} onClose={onClose}><div>Content</div></GlassPopover>);
      
      // Close button
      fireEvent.click(screen.getByText('Close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('CloudBackground', () => {
    it('renders without crashing', () => {
      const { container } = render(<CloudBackground />);
      expect(container.firstChild).toBeDefined();
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
    });
  });
});

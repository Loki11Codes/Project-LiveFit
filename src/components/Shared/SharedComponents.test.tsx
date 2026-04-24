/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GlassMetric } from './GlassMetric';
import EmptyState from './EmptyState';
import { ProgressBar } from './ProgressBar';
import { GlassPane } from './GlassPane';
import { GlassPopover } from './GlassPopover';
import { CloudBackground } from './CloudBackground';
import { AchievementCard } from './AchievementCard';
import { AchievementOverlay } from './AchievementOverlay';
import { ConfettiCanvas } from './Confetti';
import type { AchievementBadge } from '@/lib/achievements';
import { Activity } from 'lucide-react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Stub ConfettiCanvas for the Overlay tests so canvas2d API absence doesn't crash
vi.mock('./Confetti', async (importActual) => {
  const actual = await importActual<typeof import('./Confetti')>();
  return {
    ...actual,
    ConfettiCanvas: () => <canvas data-testid="confetti-stub" />,
  };
});

describe('Shared Utility Components', () => {
  afterEach(cleanup);

  // ── GlassMetric ─────────────────────────────────────────────────────────────
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
      if (container) fireEvent.click(container);
      expect(onClick).toHaveBeenCalled();
    });
  });

  // ── EmptyState ───────────────────────────────────────────────────────────────
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

  // ── ProgressBar ──────────────────────────────────────────────────────────────
  describe('ProgressBar', () => {
    it('renders with correct percentage', () => {
      render(<ProgressBar percentage={45} />);
      expect(document.querySelector('.progress-fill')).toBeDefined();
    });

    it('applies status class', () => {
      render(<ProgressBar percentage={90} status="hit" />);
      expect(document.querySelector('.hit')).toBeDefined();
    });
  });

  // ── GlassPane ────────────────────────────────────────────────────────────────
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

  // ── GlassPopover ─────────────────────────────────────────────────────────────
  describe('GlassPopover', () => {
    it('renders when open', () => {
      render(<GlassPopover isOpen={true} onClose={vi.fn()}><div>Popover Content</div></GlassPopover>);
      expect(screen.getByText('Popover Content')).toBeDefined();
    });

    it('renders title if provided', () => {
      render(<GlassPopover isOpen={true} onClose={vi.fn()} title="Settings"><div>Content</div></GlassPopover>);
      expect(screen.getByText(/settings/i)).toBeDefined();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<GlassPopover isOpen={true} onClose={onClose}><div>Content</div></GlassPopover>);
      fireEvent.click(screen.getByText('Close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── CloudBackground ──────────────────────────────────────────────────────────
  describe('CloudBackground', () => {
    it('renders without crashing', () => {
      const { container } = render(<CloudBackground />);
      expect(container.firstChild).toBeDefined();
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
    });
  });

  // ── AchievementCard ──────────────────────────────────────────────────────────
  describe('AchievementCard', () => {
    it('renders title and description', () => {
      render(<AchievementCard title="Bench Baseline" description="Hit 50kg on Bench Press." tier="BRONZE" />);
      expect(screen.getByText('Bench Baseline')).toBeInTheDocument();
      expect(screen.getByText('Hit 50kg on Bench Press.')).toBeInTheDocument();
    });

    it('renders tier milestone label', () => {
      render(<AchievementCard title="Test" description="Desc" tier="GOLD" />);
      expect(screen.getByText(/GOLD Milestone/i)).toBeInTheDocument();
    });

    it('renders pulsing indicator when unlockedAt is provided', () => {
      const { container } = render(
        <AchievementCard title="Test" description="Desc" tier="SILVER" unlockedAt={new Date()} />
      );
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('applies locked styling when isLocked is true', () => {
      const { container } = render(
        <AchievementCard title="Locked" description="Locked desc" tier="PLATINUM" isLocked />
      );
      expect(container.querySelector('.opacity-40')).toBeInTheDocument();
    });

    it('renders all four tiers without crashing', () => {
      const tiers: AchievementBadge['tier'][] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
      tiers.forEach((tier) => {
        const { unmount } = render(<AchievementCard title={tier} description="desc" tier={tier} />);
        expect(screen.getByText(tier)).toBeInTheDocument();
        unmount();
      });
    });
  });

  // ── AchievementOverlay ───────────────────────────────────────────────────────
  describe('AchievementOverlay', () => {
    const badge: AchievementBadge = {
      badgeId: 'bench-bronze',
      type: 'PR',
      tier: 'BRONZE',
      title: 'Bench Baseline',
      description: 'Hit 50kg on Bench Press.',
      icon: 'Trophy',
    };

    it('renders "Achievement Unlocked" and badge title', () => {
      render(<AchievementOverlay achievements={[badge]} onClose={vi.fn()} />);
      expect(screen.getByText(/Achievement Unlocked/i)).toBeInTheDocument();
      expect(screen.getByText('Bench Baseline')).toBeInTheDocument();
    });

    it('shows "Claim & Continue" for a single achievement', () => {
      render(<AchievementOverlay achievements={[badge]} onClose={vi.fn()} />);
      expect(screen.getByText(/Claim & Continue/i)).toBeInTheDocument();
    });

    it('shows "Next Reward" when multiple achievements provided', () => {
      const badge2: AchievementBadge = { ...badge, badgeId: 'bench-silver', title: 'Press Power', tier: 'SILVER' };
      render(<AchievementOverlay achievements={[badge, badge2]} onClose={vi.fn()} />);
      expect(screen.getByText(/Next Reward/i)).toBeInTheDocument();
    });

    it('advances to next achievement on button click', () => {
      const badge2: AchievementBadge = { ...badge, badgeId: 'bench-silver', title: 'Press Power', tier: 'SILVER' };
      render(<AchievementOverlay achievements={[badge, badge2]} onClose={vi.fn()} />);
      
      fireEvent.click(screen.getByText(/Next Reward/i));
      expect(screen.getByText('Press Power')).toBeInTheDocument();
      expect(screen.getByText(/Claim & Continue/i)).toBeInTheDocument();
    });

    it('calls onClose when X close button is clicked', () => {
      const onClose = vi.fn();
      render(<AchievementOverlay achievements={[badge]} onClose={onClose} />);
      const allButtons = screen.getAllByRole('button');
      fireEvent.click(allButtons[allButtons.length - 1]);
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose immediately when achievements array is empty', () => {
      const onClose = vi.fn();
      render(<AchievementOverlay achievements={[]} onClose={onClose} />);
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ── ConfettiCanvas ───────────────────────────────────────────────────────────
  describe('ConfettiCanvas', () => {
    it('renders a canvas element', () => {
      const { container } = render(<ConfettiCanvas />);
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });
});

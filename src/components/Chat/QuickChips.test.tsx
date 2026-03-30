/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { QuickChips, QuickChip } from './QuickChips';
import { Coffee } from 'lucide-react';

describe('QuickChips Components', () => {
  afterEach(cleanup);

  it('QuickChip renders and handles click', () => {
    const onClick = vi.fn();
    render(<QuickChip icon={Coffee} label="Test Chip" onClick={onClick} />);
    fireEvent.click(screen.getByText('Test Chip'));
    expect(onClick).toHaveBeenCalled();
  });

  it('QuickChips list renders and triggers onSelect', () => {
    const onSelect = vi.fn();
    render(<QuickChips onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Breakfast'));
    expect(onSelect).toHaveBeenCalledWith('Log my breakfast');
  });
});


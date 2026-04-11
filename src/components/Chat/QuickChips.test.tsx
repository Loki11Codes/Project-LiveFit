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

  it('QuickChips list renders and triggers onSelect for multiple chips', () => {
    const onSelect = vi.fn();
    render(<QuickChips onSelect={onSelect} />);
    
    // Test a few specific chips
    fireEvent.click(screen.getByText('Breakfast'));
    expect(onSelect).toHaveBeenCalledWith('Log my breakfast');

    fireEvent.click(screen.getByText('Water'));
    expect(onSelect).toHaveBeenCalledWith('Log 500ml of water');

    fireEvent.click(screen.getByText('Weight'));
    expect(onSelect).toHaveBeenCalledWith('Update my weight measurement');

    fireEvent.click(screen.getByText('Stats'));
    expect(onSelect).toHaveBeenCalledWith('How are my stats for today?');
    
    fireEvent.click(screen.getByText('Delete'));
    expect(onSelect).toHaveBeenCalledWith('Delete my last food log');
  });
});


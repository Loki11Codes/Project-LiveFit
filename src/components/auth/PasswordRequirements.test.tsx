import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PasswordRequirements } from './PasswordRequirements';

const allFalse = {
  minimumLength: false,
  hasUpper: false,
  hasLower: false,
  hasNumber: false,
  hasSpecial: false,
};

const allTrue = {
  minimumLength: true,
  hasUpper: true,
  hasLower: true,
  hasNumber: true,
  hasSpecial: true,
};

describe('PasswordRequirements', () => {
  it('renders all 5 requirement labels', () => {
    render(<PasswordRequirements passwordChecks={allFalse} />);
    expect(screen.getByText('12+ characters')).toBeInTheDocument();
    expect(screen.getByText('Uppercase [A-Z]')).toBeInTheDocument();
    expect(screen.getByText('Lowercase [a-z]')).toBeInTheDocument();
    expect(screen.getByText('One number [0-9]')).toBeInTheDocument();
    expect(screen.getByText(/Special char/i)).toBeInTheDocument();
  });

  it('renders "Security Requirements" heading', () => {
    render(<PasswordRequirements passwordChecks={allFalse} />);
    expect(screen.getByText(/Security Requirements/i)).toBeInTheDocument();
  });

  it('applies green text colour class when a check is met', () => {
    const { container } = render(<PasswordRequirements passwordChecks={{ ...allFalse, minimumLength: true }} />);
    // The first requirement row should have the met colour applied
    const rows = container.querySelectorAll('[class*="text-[#0f6e56]"]');
    // At minimum one element (the icon + label pair) should carry the green class
    expect(rows.length).toBeGreaterThan(0);
  });

  it('does not apply green class when check is not met', () => {
    const { container } = render(<PasswordRequirements passwordChecks={allFalse} />);
    const rows = container.querySelectorAll('[class*="text-[#0f6e56]"]');
    expect(rows.length).toBe(0);
  });

  it('applies green to all rows when all checks are met', () => {
    const { container } = render(<PasswordRequirements passwordChecks={allTrue} />);
    // 5 requirement rows should all carry the met class
    const rows = container.querySelectorAll('[class*="text-[#0f6e56]"]');
    // Each row has the div + the icon, so ≥ 5 elements
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it('uses smaller size variant when size="sm"', () => {
    const { container } = render(<PasswordRequirements passwordChecks={allFalse} size="sm" />);
    expect(container.querySelector('.text-\\[11px\\]')).toBeInTheDocument();
  });

  it('uses default (md) size when size prop is omitted', () => {
    const { container } = render(<PasswordRequirements passwordChecks={allFalse} />);
    expect(container.querySelector('.text-\\[12px\\]')).toBeInTheDocument();
  });
});

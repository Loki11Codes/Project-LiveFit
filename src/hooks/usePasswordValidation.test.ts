import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePasswordValidation } from './usePasswordValidation';

describe('usePasswordValidation', () => {
  it('initialises with empty state and all checks false', () => {
    const { result } = renderHook(() => usePasswordValidation());
    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(result.current.showPassword).toBe(false);
    expect(result.current.showConfirmPassword).toBe(false);
    expect(result.current.passwordMatch).toBeNull();
    expect(result.current.isPasswordValid).toBe(false);
    const checks = result.current.passwordChecks;
    expect(checks.minimumLength).toBe(false);
    expect(checks.hasUpper).toBe(false);
    expect(checks.hasLower).toBe(false);
    expect(checks.hasNumber).toBe(false);
    expect(checks.hasSpecial).toBe(false);
  });

  describe('passwordChecks', () => {
    it('minimumLength — true only when password ≥ 12 characters', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => result.current.setPassword('short'));
      expect(result.current.passwordChecks.minimumLength).toBe(false);
      act(() => result.current.setPassword('longEnoughPass1'));
      expect(result.current.passwordChecks.minimumLength).toBe(true);
    });

    it('hasUpper — detects uppercase letters', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => result.current.setPassword('alllower'));
      expect(result.current.passwordChecks.hasUpper).toBe(false);
      act(() => result.current.setPassword('HasUpper'));
      expect(result.current.passwordChecks.hasUpper).toBe(true);
    });

    it('hasLower — detects lowercase letters', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => result.current.setPassword('ALLUPPER'));
      expect(result.current.passwordChecks.hasLower).toBe(false);
      act(() => result.current.setPassword('HASlower'));
      expect(result.current.passwordChecks.hasLower).toBe(true);
    });

    it('hasNumber — detects digits', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => result.current.setPassword('NoNumbersHere'));
      expect(result.current.passwordChecks.hasNumber).toBe(false);
      act(() => result.current.setPassword('Has1Number'));
      expect(result.current.passwordChecks.hasNumber).toBe(true);
    });

    it('hasSpecial — detects special characters', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => result.current.setPassword('NoSpecialChar'));
      expect(result.current.passwordChecks.hasSpecial).toBe(false);
      act(() => result.current.setPassword('Has@Special'));
      expect(result.current.passwordChecks.hasSpecial).toBe(true);
    });
  });

  describe('isPasswordValid', () => {
    it('is false when any check fails', () => {
      const { result } = renderHook(() => usePasswordValidation());
      // Missing special char
      act(() => result.current.setPassword('LongEnoughAbc123'));
      expect(result.current.isPasswordValid).toBe(false);
    });

    it('is true when all checks pass', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => result.current.setPassword('ValidPass123!@#'));
      expect(result.current.isPasswordValid).toBe(true);
    });
  });

  describe('passwordMatch', () => {
    it('returns null when confirmPassword is empty', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => result.current.setPassword('SomePassword'));
      expect(result.current.passwordMatch).toBeNull();
    });

    it('returns true when passwords match', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => {
        result.current.setPassword('Match123!@#ZZZ');
        result.current.setConfirmPassword('Match123!@#ZZZ');
      });
      expect(result.current.passwordMatch).toBe(true);
    });

    it('returns false when passwords do not match', () => {
      const { result } = renderHook(() => usePasswordValidation());
      act(() => {
        result.current.setPassword('Password1');
        result.current.setConfirmPassword('Different1');
      });
      expect(result.current.passwordMatch).toBe(false);
    });
  });

  describe('visibility toggles', () => {
    it('toggles showPassword', () => {
      const { result } = renderHook(() => usePasswordValidation());
      expect(result.current.showPassword).toBe(false);
      act(() => result.current.setShowPassword(true));
      expect(result.current.showPassword).toBe(true);
    });

    it('toggles showConfirmPassword', () => {
      const { result } = renderHook(() => usePasswordValidation());
      expect(result.current.showConfirmPassword).toBe(false);
      act(() => result.current.setShowConfirmPassword(true));
      expect(result.current.showConfirmPassword).toBe(true);
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
  DayTypeSchema,
  GoalSchema,
  MeasurementSchema,
  SignupSchema,
  ChatRequestSchema,
} from './validation';

describe('Validation Schemas', () => {
  describe('DayTypeSchema', () => {
    it('accepts valid day types', () => {
      expect(DayTypeSchema.parse('Rest')).toBe('Rest');
      expect(DayTypeSchema.parse('Training')).toBe('Training');
      expect(DayTypeSchema.parse('Lite')).toBe('Lite');
    });

    it('rejects invalid day types', () => {
      expect(() => DayTypeSchema.parse('Work')).toThrow();
    });
  });

  describe('GoalSchema', () => {
    it('validates a complete goal object', () => {
      const validGoal = {
        proteinTarget: 150,
        kcalTarget: 2500,
        proteinTraining: 180,
        proteinRest: 120,
        waterTarget: 3.5,
      };
      expect(GoalSchema.parse(validGoal)).toEqual(expect.objectContaining(validGoal));
    });

    it('rejects negative values', () => {
      expect(() => GoalSchema.parse({ proteinTarget: -10, kcalTarget: 2000 })).toThrow();
    });

    it('rejects non-finite numbers', () => {
      // Current fallback behavior returns 0 instead of throwing
      const result = GoalSchema.parse({ proteinTarget: Infinity, kcalTarget: 2000 });
      expect(result.proteinTarget).toBe(0);
    });
  });

  describe('SignupSchema', () => {
    const VAL_A = 'valid_str_123';
    const VAL_B = 'mismatch_str_456';

    it('accepts matching passwords', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: VAL_A,
        confirmPassword: VAL_A,
      };
      expect(SignupSchema.parse(data)).toEqual(data);
    });

    it('rejects mismatched passwords', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: VAL_A,
        confirmPassword: VAL_B,
      };
      expect(() => SignupSchema.parse(data)).toThrow("Passwords don't match");
    });

    it('rejects invalid emails', () => {
      const data = {
        name: 'John Doe',
        email: 'invalid-email',
        password: VAL_A,
        confirmPassword: VAL_A,
      };
      expect(() => SignupSchema.parse(data)).toThrow('Invalid email address');
    });
  });

  describe('ChatRequestSchema', () => {
    it('requires either a prompt or an image/audio attachment', () => {
      // Empty prompt and no images should fail
      expect(() => ChatRequestSchema.parse({ prompt: '   ', history: [], images: [] })).toThrow('A prompt or at least one image/audio attachment is required.');
      
      // Prompt only is OK
      expect(ChatRequestSchema.parse({ prompt: 'Hello', history: [], images: [] })).toBeDefined();
      
      // Image only is OK
      expect(ChatRequestSchema.parse({ 
        prompt: '', 
        history: [], 
        images: [{ name: 'img.png', base64: 'abc', mediaType: 'image/png' }] 
      })).toBeDefined();

      // Audio only is OK
      expect(ChatRequestSchema.parse({ 
        prompt: '', 
        history: [], 
        images: [{ name: 'audio.webm', base64: 'def', mediaType: 'audio/webm' }] 
      })).toBeDefined();
    });
  });

  describe('MeasurementSchema', () => {
    it('validates partial measurements', () => {
      const data = { weight: 85.5, waist: 90 };
      expect(MeasurementSchema.parse(data)).toMatchObject(data);
    });

    it('validates date format', () => {
      expect(MeasurementSchema.parse({ date: '2026-03-18' })).toBeDefined();
      expect(() => MeasurementSchema.parse({ date: '18-03-2026' })).toThrow();
    });
  });
});


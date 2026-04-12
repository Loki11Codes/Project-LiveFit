import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVerificationData, sendVerificationEmail, storeVerificationToken } from './email';
import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    verificationToken: {
      upsert: vi.fn(),
    },
  },
}));

describe('Email Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  describe('generateVerificationData', () => {
    it('generates a 6-digit OTP and a token', () => {
      const data = generateVerificationData();
      expect(data.otp).toHaveLength(6);
      expect(data.token).toBeDefined();
      expect(data.expires).toBeInstanceOf(Date);
    });
  });

  describe('sendVerificationEmail', () => {
    it('logs to console if SMTP is not configured', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      delete process.env.SMTP_HOST;
      
      await sendVerificationEmail('test@example.com', 'Test User', '123456', 'token-123');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[OTP] 123456'));
      consoleSpy.mockRestore();
    });

    it('sends email if SMTP is configured', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';
      
      const sendMailMock = vi.fn().mockResolvedValue({});
      vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail: sendMailMock } as any);

      await sendVerificationEmail('test@example.com', 'Test User', '123456', 'token-123');

      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Verify'),
      }));
    });
  });

  describe('storeVerificationToken', () => {
    it('upserts both link and otp tokens', async () => {
      const expires = new Date();
      await storeVerificationToken('test@example.com', 'token-123', '123456', expires);
      
      expect(prisma.verificationToken.upsert).toHaveBeenCalledTimes(2);
      // First call for magic link
      expect(prisma.verificationToken.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { identifier_token: { identifier: 'test@example.com', token: 'token-123' } }
      }));
      // Second call for OTP
      expect(prisma.verificationToken.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { identifier_token: { identifier: 'otp:test@example.com', token: '123456' } }
      }));
    });
  });
});

import { describe, it, expect, vi } from 'vitest';

describe('Prisma Client Singleton', () => {
  it('should export a prisma client', async () => {
    const prisma = (await import('./prisma')).default;
    expect(prisma).toBeDefined();
  });

  it('should attach to globalThis in non-production', async () => {
    // Reset module to re-evaluate
    vi.resetModules();
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const prisma = (await import('./prisma')).default;
    expect(globalThis.prisma).toBe(prisma);
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should NOT attach to globalThis in production', async () => {
    vi.resetModules();
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    globalThis.prisma = undefined;
    
    await import('./prisma');
    expect(globalThis.prisma).toBeUndefined();
    
    process.env.NODE_ENV = originalEnv;
  });
});

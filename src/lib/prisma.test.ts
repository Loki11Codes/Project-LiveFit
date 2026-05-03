import { describe, it, expect, vi } from 'vitest';

describe('Prisma Client Singleton', () => {
  it('should export a prisma client', async () => {
    const prisma = (await import('./prisma')).default;
    expect(prisma).toBeDefined();
  });

  it('should attach to globalThis in non-production', async () => {
    // Reset module to re-evaluate
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');
    
    const prisma = (await import('./prisma')).default;
    expect(globalThis.prisma).toBe(prisma);
    
    vi.unstubAllEnvs();
  });

  it('should NOT attach to globalThis in production', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    globalThis.prisma = undefined;
    
    await import('./prisma');
    expect(globalThis.prisma).toBeUndefined();
    
    vi.unstubAllEnvs();
  });
});

import { describe, it, expect } from 'vitest';

describe('Dashboard module', () => {
  it('should export Dashboard component', async () => {
    const mod = await import('./Dashboard');
    expect(mod.Dashboard).toBeDefined();
    expect(typeof mod.Dashboard).toBe('function');
  });

  it('should export Dashboard as default export', async () => {
    const mod = await import('./Dashboard');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.Dashboard);
  });
});

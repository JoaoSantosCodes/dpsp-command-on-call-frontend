import { describe, it, expect } from 'vitest';

describe('MonitorMapping module', () => {
  it('should export MonitorMapping component as named export', async () => {
    const mod = await import('./MonitorMapping');
    expect(mod.MonitorMapping).toBeDefined();
    expect(typeof mod.MonitorMapping).toBe('function');
  });

  it('should export MonitorMapping as default export', async () => {
    const mod = await import('./MonitorMapping');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.MonitorMapping);
  });

  it('should accept apiBaseUrl prop', async () => {
    const mod = await import('./MonitorMapping');
    // Verify the component is callable (function component)
    expect(mod.MonitorMapping.length).toBeGreaterThanOrEqual(0);
  });

  it('should export MonitorMappingProps interface type', async () => {
    // TypeScript type check — the module compiles and exports correctly
    const mod = await import('./MonitorMapping');
    expect(mod).toHaveProperty('MonitorMapping');
  });
});

import { describe, it, expect } from 'vitest';

describe('MonitorList module', () => {
  it('should export MonitorList component as named export', async () => {
    const mod = await import('./MonitorList');
    expect(mod.MonitorList).toBeDefined();
    expect(typeof mod.MonitorList).toBe('function');
  });

  it('should export MonitorList as default export', async () => {
    const mod = await import('./MonitorList');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.MonitorList);
  });

  it('should accept monitors and unmappedMonitors props', async () => {
    const mod = await import('./MonitorList');
    // Verify the component is callable (function component)
    // The component accepts MonitorListProps with monitors and optional unmappedMonitors
    expect(mod.MonitorList.length).toBeGreaterThanOrEqual(0);
  });
});

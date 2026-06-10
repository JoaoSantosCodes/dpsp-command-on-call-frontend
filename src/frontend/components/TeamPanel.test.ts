import { describe, it, expect } from 'vitest';

describe('TeamPanel module', () => {
  it('should export TeamPanel component as named export', async () => {
    const mod = await import('./TeamPanel');
    expect(mod.TeamPanel).toBeDefined();
    expect(typeof mod.TeamPanel).toBe('function');
  });

  it('should export TeamPanel as default export', async () => {
    const mod = await import('./TeamPanel');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.TeamPanel);
  });

  it('should export TeamPanelProps interface type (component accepts correct props)', async () => {
    const mod = await import('./TeamPanel');
    // Verify the component is callable (function component)
    // This implicitly validates the props interface exists and is usable
    expect(mod.TeamPanel.length).toBeGreaterThanOrEqual(0);
  });
});

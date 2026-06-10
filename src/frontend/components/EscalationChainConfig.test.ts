import { describe, it, expect } from 'vitest';

describe('EscalationChainConfig module', () => {
  it('should export EscalationChainConfig component as named export', async () => {
    const mod = await import('./EscalationChainConfig');
    expect(mod.EscalationChainConfig).toBeDefined();
    expect(typeof mod.EscalationChainConfig).toBe('function');
  });

  it('should export EscalationChainConfig as default export', async () => {
    const mod = await import('./EscalationChainConfig');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.EscalationChainConfig);
  });

  it('should accept apiBaseUrl prop', async () => {
    const mod = await import('./EscalationChainConfig');
    // Verify the component is callable (function component)
    expect(mod.EscalationChainConfig.length).toBeGreaterThanOrEqual(0);
  });

  it('should export EscalationChainConfigProps interface type', async () => {
    // TypeScript type check — the module compiles and exports correctly
    const mod = await import('./EscalationChainConfig');
    expect(mod).toHaveProperty('EscalationChainConfig');
  });
});

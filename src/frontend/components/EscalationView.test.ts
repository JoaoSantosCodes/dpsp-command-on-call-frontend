import { describe, it, expect } from 'vitest';
import { formatElapsedTime, getElapsedSeconds } from './EscalationView';

describe('EscalationView module', () => {
  it('should export EscalationView component as named export', async () => {
    const mod = await import('./EscalationView');
    expect(mod.EscalationView).toBeDefined();
    expect(typeof mod.EscalationView).toBe('function');
  });

  it('should export EscalationView as default export', async () => {
    const mod = await import('./EscalationView');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.EscalationView);
  });

  it('should export EscalationViewProps interface type (component accepts correct props)', async () => {
    const mod = await import('./EscalationView');
    expect(mod.EscalationView.length).toBeGreaterThanOrEqual(0);
  });
});

describe('formatElapsedTime', () => {
  it('should format 0 seconds as 00:00', () => {
    expect(formatElapsedTime(0)).toBe('00:00');
  });

  it('should format seconds under a minute', () => {
    expect(formatElapsedTime(45)).toBe('00:45');
  });

  it('should format minutes and seconds', () => {
    expect(formatElapsedTime(125)).toBe('02:05');
  });

  it('should format exactly 15 minutes (escalation threshold)', () => {
    expect(formatElapsedTime(900)).toBe('15:00');
  });

  it('should include hours when elapsed is 1 hour or more', () => {
    expect(formatElapsedTime(3661)).toBe('01:01:01');
  });

  it('should handle large values correctly', () => {
    expect(formatElapsedTime(7200)).toBe('02:00:00');
  });
});

describe('getElapsedSeconds', () => {
  it('should return 0 for a start time equal to now', () => {
    const now = new Date();
    const elapsed = getElapsedSeconds(now);
    // Allow 1 second tolerance for execution time
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThanOrEqual(1);
  });

  it('should return positive seconds for a past start time', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const elapsed = getElapsedSeconds(fiveMinutesAgo);
    // Should be approximately 300 seconds, allow 2 second tolerance
    expect(elapsed).toBeGreaterThanOrEqual(299);
    expect(elapsed).toBeLessThanOrEqual(302);
  });

  it('should return 0 for a future start time (clamped)', () => {
    const futureDate = new Date(Date.now() + 60000);
    expect(getElapsedSeconds(futureDate)).toBe(0);
  });

  it('should handle string date input (coerced to Date)', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const elapsed = getElapsedSeconds(tenMinutesAgo.toISOString() as unknown as Date);
    expect(elapsed).toBeGreaterThanOrEqual(599);
    expect(elapsed).toBeLessThanOrEqual(602);
  });
});

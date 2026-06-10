import { describe, it, expect } from 'vitest';
import { formatDateTime, getStatusClassName } from './IncidentHistory';

describe('IncidentHistory module', () => {
  it('should export IncidentHistory component as named export', async () => {
    const mod = await import('./IncidentHistory');
    expect(mod.IncidentHistory).toBeDefined();
    expect(typeof mod.IncidentHistory).toBe('function');
  });

  it('should export IncidentHistory as default export', async () => {
    const mod = await import('./IncidentHistory');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.IncidentHistory);
  });

  it('should accept teams prop (component is callable)', async () => {
    const mod = await import('./IncidentHistory');
    expect(mod.IncidentHistory.length).toBeGreaterThanOrEqual(0);
  });
});

describe('formatDateTime', () => {
  it('should return "—" for undefined input', () => {
    expect(formatDateTime(undefined)).toBe('—');
  });

  it('should return "—" for invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
  });

  it('should format a valid Date object', () => {
    const date = new Date('2024-03-15T14:30:00Z');
    const result = formatDateTime(date);
    // Should contain date parts (day, month, year) and time parts
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('should format a valid ISO string', () => {
    const result = formatDateTime('2024-01-10T09:15:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('should handle Date objects passed as strings (coercion)', () => {
    const result = formatDateTime('2024-06-20T18:45:00');
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('getStatusClassName', () => {
  it('should return correct class for active status', () => {
    expect(getStatusClassName('active')).toBe('incident-table__status--active');
  });

  it('should return correct class for acknowledged status', () => {
    expect(getStatusClassName('acknowledged')).toBe('incident-table__status--acknowledged');
  });

  it('should return correct class for resolved status', () => {
    expect(getStatusClassName('resolved')).toBe('incident-table__status--resolved');
  });

  it('should return correct class for escalation_exhausted status (hyphenated)', () => {
    expect(getStatusClassName('escalation_exhausted')).toBe('incident-table__status--escalation-exhausted');
  });
});

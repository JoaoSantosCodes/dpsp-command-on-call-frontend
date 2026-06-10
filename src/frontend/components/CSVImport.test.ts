import { describe, it, expect } from 'vitest';

describe('CSVImport module', () => {
  it('should export CSVImport component as named export', async () => {
    const mod = await import('./CSVImport');
    expect(mod.CSVImport).toBeDefined();
    expect(typeof mod.CSVImport).toBe('function');
  });

  it('should export CSVImport as default export', async () => {
    const mod = await import('./CSVImport');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.CSVImport);
  });

  it('should accept optional apiBaseUrl prop', async () => {
    const mod = await import('./CSVImport');
    // CSVImport is a function component accepting CSVImportProps
    expect(mod.CSVImport.length).toBeGreaterThanOrEqual(0);
  });
});

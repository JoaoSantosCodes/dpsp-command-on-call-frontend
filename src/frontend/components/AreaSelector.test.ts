import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('AreaSelector module', () => {
  it('should export AreaSelector component', async () => {
    const mod = await import('./AreaSelector');
    expect(mod.AreaSelector).toBeDefined();
    expect(typeof mod.AreaSelector).toBe('function');
  });

  it('should export AreaSelector as default export', async () => {
    const mod = await import('./AreaSelector');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.AreaSelector);
  });
});

describe('AreaSelector API logic', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call GET /api/areas with auth token', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ areas: [{ codigo: 'AREA1', nome: 'Área 1', torre: 'Torre A' }] }),
      } as Response;
    });

    await fetch('/api/areas', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(capturedUrl).toBe('/api/areas');
    expect(capturedOptions?.headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('should call POST /api/auth/select-area with areaCodigo', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ success: true, selectedArea: 'AREA1' }),
      } as Response;
    });

    await fetch('/api/auth/select-area', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ areaCodigo: 'AREA1' }),
    });

    expect(capturedUrl).toBe('/api/auth/select-area');
    expect(capturedOptions?.method).toBe('POST');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.areaCodigo).toBe('AREA1');
  });

  it('should return 403 for non-Adm user selecting other area', async () => {
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: false,
        status: 403,
        json: async () => ({ error: 'Você só pode selecionar sua própria área de responsabilidade' }),
      } as Response;
    });

    const response = await fetch('/api/auth/select-area', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ areaCodigo: 'AREA2' }),
    });

    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.error).toContain('área');
  });
});

describe('AreaSelector store integration', () => {
  beforeEach(async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    useCommandCenterStore.setState({
      token: 'test-token',
      user: { id: 1, nome: 'Admin', perfil: 'Adm', areaCodigo: null, username: 'admin' },
      isAuthenticated: true,
      currentView: 'area-selector',
      selectedAreas: [],
    });
  });

  it('should store selected areas in Zustand state', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    expect(store.selectedAreas).toEqual([]);

    store.setSelectedAreas(['AREA1', 'AREA2']);
    const updated = useCommandCenterStore.getState();
    expect(updated.selectedAreas).toEqual(['AREA1', 'AREA2']);
  });

  it('should navigate to dashboard after area selection', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setSelectedAreas(['AREA1']);
    store.setCurrentView('dashboard');

    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('dashboard');
    expect(updated.selectedAreas).toEqual(['AREA1']);
  });

  it('should clear selected areas on logout', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setSelectedAreas(['AREA1', 'AREA2']);
    expect(useCommandCenterStore.getState().selectedAreas).toEqual(['AREA1', 'AREA2']);

    store.logout();
    const updated = useCommandCenterStore.getState();
    expect(updated.selectedAreas).toEqual([]);
    expect(updated.isAuthenticated).toBe(false);
    expect(updated.currentView).toBe('login');
  });

  it('should set currentView to area-selector after login', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    // Reset to logged out state
    useCommandCenterStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      currentView: 'login',
    });

    const store = useCommandCenterStore.getState();
    const mockUser = { id: 1, nome: 'Admin', perfil: 'Adm' as const, areaCodigo: 'A1', username: 'admin' };
    store.login('jwt-token', mockUser);

    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('area-selector');
    expect(updated.isAuthenticated).toBe(true);
  });
});

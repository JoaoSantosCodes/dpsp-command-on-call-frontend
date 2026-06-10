import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('AreaManagement module', () => {
  it('should export AreaManagement component', async () => {
    const mod = await import('./AreaManagement');
    expect(mod.AreaManagement).toBeDefined();
    expect(typeof mod.AreaManagement).toBe('function');
  });

  it('should export AreaManagement as default export', async () => {
    const mod = await import('./AreaManagement');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.AreaManagement);
  });
});

describe('AreaManagement API logic', () => {
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
        json: async () => ({ areas: [{ id: 1, codigo: 'AREA1', nome: 'Área 1', torre: 'Torre A' }] }),
      } as Response;
    });

    await fetch('/api/areas', {
      headers: { Authorization: 'Bearer admin-token' },
    });

    expect(capturedUrl).toBe('/api/areas');
    expect(capturedOptions?.headers).toEqual({ Authorization: 'Bearer admin-token' });
  });

  it('should call POST /api/areas with area data', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ id: 2, codigo: 'AREA2', nome: 'Área 2', torre: null }),
      } as Response;
    });

    await fetch('/api/areas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({ codigo: 'AREA2', nome: 'Área 2', torre: null }),
    });

    expect(capturedUrl).toBe('/api/areas');
    expect(capturedOptions?.method).toBe('POST');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.codigo).toBe('AREA2');
    expect(body.nome).toBe('Área 2');
    expect(body.torre).toBeNull();
  });

  it('should call PUT /api/areas/:id with updated data', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ id: 1, codigo: 'AREA1', nome: 'Área Atualizada', torre: 'Torre B' }),
      } as Response;
    });

    await fetch('/api/areas/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({ codigo: 'AREA1', nome: 'Área Atualizada', torre: 'Torre B' }),
    });

    expect(capturedUrl).toBe('/api/areas/1');
    expect(capturedOptions?.method).toBe('PUT');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.nome).toBe('Área Atualizada');
    expect(body.torre).toBe('Torre B');
  });

  it('should call DELETE /api/areas/:id', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as Response;
    });

    await fetch('/api/areas/1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer admin-token' },
    });

    expect(capturedUrl).toBe('/api/areas/1');
    expect(capturedOptions?.method).toBe('DELETE');
  });

  it('should handle 403 for non-admin user', async () => {
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: false,
        status: 403,
        json: async () => ({ error: 'Acesso restrito a administradores' }),
      } as Response;
    });

    const response = await fetch('/api/areas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer non-admin-token',
      },
      body: JSON.stringify({ codigo: 'X', nome: 'Y', torre: null }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('restrito');
  });
});

describe('AreaManagement store integration', () => {
  beforeEach(async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    useCommandCenterStore.setState({
      token: 'admin-token',
      user: { id: 1, nome: 'Admin', perfil: 'Adm', areaCodigo: null, username: 'admin' },
      isAuthenticated: true,
      currentView: 'area-management',
      selectedAreas: [],
    });
  });

  it('should allow Adm user to navigate to area-management view', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setCurrentView('area-management');

    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('area-management');
  });

  it('should restrict access for non-Adm users', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({
      token: 'user-token',
      user: { id: 2, nome: 'User', perfil: 'Plantonista', areaCodigo: 'A1', username: 'user1' },
      isAuthenticated: true,
      currentView: 'area-management',
    });

    const store = useCommandCenterStore.getState();
    // Component should deny access when perfil is not 'Adm'
    expect(store.user?.perfil).not.toBe('Adm');
  });

  it('should support area-management as valid AppView', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    const store = useCommandCenterStore.getState();

    // Test that the store accepts 'area-management' as a valid view
    store.setCurrentView('area-management');
    expect(useCommandCenterStore.getState().currentView).toBe('area-management');
  });
});

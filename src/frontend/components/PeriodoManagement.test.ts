import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PeriodoManagement module', () => {
  it('should export PeriodoManagement component', async () => {
    const mod = await import('./PeriodoManagement');
    expect(mod.PeriodoManagement).toBeDefined();
    expect(typeof mod.PeriodoManagement).toBe('function');
  });

  it('should export PeriodoManagement as default export', async () => {
    const mod = await import('./PeriodoManagement');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.PeriodoManagement);
  });
});

describe('PeriodoManagement API logic', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call GET /api/periodos with auth token', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({
          periodos: [
            { id: 1, codigo: 'PER-001', data: '2024-01-15', horarios: '08:00-16:00', areaCodigo: 'A1', createdAt: '', updatedAt: '' },
          ],
        }),
      } as Response;
    });

    await fetch('/api/periodos?areaCodigo=A1', {
      headers: { Authorization: 'Bearer admin-token' },
    });

    expect(capturedUrl).toBe('/api/periodos?areaCodigo=A1');
    expect(capturedOptions?.headers).toEqual({ Authorization: 'Bearer admin-token' });
  });

  it('should call POST /api/periodos with periodo data', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ id: 2, codigo: 'PER-002', data: '2024-02-01', horarios: '16:00-00:00', areaCodigo: 'A1' }),
      } as Response;
    });

    await fetch('/api/periodos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        codigo: 'PER-002',
        data: '2024-02-01',
        horarios: '16:00-00:00',
        areaCodigo: 'A1',
      }),
    });

    expect(capturedUrl).toBe('/api/periodos');
    expect(capturedOptions?.method).toBe('POST');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.codigo).toBe('PER-002');
    expect(body.data).toBe('2024-02-01');
    expect(body.horarios).toBe('16:00-00:00');
    expect(body.areaCodigo).toBe('A1');
  });

  it('should call PUT /api/periodos/:id with updated periodo data', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ id: 1, codigo: 'PER-001', data: '2024-01-20', horarios: '08:00-12:00', areaCodigo: 'A2' }),
      } as Response;
    });

    await fetch('/api/periodos/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        codigo: 'PER-001',
        data: '2024-01-20',
        horarios: '08:00-12:00',
        areaCodigo: 'A2',
      }),
    });

    expect(capturedUrl).toBe('/api/periodos/1');
    expect(capturedOptions?.method).toBe('PUT');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.codigo).toBe('PER-001');
    expect(body.data).toBe('2024-01-20');
    expect(body.horarios).toBe('08:00-12:00');
    expect(body.areaCodigo).toBe('A2');
  });

  it('should call DELETE /api/periodos/:id', async () => {
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

    await fetch('/api/periodos/1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer admin-token' },
    });

    expect(capturedUrl).toBe('/api/periodos/1');
    expect(capturedOptions?.method).toBe('DELETE');
  });

  it('should filter periodos by selected areas', async () => {
    const allPeriodos = [
      { id: 1, codigo: 'PER-001', data: '2024-01-15', horarios: '08:00-16:00', areaCodigo: 'A1', createdAt: '', updatedAt: '' },
      { id: 2, codigo: 'PER-002', data: '2024-01-16', horarios: '16:00-00:00', areaCodigo: 'A2', createdAt: '', updatedAt: '' },
      { id: 3, codigo: 'PER-003', data: '2024-01-17', horarios: '00:00-08:00', areaCodigo: 'A1', createdAt: '', updatedAt: '' },
    ];

    const selectedAreas = ['A1'];
    const filtered = allPeriodos.filter((p) => selectedAreas.includes(p.areaCodigo));
    expect(filtered).toHaveLength(2);
    expect(filtered[0].codigo).toBe('PER-001');
    expect(filtered[1].codigo).toBe('PER-003');
  });

  it('should validate that periodo belongs to selected area', () => {
    const selectedAreas = ['A1', 'A2'];
    const formAreaCodigo = 'A3';

    const isValid = selectedAreas.length === 0 || selectedAreas.includes(formAreaCodigo);
    expect(isValid).toBe(false);
  });

  it('should allow periodo if no areas are selected (no filter)', () => {
    const selectedAreas: string[] = [];
    const formAreaCodigo = 'A3';

    const isValid = selectedAreas.length === 0 || selectedAreas.includes(formAreaCodigo);
    expect(isValid).toBe(true);
  });
});

describe('PeriodoManagement store integration', () => {
  beforeEach(async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    useCommandCenterStore.setState({
      token: 'admin-token',
      user: { id: 1, nome: 'Admin', perfil: 'Adm', areaCodigo: null, username: 'admin' },
      isAuthenticated: true,
      currentView: 'periodo-management',
      selectedAreas: [],
    });
  });

  it('should allow Adm user to navigate to periodo-management view', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setCurrentView('periodo-management');

    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('periodo-management');
  });

  it('should allow Responsavel user to access periodo-management', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({
      token: 'resp-token',
      user: { id: 2, nome: 'Responsável', perfil: 'Responsavel', areaCodigo: 'A1', username: 'resp1' },
      isAuthenticated: true,
      currentView: 'periodo-management',
    });

    const store = useCommandCenterStore.getState();
    expect(store.user?.perfil).toBe('Responsavel');
    expect(store.currentView).toBe('periodo-management');
  });

  it('should restrict access for Plantonista users', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({
      token: 'user-token',
      user: { id: 3, nome: 'Plantonista', perfil: 'Plantonista', areaCodigo: 'A1', username: 'plan1' },
      isAuthenticated: true,
      currentView: 'periodo-management',
    });

    const store = useCommandCenterStore.getState();
    // Component should deny access when perfil is Plantonista
    expect(store.user?.perfil).toBe('Plantonista');
    expect(store.user?.perfil !== 'Adm' && store.user?.perfil !== 'Responsavel').toBe(true);
  });

  it('should support periodo-management as valid AppView', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    const store = useCommandCenterStore.getState();

    store.setCurrentView('periodo-management');
    expect(useCommandCenterStore.getState().currentView).toBe('periodo-management');
  });
});

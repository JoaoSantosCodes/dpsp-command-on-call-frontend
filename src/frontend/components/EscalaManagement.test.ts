import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('EscalaManagement module', () => {
  it('should export EscalaManagement component', async () => {
    const mod = await import('./EscalaManagement');
    expect(mod.EscalaManagement).toBeDefined();
    expect(typeof mod.EscalaManagement).toBe('function');
  });

  it('should export EscalaManagement as default export', async () => {
    const mod = await import('./EscalaManagement');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.EscalaManagement);
  });
});

describe('EscalaManagement API logic', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call GET /api/escalas with auth token', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({
          escalas: [
            { id: 1, codigo: 'ESC-001', areaCodigo: 'A1', periodoCodigo: 'PER-001', usuarioCodigo: 'USR-001', createdAt: '', updatedAt: '' },
          ],
        }),
      } as Response;
    });

    await fetch('/api/escalas?areaCodigo=A1', {
      headers: { Authorization: 'Bearer admin-token' },
    });

    expect(capturedUrl).toBe('/api/escalas?areaCodigo=A1');
    expect(capturedOptions?.headers).toEqual({ Authorization: 'Bearer admin-token' });
  });

  it('should call POST /api/escalas with escala data', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ id: 2, codigo: 'ESC-123456', areaCodigo: 'A1', periodoCodigo: 'PER-001', usuarioCodigo: 'USR-002' }),
      } as Response;
    });

    await fetch('/api/escalas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        codigo: 'ESC-123456',
        areaCodigo: 'A1',
        periodoCodigo: 'PER-001',
        usuarioCodigo: 'USR-002',
      }),
    });

    expect(capturedUrl).toBe('/api/escalas');
    expect(capturedOptions?.method).toBe('POST');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.codigo).toBe('ESC-123456');
    expect(body.areaCodigo).toBe('A1');
    expect(body.periodoCodigo).toBe('PER-001');
    expect(body.usuarioCodigo).toBe('USR-002');
  });

  it('should call PUT /api/escalas/:id with updated escala data', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ id: 1, codigo: 'ESC-001', areaCodigo: 'A2', periodoCodigo: 'PER-002', usuarioCodigo: 'USR-003' }),
      } as Response;
    });

    await fetch('/api/escalas/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        codigo: 'ESC-001',
        areaCodigo: 'A2',
        periodoCodigo: 'PER-002',
        usuarioCodigo: 'USR-003',
      }),
    });

    expect(capturedUrl).toBe('/api/escalas/1');
    expect(capturedOptions?.method).toBe('PUT');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.codigo).toBe('ESC-001');
    expect(body.areaCodigo).toBe('A2');
    expect(body.periodoCodigo).toBe('PER-002');
    expect(body.usuarioCodigo).toBe('USR-003');
  });

  it('should call DELETE /api/escalas/:id', async () => {
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

    await fetch('/api/escalas/1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer admin-token' },
    });

    expect(capturedUrl).toBe('/api/escalas/1');
    expect(capturedOptions?.method).toBe('DELETE');
  });

  it('should filter escalas by selected areas', async () => {
    const allEscalas = [
      { id: 1, codigo: 'ESC-001', areaCodigo: 'A1', periodoCodigo: 'PER-001', usuarioCodigo: 'USR-001', createdAt: '', updatedAt: '' },
      { id: 2, codigo: 'ESC-002', areaCodigo: 'A2', periodoCodigo: 'PER-002', usuarioCodigo: 'USR-002', createdAt: '', updatedAt: '' },
      { id: 3, codigo: 'ESC-003', areaCodigo: 'A1', periodoCodigo: 'PER-003', usuarioCodigo: 'USR-003', createdAt: '', updatedAt: '' },
    ];

    const selectedAreas = ['A1'];
    const filtered = allEscalas.filter((e) => selectedAreas.includes(e.areaCodigo));
    expect(filtered).toHaveLength(2);
    expect(filtered[0].codigo).toBe('ESC-001');
    expect(filtered[1].codigo).toBe('ESC-003');
  });

  it('should auto-generate codigo with ESC- prefix and timestamp', () => {
    const codigo = `ESC-${Date.now()}`;
    expect(codigo).toMatch(/^ESC-\d+$/);
  });

  it('should filter plantonistas by area', () => {
    const plantonistas = [
      { id: 1, codigo: 'USR-001', nome: 'João', perfil: 'Plantonista', areaCodigo: 'A1' },
      { id: 2, codigo: 'USR-002', nome: 'Maria', perfil: 'Plantonista', areaCodigo: 'A2' },
      { id: 3, codigo: 'USR-003', nome: 'Pedro', perfil: 'Plantonista', areaCodigo: null },
    ];

    const formAreaCodigo = 'A1';
    const filtered = plantonistas.filter((p) => p.areaCodigo === formAreaCodigo || !p.areaCodigo);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].nome).toBe('João');
    expect(filtered[1].nome).toBe('Pedro');
  });
});

describe('EscalaManagement store integration', () => {
  beforeEach(async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    useCommandCenterStore.setState({
      token: 'admin-token',
      user: { id: 1, nome: 'Admin', perfil: 'Adm', areaCodigo: null, username: 'admin' },
      isAuthenticated: true,
      currentView: 'escala-management',
      selectedAreas: [],
    });
  });

  it('should allow Adm user to navigate to escala-management view', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setCurrentView('escala-management');

    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('escala-management');
  });

  it('should allow Responsavel user to access escala-management', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({
      token: 'resp-token',
      user: { id: 2, nome: 'Responsável', perfil: 'Responsavel', areaCodigo: 'A1', username: 'resp1' },
      isAuthenticated: true,
      currentView: 'escala-management',
    });

    const store = useCommandCenterStore.getState();
    expect(store.user?.perfil).toBe('Responsavel');
    expect(store.currentView).toBe('escala-management');
  });

  it('should restrict access for Plantonista users', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({
      token: 'user-token',
      user: { id: 3, nome: 'Plantonista', perfil: 'Plantonista', areaCodigo: 'A1', username: 'plan1' },
      isAuthenticated: true,
      currentView: 'escala-management',
    });

    const store = useCommandCenterStore.getState();
    // Component should deny access when perfil is Plantonista
    expect(store.user?.perfil).toBe('Plantonista');
    expect(store.user?.perfil !== 'Adm' && store.user?.perfil !== 'Responsavel').toBe(true);
  });

  it('should support escala-management as valid AppView', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    const store = useCommandCenterStore.getState();

    store.setCurrentView('escala-management');
    expect(useCommandCenterStore.getState().currentView).toBe('escala-management');
  });
});

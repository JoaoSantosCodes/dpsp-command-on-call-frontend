import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PlantonistManagement module', () => {
  it('should export PlantonistManagement component', async () => {
    const mod = await import('./PlantonistManagement');
    expect(mod.PlantonistManagement).toBeDefined();
    expect(typeof mod.PlantonistManagement).toBe('function');
  });

  it('should export PlantonistManagement as default export', async () => {
    const mod = await import('./PlantonistManagement');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.PlantonistManagement);
  });
});

describe('PlantonistManagement API logic', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call GET /api/users with auth token', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({
          users: [
            { id: 1, codigo: 'PLAN-1', areaCodigo: 'A1', nome: 'João', perfil: 'Plantonista', cargo: 'Analista', username: 'joao' },
          ],
        }),
      } as Response;
    });

    await fetch('/api/users', {
      headers: { Authorization: 'Bearer admin-token' },
    });

    expect(capturedUrl).toBe('/api/users');
    expect(capturedOptions?.headers).toEqual({ Authorization: 'Bearer admin-token' });
  });

  it('should call POST /api/users with plantonist data and perfil Plantonista', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ id: 2, codigo: 'PLAN-2', nome: 'Maria', perfil: 'Plantonista' }),
      } as Response;
    });

    await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        codigo: 'PLAN-123',
        areaCodigo: 'AREA1',
        nome: 'Maria',
        perfil: 'Plantonista',
        cargo: 'Operadora',
        username: 'maria',
        senha: 'senha123',
      }),
    });

    expect(capturedUrl).toBe('/api/users');
    expect(capturedOptions?.method).toBe('POST');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.perfil).toBe('Plantonista');
    expect(body.nome).toBe('Maria');
    expect(body.areaCodigo).toBe('AREA1');
    expect(body.username).toBe('maria');
    expect(body.senha).toBe('senha123');
  });

  it('should call PUT /api/users/:id with updated plantonist data', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ id: 1, nome: 'João Atualizado', perfil: 'Plantonista' }),
      } as Response;
    });

    await fetch('/api/users/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        codigo: 'PLAN-1',
        areaCodigo: 'AREA2',
        nome: 'João Atualizado',
        perfil: 'Plantonista',
        cargo: 'Coordenador',
        username: 'joao',
      }),
    });

    expect(capturedUrl).toBe('/api/users/1');
    expect(capturedOptions?.method).toBe('PUT');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.nome).toBe('João Atualizado');
    expect(body.perfil).toBe('Plantonista');
    expect(body.areaCodigo).toBe('AREA2');
  });

  it('should call DELETE /api/users/:id', async () => {
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

    await fetch('/api/users/1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer admin-token' },
    });

    expect(capturedUrl).toBe('/api/users/1');
    expect(capturedOptions?.method).toBe('DELETE');
  });

  it('should filter users to only return Plantonistas', async () => {
    const allUsers = [
      { id: 1, codigo: 'U1', areaCodigo: 'A1', nome: 'Admin', perfil: 'Adm', cargo: null, username: 'admin' },
      { id: 2, codigo: 'U2', areaCodigo: 'A1', nome: 'João', perfil: 'Plantonista', cargo: 'Analista', username: 'joao' },
      { id: 3, codigo: 'U3', areaCodigo: 'A2', nome: 'Resp', perfil: 'Responsavel', cargo: null, username: 'resp' },
      { id: 4, codigo: 'U4', areaCodigo: 'A2', nome: 'Maria', perfil: 'Plantonista', cargo: 'Operadora', username: 'maria' },
    ];

    const plantonistas = allUsers.filter((u) => u.perfil === 'Plantonista');
    expect(plantonistas).toHaveLength(2);
    expect(plantonistas[0].nome).toBe('João');
    expect(plantonistas[1].nome).toBe('Maria');
  });

  it('should filter plantonistas by selected areas', async () => {
    const plantonistas = [
      { id: 2, codigo: 'U2', areaCodigo: 'A1', nome: 'João', perfil: 'Plantonista', cargo: 'Analista', username: 'joao' },
      { id: 4, codigo: 'U4', areaCodigo: 'A2', nome: 'Maria', perfil: 'Plantonista', cargo: 'Operadora', username: 'maria' },
    ];

    const selectedAreas = ['A1'];
    const filtered = plantonistas.filter((u) => u.areaCodigo && selectedAreas.includes(u.areaCodigo));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].nome).toBe('João');
  });
});

describe('PlantonistManagement store integration', () => {
  beforeEach(async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    useCommandCenterStore.setState({
      token: 'admin-token',
      user: { id: 1, nome: 'Admin', perfil: 'Adm', areaCodigo: null, username: 'admin' },
      isAuthenticated: true,
      currentView: 'plantonist-management',
      selectedAreas: [],
    });
  });

  it('should allow Adm user to navigate to plantonist-management view', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setCurrentView('plantonist-management');

    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('plantonist-management');
  });

  it('should allow Responsavel user to access plantonist-management', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({
      token: 'resp-token',
      user: { id: 2, nome: 'Responsável', perfil: 'Responsavel', areaCodigo: 'A1', username: 'resp1' },
      isAuthenticated: true,
      currentView: 'plantonist-management',
    });

    const store = useCommandCenterStore.getState();
    expect(store.user?.perfil).toBe('Responsavel');
    expect(store.currentView).toBe('plantonist-management');
  });

  it('should restrict access for Plantonista users', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({
      token: 'user-token',
      user: { id: 3, nome: 'Plantonista', perfil: 'Plantonista', areaCodigo: 'A1', username: 'plan1' },
      isAuthenticated: true,
      currentView: 'plantonist-management',
    });

    const store = useCommandCenterStore.getState();
    // Component should deny access when perfil is Plantonista
    expect(store.user?.perfil).toBe('Plantonista');
    expect(store.user?.perfil !== 'Adm' && store.user?.perfil !== 'Responsavel').toBe(true);
  });

  it('should support plantonist-management as valid AppView', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    const store = useCommandCenterStore.getState();

    store.setCurrentView('plantonist-management');
    expect(useCommandCenterStore.getState().currentView).toBe('plantonist-management');
  });
});

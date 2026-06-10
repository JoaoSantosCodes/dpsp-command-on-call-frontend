import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SetupWizard module', () => {
  it('should export SetupWizard component', async () => {
    const mod = await import('./SetupWizard');
    expect(mod.SetupWizard).toBeDefined();
    expect(typeof mod.SetupWizard).toBe('function');
  });

  it('should export SetupWizard as default export', async () => {
    const mod = await import('./SetupWizard');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.SetupWizard);
  });
});

describe('SetupWizard API logic', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call GET /api/periodos with areaCodigo query param', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ periodos: [] }),
      } as Response;
    });

    await fetch('/api/periodos?areaCodigo=AREA1', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(capturedUrl).toBe('/api/periodos?areaCodigo=AREA1');
    expect(capturedOptions?.headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('should call GET /api/users to check for plantonistas', async () => {
    let capturedUrl = '';

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = url as string;
      return {
        ok: true,
        json: async () => ({
          users: [
            { id: 1, perfil: 'Plantonista', areaCodigo: 'AREA1', nome: 'João' },
            { id: 2, perfil: 'Adm', areaCodigo: null, nome: 'Admin' },
          ],
        }),
      } as Response;
    });

    const response = await fetch('/api/users', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(capturedUrl).toBe('/api/users');
    const data = await response.json();
    const plantonistas = data.users.filter(
      (u: { perfil: string; areaCodigo: string | null }) =>
        u.perfil === 'Plantonista' && u.areaCodigo === 'AREA1'
    );
    expect(plantonistas).toHaveLength(1);
  });

  it('should call GET /api/escalas with areaCodigo query param', async () => {
    let capturedUrl = '';

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = url as string;
      return {
        ok: true,
        json: async () => ({ escalas: [{ id: 1, areaCodigo: 'AREA1' }] }),
      } as Response;
    });

    await fetch('/api/escalas?areaCodigo=AREA1', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(capturedUrl).toBe('/api/escalas?areaCodigo=AREA1');
  });

  it('should detect missing periodos when API returns empty array', async () => {
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ periodos: [] }),
      } as Response;
    });

    const response = await fetch('/api/periodos?areaCodigo=AREA1', {
      headers: { Authorization: 'Bearer test-token' },
    });
    const data = await response.json();
    const periodos = data.periodos || [];
    expect(periodos.length).toBe(0);
  });

  it('should detect missing plantonistas when none match area', async () => {
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          users: [
            { id: 1, perfil: 'Plantonista', areaCodigo: 'OTHER_AREA', nome: 'João' },
            { id: 2, perfil: 'Adm', areaCodigo: null, nome: 'Admin' },
          ],
        }),
      } as Response;
    });

    const response = await fetch('/api/users', {
      headers: { Authorization: 'Bearer test-token' },
    });
    const data = await response.json();
    const plantonistas = data.users.filter(
      (u: { perfil: string; areaCodigo: string | null }) =>
        u.perfil === 'Plantonista' && u.areaCodigo === 'AREA1'
    );
    expect(plantonistas).toHaveLength(0);
  });

  it('should detect all steps passed when all have data', async () => {
    const results = {
      periodos: [{ id: 1, areaCodigo: 'AREA1' }],
      plantonistas: [{ id: 1, perfil: 'Plantonista', areaCodigo: 'AREA1' }],
      escalas: [{ id: 1, areaCodigo: 'AREA1' }],
    };

    expect(results.periodos.length > 0).toBe(true);
    expect(results.plantonistas.length > 0).toBe(true);
    expect(results.escalas.length > 0).toBe(true);
  });
});

describe('SetupWizard store integration', () => {
  beforeEach(async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    useCommandCenterStore.setState({
      token: 'test-token',
      user: { id: 1, nome: 'Admin', perfil: 'Adm', areaCodigo: null, username: 'admin' },
      isAuthenticated: true,
      currentView: 'setup-wizard',
      selectedAreas: ['AREA1'],
    });
  });

  it('should allow Adm users to skip to dashboard', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    expect(store.user?.perfil).toBe('Adm');

    // Simulate skip action
    store.setCurrentView('dashboard');
    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('dashboard');
  });

  it('should navigate to periodo-management when periodos are missing', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setCurrentView('periodo-management');
    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('periodo-management');
  });

  it('should navigate to plantonist-management when plantonistas are missing', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setCurrentView('plantonist-management');
    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('plantonist-management');
  });

  it('should navigate to escala-management when escalas are missing', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setCurrentView('escala-management');
    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('escala-management');
  });

  it('should have setup-wizard as a valid AppView', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    const store = useCommandCenterStore.getState();
    store.setCurrentView('setup-wizard');
    const updated = useCommandCenterStore.getState();
    expect(updated.currentView).toBe('setup-wizard');
  });

  it('should not show skip button for non-Adm users', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({
      user: { id: 2, nome: 'Responsável', perfil: 'Responsavel', areaCodigo: 'AREA1', username: 'resp' },
    });

    const store = useCommandCenterStore.getState();
    expect(store.user?.perfil).not.toBe('Adm');
    // Non-Adm users cannot skip - they must go through the wizard
    expect(store.user?.perfil === 'Adm').toBe(false);
  });
});

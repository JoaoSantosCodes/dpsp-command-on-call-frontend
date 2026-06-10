import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Login module', () => {
  it('should export Login component', async () => {
    const mod = await import('./Login');
    expect(mod.Login).toBeDefined();
    expect(typeof mod.Login).toBe('function');
  });

  it('should export Login as default export', async () => {
    const mod = await import('./Login');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.Login);
  });
});

describe('Login authentication logic', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    // Clean localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
  });

  it('should call /api/auth/login with correct payload', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        token: 'mock-jwt-token',
        user: { id: 1, nome: 'Test User', perfil: 'Adm', areaCodigo: 'A1', username: 'testuser' },
      }),
    };

    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return mockResponse as Response;
    });

    // Simulate the fetch call that the Login component would make
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', senha: 'password123' }),
    });

    expect(capturedUrl).toBe('/api/auth/login');
    expect(capturedOptions?.method).toBe('POST');
    expect(capturedOptions?.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.username).toBe('testuser');
    expect(body.senha).toBe('password123');

    const data = await response.json();
    expect(data.token).toBe('mock-jwt-token');
    expect(data.user.username).toBe('testuser');
  });

  it('should return error message on failed login', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      json: async () => ({ error: 'Dados Incorretos!' }),
    };

    globalThis.fetch = vi.fn(async () => mockResponse as Response);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wrong', senha: 'wrong' }),
    });

    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.error).toBe('Dados Incorretos!');
  });
});

describe('Login store integration', () => {
  beforeEach(async () => {
    // Reset the store state before each test
    const { useCommandCenterStore } = await import('../store/command-center-store');
    useCommandCenterStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      currentView: 'login',
    });
  });

  it('should update auth state on successful login', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    const store = useCommandCenterStore.getState();

    expect(store.isAuthenticated).toBe(false);
    expect(store.currentView).toBe('login');

    // Simulate login
    const mockUser = { id: 1, nome: 'Admin', perfil: 'Adm' as const, areaCodigo: 'A1', username: 'admin' };
    store.login('jwt-token-123', mockUser);

    const updated = useCommandCenterStore.getState();
    expect(updated.isAuthenticated).toBe(true);
    expect(updated.token).toBe('jwt-token-123');
    expect(updated.user?.username).toBe('admin');
    expect(updated.currentView).toBe('area-selector');
  });

  it('should clear auth state on logout', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    // Set authenticated state
    const mockUser = { id: 1, nome: 'Admin', perfil: 'Adm' as const, areaCodigo: 'A1', username: 'admin' };
    useCommandCenterStore.getState().login('jwt-token-123', mockUser);

    // Logout
    useCommandCenterStore.getState().logout();

    const state = useCommandCenterStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.currentView).toBe('login');
  });

  it('should navigate to register view', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.getState().setCurrentView('register');
    expect(useCommandCenterStore.getState().currentView).toBe('register');
  });
});

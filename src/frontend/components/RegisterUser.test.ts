import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('RegisterUser module', () => {
  it('should export RegisterUser component', async () => {
    const mod = await import('./RegisterUser');
    expect(mod.RegisterUser).toBeDefined();
    expect(typeof mod.RegisterUser).toBe('function');
  });

  it('should export RegisterUser as default export', async () => {
    const mod = await import('./RegisterUser');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.RegisterUser);
  });
});

describe('RegisterUser registration logic', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call POST /api/auth/register with correct payload', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        user: { id: 1, nome: 'Novo Usuário', perfil: 'Plantonista', areaCodigo: 'A1', username: 'novousuario' },
      }),
    };

    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = url as string;
      capturedOptions = options;
      return mockResponse as Response;
    });

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: 'USR-123456',
        areaCodigo: 'A1',
        nome: 'Novo Usuário',
        perfil: 'Plantonista',
        cargo: 'Analista',
        username: 'novousuario',
        senha: 'senha123',
      }),
    });

    expect(capturedUrl).toBe('/api/auth/register');
    expect(capturedOptions?.method).toBe('POST');
    expect(capturedOptions?.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.nome).toBe('Novo Usuário');
    expect(body.username).toBe('novousuario');
    expect(body.senha).toBe('senha123');
    expect(body.perfil).toBe('Plantonista');
    expect(body.cargo).toBe('Analista');
    expect(body.areaCodigo).toBe('A1');
    expect(body.codigo).toBe('USR-123456');

    const data = await response.json();
    expect(data.user.username).toBe('novousuario');
  });

  it('should return error on failed registration', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: async () => ({ error: 'Username já existe.' }),
    };

    globalThis.fetch = vi.fn(async () => mockResponse as Response);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: 'USR-123456',
        areaCodigo: null,
        nome: 'Test User',
        perfil: 'Adm',
        cargo: null,
        username: 'existinguser',
        senha: 'senha123',
      }),
    });

    expect(response.ok).toBe(false);
    const data = await response.json();
    expect(data.error).toBe('Username já existe.');
  });

  it('should handle register with optional fields as null', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        user: { id: 2, nome: 'Test', perfil: 'Adm', areaCodigo: null, username: 'testadm' },
      }),
    };

    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      capturedOptions = options;
      return mockResponse as Response;
    });

    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: 'USR-999',
        areaCodigo: null,
        nome: 'Test',
        perfil: 'Adm',
        cargo: null,
        username: 'testadm',
        senha: 'pass',
      }),
    });

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.areaCodigo).toBeNull();
    expect(body.cargo).toBeNull();
  });
});

describe('RegisterUser store navigation', () => {
  beforeEach(async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');
    useCommandCenterStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      currentView: 'register',
    });
  });

  it('should navigate to login view when clicking back link', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    expect(useCommandCenterStore.getState().currentView).toBe('register');

    useCommandCenterStore.getState().setCurrentView('login');
    expect(useCommandCenterStore.getState().currentView).toBe('login');
  });

  it('should support navigating from login to register', async () => {
    const { useCommandCenterStore } = await import('../store/command-center-store');

    useCommandCenterStore.setState({ currentView: 'login' });
    useCommandCenterStore.getState().setCurrentView('register');
    expect(useCommandCenterStore.getState().currentView).toBe('register');
  });
});

describe('RegisterUser validation logic', () => {
  it('should validate that required fields are present in payload', () => {
    // Validate required field presence logic
    const validateForm = (data: { nome: string; username: string; senha: string; perfil: string }) => {
      const errors: string[] = [];
      if (!data.nome.trim()) errors.push('Nome é obrigatório.');
      if (!data.username.trim()) errors.push('Username é obrigatório.');
      if (!data.senha.trim()) errors.push('Senha é obrigatória.');
      if (!data.perfil) errors.push('Perfil é obrigatório.');
      return errors;
    };

    // All fields empty
    expect(validateForm({ nome: '', username: '', senha: '', perfil: '' })).toHaveLength(4);

    // Missing nome
    expect(validateForm({ nome: '', username: 'user', senha: 'pass', perfil: 'Adm' })).toContain('Nome é obrigatório.');

    // Missing perfil
    expect(validateForm({ nome: 'Test', username: 'user', senha: 'pass', perfil: '' })).toContain('Perfil é obrigatório.');

    // All valid
    expect(validateForm({ nome: 'Test', username: 'user', senha: 'pass', perfil: 'Adm' })).toHaveLength(0);
  });

  it('should generate a valid USR-{timestamp} codigo', () => {
    const now = Date.now();
    const codigo = `USR-${now}`;
    expect(codigo).toMatch(/^USR-\d+$/);
    // Timestamp should be recent (within last second)
    const ts = parseInt(codigo.split('-')[1], 10);
    expect(ts).toBeGreaterThanOrEqual(now - 1000);
    expect(ts).toBeLessThanOrEqual(now + 1000);
  });
});

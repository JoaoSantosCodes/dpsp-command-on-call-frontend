import React, { useState, useCallback } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './Login.css';

/**
 * Login component — authentication screen.
 * Fields: Usuário (username) and Senha (password with visibility toggle).
 * On success: stores JWT token, updates auth state, redirects to dashboard.
 * On failure: displays "Dados Incorretos!" error message.
 * Link to register screen at the bottom.
 *
 * Validates: Requisito Documento — Interface Login
 */
export function Login(): React.ReactElement {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCommandCenterStore((state) => state.login);
  const setCurrentView = useCommandCenterStore((state) => state.setCurrentView);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, senha }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Dados Incorretos!');
          return;
        }

        const data = await response.json();
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        // Update Zustand store with auth data
        login(data.token, data.user);
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setLoading(false);
      }
    },
    [username, senha, login]
  );

  const handleRegisterClick = useCallback(() => {
    setCurrentView('register');
  }, [setCurrentView]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__title">Command Center</h1>

        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__field">
            <label className="login__label" htmlFor="login-username">
              Usuário
            </label>
            <div className="login__input-wrapper">
              <input
                id="login-username"
                className="login__input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="login-password">
              Senha
            </label>
            <div className="login__input-wrapper">
              <input
                id="login-password"
                className="login__input login__input--password"
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login__visibility-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="login__error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login__button"
            disabled={loading || !username || !senha}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login__footer">
          <span>Ainda não tem uma conta? </span>
          <button
            type="button"
            className="login__footer-link"
            onClick={handleRegisterClick}
          >
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

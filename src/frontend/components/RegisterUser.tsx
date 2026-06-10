import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './RegisterUser.css';

import type { Area } from '../../shared/types';

/**
 * RegisterUser component — user registration screen.
 * Fields: Nome, Username, Senha, Cargo (optional), Perfil (dropdown), Área vinculada (dropdown, optional).
 * On success: shows success message and redirects to login after a brief delay.
 * On failure: displays API error message.
 * Link to go back to login screen.
 *
 * Validates: Requisito Documento — Cadastrar (novo usuário)
 */
export function RegisterUser(): React.ReactElement {
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [cargo, setCargo] = useState('');
  const [perfil, setPerfil] = useState<string>('');
  const [areaCodigo, setAreaCodigo] = useState<string>('');
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setCurrentView = useCommandCenterStore((state) => state.setCurrentView);

  // Fetch areas for the dropdown
  useEffect(() => {
    async function fetchAreas() {
      try {
        const response = await fetch('/api/areas/public');
        if (response.ok) {
          const data = await response.json();
          setAreas(data.areas || data || []);
        }
      } catch {
        // Areas are optional, ignore fetch errors
      }
    }
    fetchAreas();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      // Validate required fields
      if (!nome.trim()) {
        setError('Nome é obrigatório.');
        return;
      }
      if (!username.trim()) {
        setError('Username é obrigatório.');
        return;
      }
      if (!senha.trim()) {
        setError('Senha é obrigatória.');
        return;
      }
      if (!perfil) {
        setError('Perfil é obrigatório.');
        return;
      }

      setLoading(true);

      try {
        const codigo = `USR-${Date.now()}`;

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo,
            areaCodigo: areaCodigo || null,
            nome: nome.trim(),
            perfil,
            cargo: cargo.trim() || null,
            username: username.trim(),
            senha: senha.trim(),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao cadastrar usuário.');
          return;
        }

        setSuccess('Usuário cadastrado com sucesso! Redirecionando para login...');

        // Redirect to login after a brief delay
        setTimeout(() => {
          setCurrentView('login');
        }, 2000);
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setLoading(false);
      }
    },
    [nome, username, senha, cargo, perfil, areaCodigo, setCurrentView]
  );

  const handleLoginClick = useCallback(() => {
    setCurrentView('login');
  }, [setCurrentView]);

  return (
    <div className="register">
      <div className="register__card">
        <h1 className="register__title">Cadastrar Usuário</h1>

        <form className="register__form" onSubmit={handleSubmit}>
          <div className="register__field">
            <label className="register__label" htmlFor="register-nome">
              Nome *
            </label>
            <input
              id="register-nome"
              className="register__input"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
              autoComplete="name"
              required
            />
          </div>

          <div className="register__field">
            <label className="register__label" htmlFor="register-username">
              Username *
            </label>
            <input
              id="register-username"
              className="register__input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Escolha um nome de usuário"
              autoComplete="username"
              required
            />
          </div>

          <div className="register__field">
            <label className="register__label" htmlFor="register-senha">
              Senha *
            </label>
            <input
              id="register-senha"
              className="register__input"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Escolha uma senha"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="register__field">
            <label className="register__label" htmlFor="register-cargo">
              Cargo
            </label>
            <input
              id="register-cargo"
              className="register__input"
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex: Analista, Coordenador (opcional)"
            />
          </div>

          <div className="register__field">
            <label className="register__label" htmlFor="register-perfil">
              Perfil *
            </label>
            <select
              id="register-perfil"
              className="register__select"
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              required
            >
              <option value="">Selecione um perfil</option>
              <option value="Adm">Adm</option>
              <option value="Responsavel">Responsável</option>
              <option value="Plantonista">Plantonista</option>
            </select>
          </div>

          <div className="register__field">
            <label className="register__label" htmlFor="register-area">
              Área vinculada
            </label>
            <select
              id="register-area"
              className="register__select"
              value={areaCodigo}
              onChange={(e) => setAreaCodigo(e.target.value)}
            >
              <option value="">Nenhuma (opcional)</option>
              {areas.map((area) => (
                <option key={area.codigo} value={area.codigo}>
                  {area.nome}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="register__error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="register__success" role="status">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="register__button"
            disabled={loading || !nome || !username || !senha || !perfil}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="register__footer">
          <span>Já tem uma conta? </span>
          <button
            type="button"
            className="register__footer-link"
            onClick={handleLoginClick}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterUser;

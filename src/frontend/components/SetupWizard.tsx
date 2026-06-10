import React, { useState, useEffect, useCallback } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './SetupWizard.css';

import type { UserPerfil } from '../../shared/types';

interface StepStatus {
  label: string;
  checking: boolean;
  passed: boolean | null;
  targetView: 'periodo-management' | 'plantonist-management' | 'escala-management';
  message: string;
}

/**
 * SetupWizard — conditional flow component shown after area selection.
 * Sequentially verifies that the selected area has:
 *   1. Períodos cadastrados
 *   2. Plantonistas cadastrados
 *   3. Escalas cadastradas
 *
 * If any step fails, it shows a message and a button to navigate to the
 * appropriate management screen. Adm users can skip the wizard.
 *
 * Validates: Requisito Documento — Modelo Lógico — fluxo de validação sequencial
 */
export function SetupWizard(): React.ReactElement {
  const token = useCommandCenterStore((state) => state.token);
  const user = useCommandCenterStore((state) => state.user);
  const selectedAreas = useCommandCenterStore((state) => state.selectedAreas);
  const setCurrentView = useCommandCenterStore((state) => state.setCurrentView);

  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<StepStatus[]>([
    {
      label: 'Períodos',
      checking: false,
      passed: null,
      targetView: 'periodo-management',
      message: 'Nenhum período cadastrado para esta área. Cadastre pelo menos um período para continuar.',
    },
    {
      label: 'Plantonistas',
      checking: false,
      passed: null,
      targetView: 'plantonist-management',
      message: 'Nenhum plantonista cadastrado. Cadastre pelo menos um plantonista para continuar.',
    },
    {
      label: 'Escalas',
      checking: false,
      passed: null,
      targetView: 'escala-management',
      message: 'Nenhuma escala cadastrada para esta área. Cadastre pelo menos uma escala para continuar.',
    },
  ]);
  const [allPassed, setAllPassed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const areaCodigo = selectedAreas[0] || '';
  const isAdm = user?.perfil === 'Adm';

  const checkStep = useCallback(async (stepIndex: number) => {
    setSteps((prev) => prev.map((s, i) =>
      i === stepIndex ? { ...s, checking: true } : s
    ));

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let hasDeps = false;

      if (stepIndex === 0) {
        // Check períodos
        const res = await fetch(`/api/periodos?areaCodigo=${encodeURIComponent(areaCodigo)}`, { headers });
        if (!res.ok) throw new Error('Erro ao verificar períodos');
        const data = await res.json();
        const periodos = data.periodos || data || [];
        hasDeps = periodos.length > 0;
      } else if (stepIndex === 1) {
        // Check plantonistas (users with perfil Plantonista in this area)
        const res = await fetch('/api/users', { headers });
        if (!res.ok) throw new Error('Erro ao verificar plantonistas');
        const data = await res.json();
        const users = data.users || data || [];
        const plantonistas = users.filter((u: { perfil: UserPerfil; areaCodigo: string | null }) =>
          u.perfil === 'Plantonista' && u.areaCodigo === areaCodigo
        );
        hasDeps = plantonistas.length > 0;
      } else if (stepIndex === 2) {
        // Check escalas
        const res = await fetch(`/api/escalas?areaCodigo=${encodeURIComponent(areaCodigo)}`, { headers });
        if (!res.ok) throw new Error('Erro ao verificar escalas');
        const data = await res.json();
        const escalas = data.escalas || data || [];
        hasDeps = escalas.length > 0;
      }

      setSteps((prev) => prev.map((s, i) =>
        i === stepIndex ? { ...s, checking: false, passed: hasDeps } : s
      ));

      return hasDeps;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar configuração');
      setSteps((prev) => prev.map((s, i) =>
        i === stepIndex ? { ...s, checking: false, passed: false } : s
      ));
      return false;
    }
  }, [areaCodigo, token]);

  // Run checks sequentially
  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      for (let i = 0; i < 3; i++) {
        if (cancelled) return;
        setCurrentStep(i);
        const passed = await checkStep(i);
        if (!passed) {
          // Stop at first failure
          return;
        }
      }
      if (!cancelled) {
        setAllPassed(true);
      }
    }

    runChecks();
    return () => { cancelled = true; };
  }, [checkStep]);

  // Auto-redirect to dashboard when all checks pass
  useEffect(() => {
    if (allPassed) {
      const timer = setTimeout(() => {
        setCurrentView('dashboard');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [allPassed, setCurrentView]);

  const handleGoToManagement = useCallback(() => {
    const step = steps[currentStep];
    if (step) {
      setCurrentView(step.targetView);
    }
  }, [currentStep, steps, setCurrentView]);

  const handleSkip = useCallback(() => {
    setCurrentView('dashboard');
  }, [setCurrentView]);

  const currentStepData = steps[currentStep];
  const isChecking = currentStepData?.checking;
  const stepFailed = currentStepData?.passed === false && !currentStepData.checking;

  return (
    <div className="setup-wizard">
      <div className="setup-wizard__card">
        <h1 className="setup-wizard__title">Verificação de Configuração</h1>
        <p className="setup-wizard__subtitle">
          Verificando os pré-requisitos para a área selecionada
        </p>

        {/* Progress indicator */}
        <div className="setup-wizard__progress" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={3}>
          {steps.map((step, index) => (
            <div
              key={step.label}
              className={`setup-wizard__step ${
                index < currentStep ? 'setup-wizard__step--done' :
                index === currentStep ? 'setup-wizard__step--active' :
                'setup-wizard__step--pending'
              } ${step.passed === false && index === currentStep ? 'setup-wizard__step--failed' : ''}`}
            >
              <div className="setup-wizard__step-indicator">
                {step.passed === true ? '✓' : index + 1}
              </div>
              <span className="setup-wizard__step-label">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Status area */}
        <div className="setup-wizard__status">
          {error && (
            <div className="setup-wizard__error" role="alert">
              {error}
            </div>
          )}

          {isChecking && (
            <div className="setup-wizard__checking">
              <div className="setup-wizard__spinner" aria-hidden="true" />
              <span>Verificando {currentStepData.label.toLowerCase()}...</span>
            </div>
          )}

          {stepFailed && !error && (
            <div className="setup-wizard__missing">
              <p className="setup-wizard__missing-message">{currentStepData.message}</p>
              <button
                type="button"
                className="setup-wizard__button setup-wizard__button--primary"
                onClick={handleGoToManagement}
              >
                Cadastrar {currentStepData.label}
              </button>
            </div>
          )}

          {allPassed && (
            <div className="setup-wizard__success">
              <span className="setup-wizard__success-icon">✓</span>
              <span>Tudo configurado! Redirecionando para o mapa...</span>
            </div>
          )}
        </div>

        {/* Step counter */}
        <div className="setup-wizard__counter">
          Etapa {currentStep + 1} de 3
        </div>

        {/* Skip button for Adm users */}
        {isAdm && !allPassed && (
          <button
            type="button"
            className="setup-wizard__button setup-wizard__button--skip"
            onClick={handleSkip}
          >
            Pular
          </button>
        )}
      </div>
    </div>
  );
}

export default SetupWizard;

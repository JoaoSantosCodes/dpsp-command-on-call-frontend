# dpsp-command-on-call-frontend

Microsserviço frontend do Command On-Call. Interface web em React para monitoramento em tempo real de alertas Datadog, gestão de escalas de plantão e acionamento de plantonistas via WhatsApp.

---

## Índice

- [Visão Geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Funcionalidades](#funcionalidades)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Configuração](#configuração)
- [Execução Local](#execução-local)
- [Componentes](#componentes)
- [State Management](#state-management)
- [WebSocket (Tempo Real)](#websocket-tempo-real)
- [Autenticação](#autenticação)
- [Navegação e Views](#navegação-e-views)
- [Deploy em Kubernetes](#deploy-em-kubernetes)
- [Testes](#testes)

---

## Visão Geral

O frontend é a interface visual do Command On-Call. Ele:

1. **Exibe monitores em alerta** em tempo real (atualizado via WebSocket)
2. **Mostra o plantonista atual** de cada área com horário de entrada/saída
3. **Permite acionamento via WhatsApp** com mensagem formatada por escalão
4. **Importa escalas via CSV** (drag-and-drop)
5. **Oferece backoffice** para gestão de áreas, times, plantonistas, períodos e escalas
6. **Controla acesso** por perfil (Adm, Responsável, Plantonista)

---

## Tecnologias

| Tecnologia | Uso |
|------------|-----|
| React 18 | Biblioteca de UI |
| TypeScript | Tipagem estática |
| Zustand 5 | Gerenciamento de estado |
| Vite | Bundler / dev server |
| CSS Modules | Estilização (arquivos .css por componente) |
| WebSocket | Comunicação em tempo real com backend |
| Vitest | Framework de testes |

---

## Funcionalidades

### Dashboard Principal
- Relógio de Brasília em tempo real
- Grid de monitores com destaque visual por estado (Alert 🔴, Warn 🟡, OK 🟢, No Data ⚪)
- Campo de busca para filtrar monitores por nome
- Barra inferior com áreas e plantonistas do dia
- Quando não há plantonista cadastrado, mostra equipe completa da área

### Modal do Monitor (ao clicar)
- Template/mensagem configurada no Datadog
- Query do monitor
- Tags associadas
- Área responsável (identificada automaticamente)
- Botões de acionamento por escalão:
  - Abre WhatsApp Web com mensagem formatada
  - Inclui nome do monitor, horário, nível de escalação

### Importação de Escala (CSV)
- Upload via drag-and-drop ou seleção de arquivo
- Formato: Área, Colaborador, Cargo, Nível, Contato, Dia, Horário
- Criação automática de áreas e plantonistas inexistentes
- Template CSV disponível para download
- Dados persistem no banco (não precisa reimportar)

### Backoffice (Administração)
- **Áreas** — CRUD completo
- **Times** — CRUD completo
- **Plantonistas** — listagem, cadastro manual e via CSV
- **Períodos** — cadastro com controle de dias faltantes
- **Escalas** — vinculação área + período + plantonista
- **Cadeia de Escalação** — configuração por time (posição + contato)

### Tema
- Alternância entre modo escuro 🌙 e modo claro ☀️

---

## Estrutura de Pastas

```
src/frontend/
├── App.tsx                        # Componente raiz + navegação + auth check
├── App.css                        # Estilos globais
├── components/
│   ├── Dashboard.tsx / .css       # Tela principal (monitores + plantonistas)
│   ├── MonitorList.tsx / .css     # Grid de monitores
│   ├── TeamPanel.tsx / .css       # Painel por time
│   ├── MonitorDetailModal.tsx / .css  # Modal de detalhes do monitor
│   ├── EscalationView.tsx / .css  # Visualização de escalação
│   ├── CSVImport.tsx / .css       # Importação de CSV
│   ├── IncidentHistory.tsx / .css # Histórico de incidentes
│   ├── MonitorMapping.tsx / .css  # Mapeamento de monitores
│   ├── EscalationChainConfig.tsx / .css  # Config de escalação
│   ├── Login.tsx / .css           # Tela de login
│   ├── RegisterUser.tsx / .css    # Cadastro de usuário
│   ├── AreaSelector.tsx / .css    # Seleção de área pós-login
│   ├── SetupWizard.tsx / .css     # Wizard de verificação inicial
│   ├── AreaManagement.tsx / .css  # CRUD de áreas
│   ├── TeamManagement.tsx / .css  # CRUD de times
│   ├── PlantonistManagement.tsx / .css  # CRUD de plantonistas
│   ├── PeriodoManagement.tsx / .css     # CRUD de períodos
│   └── EscalaManagement.tsx / .css      # CRUD de escalas
├── hooks/
│   └── useWebSocket.ts           # Hook de conexão WebSocket
├── services/
│   └── websocket-client.ts       # Client WebSocket com reconnect
└── store/
    └── command-center-store.ts   # Zustand store (estado global)
```

---

## Configuração

### Variáveis de Ambiente

O frontend se comunica com o backend via URL relativa (mesmo domínio). Em desenvolvimento com Vite, configure o proxy no `vite.config.frontend.ts` se necessário.

| Variável | Descrição |
|----------|-----------|
| Backend URL | Mesma origem (porta 3000) ou proxy Vite |

### Secrets (Kubernetes)

```
Secret Path: dpsp-command-on-call-frontend/credentials
Region: sa-east-1
```

---

## Execução Local

### Pré-requisitos

- Node.js 20+
- npm
- Backend rodando (para API e WebSocket)

### Instalação

```bash
npm install
```

### Executar

```bash
# Frontend com Vite (hot module replacement)
npm run dev:frontend

# Ou junto com o backend
npm run dev
```

### Acessar

- **Dev (Vite):** http://localhost:5173
- **Com backend:** http://localhost:3000

---

## Componentes

### Telas Principais (Navegação)

| Componente | View ID | Descrição |
|------------|---------|-----------|
| `Dashboard` | `dashboard` | Tela principal com monitores e plantonistas |
| `CSVImport` | `csv-import` | Importação de escalas via CSV |
| `IncidentHistory` | `incident-history` | Histórico de incidentes com filtros |
| `MonitorMapping` | `monitor-mapping` | Mapeamento de monitores → times |
| `EscalationChainConfig` | `escalation-config` | Configuração de cadeia de escalação |

### Telas Administrativas (Adm only)

| Componente | View ID | Descrição |
|------------|---------|-----------|
| `TeamManagement` | `team-management` | CRUD de times |
| `AreaManagement` | `area-management` | CRUD de áreas |
| `PlantonistManagement` | `plantonist-management` | CRUD de plantonistas |
| `PeriodoManagement` | `periodo-management` | CRUD de períodos |
| `EscalaManagement` | `escala-management` | CRUD de escalas |

### Telas de Autenticação

| Componente | Quando |
|------------|--------|
| `Login` | Usuário não autenticado |
| `RegisterUser` | Cadastro de novo usuário |
| `AreaSelector` | Após login, seleção de área |
| `SetupWizard` | Verificação inicial (períodos, plantonistas, escalas) |

### Componentes Auxiliares

| Componente | Descrição |
|------------|-----------|
| `MonitorList` | Grid de cards de monitores |
| `TeamPanel` | Painel individual por time |
| `MonitorDetailModal` | Modal com detalhes + botões de acionamento WhatsApp |
| `EscalationView` | Visualização da escalação ativa |

---

## State Management

Utiliza **Zustand** como store global (`command-center-store.ts`):

### Estado Principal

```typescript
{
  monitors: Monitor[]           // Monitores do Datadog
  teams: TeamPanel[]            // Painéis de time
  activeIncidents: ActiveIncident[]  // Incidentes ativos
  connectionStatus: ConnectionStatus // 'connected' | 'disconnected' | 'reconnecting'

  // Autenticação
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  currentView: AppView

  // Filtros
  selectedAreas: string[]
}
```

### Persistência

- `token` e `user` são persistidos no `localStorage`
- Estado da autenticação é restaurado ao recarregar a página

---

## WebSocket (Tempo Real)

### Hook: useWebSocket

Conecta ao WebSocket do backend e atualiza a store automaticamente:

- **Reconexão automática** com backoff exponencial
- **Heartbeat** (ping/pong) a cada 30 segundos
- **Status** refletido na store (`connected`, `disconnected`, `reconnecting`)

### Eventos Recebidos

| Evento | Ação na Store |
|--------|---------------|
| `monitors_update` | Atualiza lista de monitores |
| `escalation_event` | Atualiza escalação do incidente |
| `incident_update` | Adiciona/atualiza incidente ativo |

---

## Autenticação

### Fluxo no Frontend

1. Usuário acessa a aplicação → exibe tela de `Login`
2. Preenche credenciais → `POST /api/auth/login`
3. Backend retorna JWT → salva em `localStorage` + store
4. Redireciona para `AreaSelector` (escolha de área)
5. Após seleção → `SetupWizard` verifica se há dados cadastrados
6. Exibe `Dashboard`

### Controle de Views por Perfil

| Perfil | Views Disponíveis |
|--------|-------------------|
| Adm | Todas (incluindo backoffice) |
| Responsável | Dashboard + Import + Histórico + Mapeamento + Escalação |
| Plantonista | Dashboard (somente leitura) |

---

## Navegação e Views

### Menu Principal (todos os perfis)

| Ícone | Label | View |
|-------|-------|------|
| 📊 | Dashboard | `dashboard` |
| 📄 | Importar Escala | `csv-import` |
| 📋 | Histórico | `incident-history` |
| 🔗 | Mapeamento | `monitor-mapping` |
| ⚡ | Escalação | `escalation-config` |

### Menu Admin (somente Adm)

| Ícone | Label | View |
|-------|-------|------|
| 👥 | Times | `team-management` |
| 🏢 | Áreas | `area-management` |
| 👤 | Plantonistas | `plantonist-management` |
| 📅 | Períodos | `periodo-management` |
| 📋 | Escalas | `escala-management` |

---

## Deploy em Kubernetes

### Namespace

```
dpsp-command-on-call
```

### Estrutura Kustomize

```
dpsp-command-on-call-frontend/
├── base/
│   ├── deployment.yaml       # Deployment (porta 80, Nginx/static)
│   ├── service.yaml          # NodePort (443 → 80)
│   ├── hpa.yaml              # HPA (CPU/Mem 75%)
│   ├── external-secrets.yaml # AWS Secrets Manager
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    ├── qa/
    └── prd/                  # min: 3, max: 5 réplicas
```

### Deploy

```bash
# Dev
kubectl apply -k command-on-call/dpsp-command-on-call-frontend/overlays/dev

# QA
kubectl apply -k command-on-call/dpsp-command-on-call-frontend/overlays/qa

# Produção
kubectl apply -k command-on-call/dpsp-command-on-call-frontend/overlays/prd
```

### Container Registry (ECR)

```
990365368476.dkr.ecr.sa-east-1.amazonaws.com/dpsp-command-on-call-frontend
```

### Recursos por Pod

| Recurso | Request | Limit |
|---------|---------|-------|
| CPU | 200m | 500m |
| Memória | 300Mi | 850Mi |

### Health Check

- **Liveness:** `GET /health` (porta 80)
- Delay: 120s | Intervalo: 60s | Timeout: 60s

### Ingress (Kong)

- Ingress class: `kong`
- Protocolo: HTTPS/HTTP (redirect 308)
- Strip path: `true`
- Preserve host: `false`

---

## Testes

```bash
npm test
```

Testes unitários com **Vitest** para os componentes:

- `Dashboard.test.ts`
- `MonitorList.test.ts`
- `TeamPanel.test.ts`
- `CSVImport.test.ts`
- `IncidentHistory.test.ts`
- `MonitorMapping.test.ts`
- `EscalationChainConfig.test.ts`
- `EscalationView.test.ts`
- `Login.test.ts`
- `RegisterUser.test.ts`
- `AreaSelector.test.ts`
- `SetupWizard.test.ts`
- `AreaManagement.test.ts`
- `PlantonistManagement.test.ts`
- `PeriodoManagement.test.ts`
- `EscalaManagement.test.ts`

---

## Build

```bash
# Build do frontend (output: dist/public)
npm run build:frontend

# Ou via Vite diretamente
npx vite build --config vite.config.frontend.ts --outDir dist/public
```

O build gera arquivos estáticos que são servidos pelo container (Nginx ou pelo próprio backend Express em modo monolito).

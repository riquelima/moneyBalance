# Prompt Antigravity — Transformação iOS Nativa

## Money Balance → iOS 18 Premium Finance

---

### Contexto do Projeto

Aplicativo financeiro pessoal (Money Balance) atualmente com:
- **Stack:** SPA (Vite/React), Tailwind CSS v3, Tailwind Forms + Container Queries
- **Tema:** Light + Dark (class-based), atualmente mais light
- **Fontes atuais:** Manrope (display), Zain, Poetsen One, Material Symbols Outlined
- **Paleta atual:** Primary #8854D0 (roxo), Secondary #20BF55 (verde), Accent #FFE66D (amarelo)
- **Layout:** Mobile-first (393px base), single-column SPA com bottom tab navigation
- **Seções:** Login, Dashboard (Home), Gastos/Análises, Transações, Agenda, Perfil

**Objetivo:** Transformar completamente a interface para parecer um app nativo iOS 18 premium — dark mode como padrão, glassmorphism refinado, animações spring suaves, micro-interações hápticas, tipografia San Francisco-like, e design system coerente.

---

### 1. Design Tokens

```css
:root {
  /* Background System — Cinema Dark */
  --bg-deep: #020203;
  --bg-base: #050506;
  --bg-elevated: #0a0a0c;
  --bg-surface: rgba(255, 255, 255, 0.05);
  --bg-glass: rgba(255, 255, 255, 0.08);
  
  /* Foreground */
  --fg-primary: #EDEDEF;
  --fg-secondary: #8A8F98;
  --fg-tertiary: #63666E;
  --fg-inverse: #020203;
  
  /* Accent — iOS Blue + Gradient */
  --accent-primary: #007AFF;
  --accent-secondary: #5856D6;
  --accent-gradient: linear-gradient(135deg, #007AFF, #5856D6);
  --accent-glow: rgba(0, 122, 255, 0.25);
  
  /* Semantic Colors — iOS System */
  --color-success: #34C759;
  --color-warning: #FF9500;
  --color-danger: #FF3B30;
  --color-info: #5AC8FA;
  
  /* Card & Surface */
  --card-bg: rgba(255, 255, 255, 0.06);
  --card-border: rgba(255, 255, 255, 0.08);
  --card-border-hover: rgba(255, 255, 255, 0.12);
  --card-radius: 16px;
  --card-padding: 16px;
  --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  
  /* Typography */
  --font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;
  --font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  
  /* Type Scale */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 17px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;
  
  /* Font Weights */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  
  /* Spacing System — 8px Grid */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  
  /* Border Radius — iOS */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
  
  /* Animation — iOS Spring */
  --spring-snappy: cubic-bezier(0.16, 1, 0.3, 1);
  --spring-smooth: cubic-bezier(0.22, 1, 0.36, 1);
  --spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 200ms;
  --duration-normal: 350ms;
  --duration-slow: 500ms;
  
  /* Blur — iOS Glassmorphism */
  --blur-xs: 4px;
  --blur-sm: 8px;
  --blur-md: 16px;
  --blur-lg: 24px;
  --blur-xl: 40px;
  
  /* Safe Area */
  --safe-top: env(safe-area-inset-top, 20px);
  --safe-bottom: env(safe-area-inset-bottom, 20px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  
  /* Tab Bar */
  --tab-height: 54px;
  --tab-icon-size: 24px;
}
```

---

### 2. Efeitos Globais

#### 2.1 Background Animado (Ambient Blobs)
Adicionar 2-3 bolhas animadas sutis no fundo de cada tela:
```css
.ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.06;
  animation: blob-float 20s ease-in-out infinite;
  pointer-events: none;
}

@keyframes blob-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
}
```
- Blob 1: 300x300px, background: #007AFF, top: -10%, right: -20%, animation-delay: 0s
- Blob 2: 250x250px, background: #5856D6, bottom: -5%, left: -15%, animation-delay: -7s
- Blob 3 (opcional): 200x200px, background: #34C759, bottom: 30%, right: -10%, animation-delay: -14s

#### 2.2 Glassmorphism Refinado
TODOS os cards usam este padrão:
```css
.glass-card {
  background: var(--card-bg);
  border: 0.5px solid var(--card-border);
  backdrop-filter: blur(var(--blur-md));
  -webkit-backdrop-filter: blur(var(--blur-md));
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  transition: all var(--duration-normal) var(--spring-snappy);
}

.glass-card:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.04);
}
```

#### 2.3 Scroll Suave iOS-like
```css
body, .scroll-container {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  overscroll-behavior-y: none;
}

/* iOS-style bounce no topo */
.scroll-container {
  overflow-y: auto;
}

/* Custom scrollbar fina */
::-webkit-scrollbar {
  width: 3px;
}
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 999px;
}
```

#### 2.4 Status Bar + Safe Area
```css
.status-bar {
  height: var(--safe-top);
  background: transparent;
}

.safe-area-bottom {
  height: var(--safe-bottom);
}
```

---

### 3. Tipografia iOS

Substituir fontes atuais por SF Pro-like:

```css
/* Headings — SF Pro Display, Bold */
h1, .title-large {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  letter-spacing: -0.5px;
  color: var(--fg-primary);
  line-height: 1.2;
}

h2, .title-medium {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  letter-spacing: -0.3px;
  color: var(--fg-primary);
}

/* Body — SF Pro Text, Regular */
body, p, .body-text {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  letter-spacing: -0.2px;
  line-height: 1.4;
  color: var(--fg-secondary);
}

/* Monetary values — Mono */
.money-value, .amount, .price {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

/* Labels pequenos — SF Pro Text, Semibold, caps */
.label, .badge, .caption {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--fg-tertiary);
}
```

---

### 4. Tab Bar — Estilo iOS 18

Bottom tab navigation deve imitar a tab bar nativa do iOS 18:

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--tab-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: rgba(5, 5, 6, 0.85);
  backdrop-filter: blur(var(--blur-xl));
  -webkit-backdrop-filter: blur(var(--blur-xl));
  border-top: 0.5px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 100;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: var(--tab-height);
  flex: 1;
  transition: all var(--duration-fast) var(--spring-snappy);
  -webkit-tap-highlight-color: transparent;
}

.tab-item:active {
  transform: scale(0.9);
}

.tab-icon {
  font-size: var(--tab-icon-size);
  color: var(--fg-tertiary);
  transition: color var(--duration-fast) ease;
}

.tab-item.active .tab-icon {
  color: var(--accent-primary);
}

.tab-item.active .tab-label {
  color: var(--accent-primary);
}

.tab-label {
  font-size: 10px;
  font-weight: var(--weight-medium);
  letter-spacing: -0.2px;
  color: var(--fg-tertiary);
  transition: color var(--duration-fast) ease;
}

/* Ícone de "Adicionar" como FAB central */
.tab-add-button {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px var(--accent-glow);
  transition: all var(--duration-normal) var(--spring-bounce);
  margin-top: -12px;
}

.tab-add-button:active {
  transform: scale(0.85);
}

.tab-add-button .material-symbols-outlined {
  color: white;
  font-size: 28px;
  font-variation-settings: 'FILL' 1, 'wght' 400;
}
```

**Ícones da Tab Bar:**
| Aba | Ícone (Material Symbol) | Label |
|-----|------------------------|-------|
| Início | `home` | Início |
| Gastos | `bar_chart` | Gastos |
| + | `add` | (sem label) |
| Transações | `receipt_long` | Transações |
| Agenda | `calendar_month` | Agenda |

---

### 5. Tela de Login — iOS Style

```html
<div class="login-screen">
  <!-- Ambient blobs no fundo -->
  
  <div class="login-content">
    <!-- Logo + Nome -->
    <div class="login-branding">
      <div class="login-icon-wrapper">
        <span class="material-symbols-outlined login-icon">account_balance_wallet</span>
      </div>
      <h1 class="login-title">Money Balance</h1>
      <p class="login-subtitle">Gestão Financeira Inteligente</p>
    </div>
    
    <!-- Formulário iOS-style -->
    <div class="login-form">
      <div class="ios-input-group">
        <div class="ios-input-field">
          <span class="material-symbols-outlined input-icon">mail</span>
          <input type="email" placeholder="E-mail" class="ios-input" />
        </div>
        <div class="ios-input-divider"></div>
        <div class="ios-input-field">
          <span class="material-symbols-outlined input-icon">lock</span>
          <input type="password" placeholder="Senha" class="ios-input" />
          <button class="password-toggle">visibility_off</button>
        </div>
      </div>
      
      <button class="ios-button-primary">
        Acessar Conta
        <span class="material-symbols-outlined button-arrow">arrow_forward</span>
      </button>
      
      <button class="ios-button-secondary">
        <span class="material-symbols-outlined">face</span>
        Login Facial
      </button>
      
      <button class="ios-link-button">Esqueci minha senha</button>
    </div>
    
    <p class="login-footer">
      Não tem conta? <button class="ios-link-accent">Criar agora</button>
    </p>
  </div>
</div>
```

**Estilos do formulário iOS:**

```css
.ios-input-group {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.ios-input-field {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  transition: background var(--duration-fast) ease;
}

.ios-input-field:focus-within {
  background: rgba(255, 255, 255, 0.03);
}

.ios-input-divider {
  height: 0.5px;
  background: rgba(255, 255, 255, 0.08);
  margin-left: 52px;
}

.ios-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 17px;
  color: var(--fg-primary);
  font-family: var(--font-body);
  padding: 0;
  line-height: 1.4;
}

.ios-input::placeholder {
  color: var(--fg-tertiary);
}

.ios-button-primary {
  width: 100%;
  height: 56px;
  border-radius: 14px;
  background: var(--accent-gradient);
  color: white;
  font-size: 17px;
  font-weight: var(--weight-semibold);
  font-family: var(--font-body);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 20px var(--accent-glow);
  transition: all var(--duration-normal) var(--spring-snappy);
}

.ios-button-primary:active {
  transform: scale(0.97);
  box-shadow: 0 2px 10px var(--accent-glow);
}
```

**Animação de entrada da tela de login:**
```css
.login-content > * {
  opacity: 0;
  transform: translateY(20px);
  animation: fade-slide-in var(--duration-slow) var(--spring-snappy) forwards;
}

.login-content > *:nth-child(1) { animation-delay: 0.1s; }
.login-content > *:nth-child(2) { animation-delay: 0.2s; }
.login-content > *:nth-child(3) { animation-delay: 0.3s; }
.login-content > *:nth-child(4) { animation-delay: 0.4s; }

@keyframes fade-slide-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### 6. Dashboard (Home)

#### 6.1 Header
```css
.dashboard-header {
  padding: var(--safe-top) var(--space-4) var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.greeting-text {
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
  letter-spacing: 0.3px;
}

.user-name {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: var(--fg-primary);
  letter-spacing: -0.5px;
}

.notification-button {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--card-bg);
  border: 0.5px solid var(--card-border);
  display: grid;
  place-items: center;
  transition: all var(--duration-fast) var(--spring-snappy);
}

.notification-button:active {
  transform: scale(0.88);
}
```

#### 6.2 Balance Card — iOS Wallet Style
O card de saldo atual deve imitar o Apple Wallet/Card:

```css
.balance-card {
  margin: var(--space-2) var(--space-4) var(--space-4);
  border-radius: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  min-height: 180px;
}

/* Efeito shimmer sutil no card */
.balance-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.03) 0%, transparent 50%);
}

.balance-label {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: var(--weight-medium);
}

.balance-amount {
  font-family: var(--font-mono);
  font-size: 40px;
  font-weight: var(--weight-bold);
  color: white;
  letter-spacing: -1px;
  margin: 4px 0;
}

.balance-period {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.4);
}

.balance-card-footer {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 0.5px solid rgba(255, 255, 255, 0.08);
}

.balance-stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.balance-stat-label {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.5);
}

.balance-stat-value {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: white;
}
```

#### 6.3 Métricas Cards — iOS Widget Style (4 cards grid)

```css
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  margin-bottom: var(--space-6);
}

.metric-card {
  background: var(--card-bg);
  border: 0.5px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
  position: relative;
  overflow: hidden;
  transition: all var(--duration-normal) var(--spring-snappy);
}

.metric-card:active {
  transform: scale(0.96);
}

/* Ícone sutil no canto */
.metric-card-icon {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  font-size: 20px;
  opacity: 0.3;
}

.metric-label {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-weight: var(--weight-medium);
}

.metric-value {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--fg-primary);
  margin-top: var(--space-1);
}

.metric-change {
  font-size: var(--text-xs);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: var(--space-2);
}

.metric-change.positive { color: var(--color-success); }
.metric-change.negative { color: var(--color-danger); }
```

**4 métricas:**
| Card | Ícone | Cor de Destaque |
|------|-------|-----------------|
| Total Gasto | `trending_down` | #FF3B30 (red) |
| Economizado | `savings` | #34C759 (green) |
| Não pagos | `warning` | #FF9500 (orange) |
| Já pagos | `check_circle` | #007AFF (blue) |

#### 6.4 Contas a Pagar — iOS List Style

```css
.bills-section {
  margin: var(--space-6) var(--space-4);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--fg-primary);
}

.section-link {
  font-size: var(--text-sm);
  color: var(--accent-primary);
  font-weight: var(--weight-medium);
  transition: opacity var(--duration-fast) ease;
}

.section-link:active {
  opacity: 0.6;
}

.bill-item {
  display: flex;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.05);
  transition: all var(--duration-fast) ease;
}

.bill-item:last-child {
  border-bottom: none;
}

.bill-item:active {
  opacity: 0.6;
  transform: translateX(4px);
}

.bill-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(0, 122, 255, 0.1);
  display: grid;
  place-items: center;
  margin-right: var(--space-3);
  font-size: 20px;
  flex-shrink: 0;
}

.bill-info {
  flex: 1;
}

.bill-name {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--fg-primary);
}

.bill-amount {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--fg-secondary);
}

.bill-status {
  font-size: var(--text-xs);
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--weight-medium);
}

.bill-status.urgent {
  background: rgba(255, 59, 48, 0.15);
  color: var(--color-danger);
}

.bill-status.upcoming {
  background: rgba(255, 149, 0, 0.15);
  color: var(--color-warning);
}
```

#### 6.5 Transações Recentes — iOS List

```css
.transaction-item {
  display: flex;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.05);
  transition: all var(--duration-fast) ease;
}

.transaction-item:active {
  opacity: 0.6;
  transform: translateX(4px);
}

.transaction-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  margin-right: var(--space-3);
  font-size: 20px;
  flex-shrink: 0;
}

.transaction-icon.income {
  background: rgba(52, 199, 89, 0.15);
  color: var(--color-success);
}

.transaction-icon.expense {
  background: rgba(255, 59, 48, 0.15);
  color: var(--color-danger);
}

.transaction-info {
  flex: 1;
}

.transaction-name {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--fg-primary);
}

.transaction-date {
  font-size: var(--text-sm);
  color: var(--fg-tertiary);
}

.transaction-amount {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  text-align: right;
}

.transaction-amount.positive {
  color: var(--color-success);
}

.transaction-amount.negative {
  color: var(--fg-primary);
}
```

#### 6.6 Gráficos — iOS Health Style

```css
.chart-section {
  margin: var(--space-6) var(--space-4);
}

.chart-controls {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.chart-tab {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  background: transparent;
  color: var(--fg-tertiary);
  border: 0.5px solid transparent;
  transition: all var(--duration-fast) var(--spring-snappy);
}

.chart-tab.active {
  background: rgba(0, 122, 255, 0.15);
  color: var(--accent-primary);
  border-color: rgba(0, 122, 255, 0.2);
}

.chart-tab:active {
  transform: scale(0.95);
}

/* Barras do gráfico animadas */
.chart-bar {
  border-radius: 4px 4px 0 0;
  transition: height var(--duration-slow) var(--spring-snappy);
  min-width: 8px;
}

.chart-bar.expense {
  background: var(--color-danger);
  opacity: 0.7;
}

.chart-bar.income {
  background: var(--color-success);
  opacity: 0.7;
}
```

---

### 7. Animações e Micro-Interações

#### 7.1 Spring System
```css
/* Button press — scale feedback */
button:active, .clickable:active {
  transform: scale(0.96);
  transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Card press */
.glass-card:active {
  transform: scale(0.98);
  transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* List item press */
.list-item:active {
  opacity: 0.6;
  transform: translateX(4px);
  transition: all 100ms ease;
}
```

#### 7.2 Page Transitions
```css
/* Fade + slide entre telas */
.page-enter {
  animation: page-enter var(--duration-normal) var(--spring-snappy);
}

@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stagger children */
.stagger-children > * {
  opacity: 0;
  animation: fade-slide-in var(--duration-slow) var(--spring-snappy) forwards;
}

.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
.stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
.stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
.stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
```

#### 7.3 Skeleton Loading — iOS Style
```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### 7.4 Pull to Refresh
```css
/* Efeito de loading spinner no topo ao puxar */
.pull-indicator {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--duration-normal) ease;
}

.pull-indicator.active {
  opacity: 1;
}

.pull-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

#### 7.5 Number Counter Animation
```css
/* Animação de contagem nos valores */
.money-value-animated {
  transition: all var(--duration-slow) var(--spring-snappy);
}
```
Para implementar o contador animado (tipo iOS calculadora): usar `requestAnimationFrame` com easeOutCubic para animar números de 0 até o valor final.

---

### 8. Tela de Transações

#### 8.1 Search Bar — iOS Style
```css
.search-bar {
  margin: var(--space-2) var(--space-4);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0.5px solid rgba(255, 255, 255, 0.05);
  transition: all var(--duration-normal) var(--spring-snappy);
}

.search-bar:focus-within {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.3);
}

.search-bar input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 17px;
  color: var(--fg-primary);
  font-family: var(--font-body);
}

.search-bar input::placeholder {
  color: var(--fg-tertiary);
}

.filter-chips {
  display: flex;
  gap: var(--space-2);
  padding: 0 var(--space-4);
  margin-bottom: var(--space-3);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-chip {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.05);
  color: var(--fg-secondary);
  border: 0.5px solid rgba(255, 255, 255, 0.05);
  transition: all var(--duration-fast) var(--spring-snappy);
}

.filter-chip.active {
  background: rgba(0, 122, 255, 0.15);
  color: var(--accent-primary);
  border-color: rgba(0, 122, 255, 0.2);
}
```

#### 8.2 Transaction List (Full)
Same style as 6.5 but with date section headers:
```css
.date-section-header {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--fg-tertiary);
  padding: var(--space-4) var(--space-4) var(--space-2);
  text-transform: uppercase;
  letter-spacing: 1px;
}
```

---

### 9. Tela de Gastos/Análises

#### 9.1 Segmented Control iOS-style
```css
.segmented-control {
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 2px;
  margin: var(--space-2) var(--space-4);
}

.segmented-option {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--fg-tertiary);
  transition: all var(--duration-normal) var(--spring-snappy);
}

.segmented-option.active {
  background: var(--accent-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}
```

#### 9.2 Income/Expense Cards
```css
.analysis-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  margin: var(--space-4) 0;
}

.analysis-card {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 0.5px solid var(--card-border);
}

.analysis-card.expense {
  background: rgba(255, 59, 48, 0.08);
}

.analysis-card.income {
  background: rgba(52, 199, 89, 0.08);
}

.analysis-card-label {
  font-size: var(--text-xs);
  color: var(--fg-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.analysis-card-value {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--fg-primary);
  margin-top: var(--space-1);
}
```

#### 9.3 Monthly Bar Chart
Barras animadas com spring para cada mês, com tooltip ao tocar:
```css
.month-bar {
  border-radius: 6px 6px 0 0;
  transition: height 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  cursor: pointer;
}

.month-bar:hover::after {
  content: attr(data-value);
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-family: var(--font-mono);
  background: rgba(0,0,0,0.8);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
```

---

### 10. Tela de Agenda

iOS Calendar-style com eventos financeiros:
```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  padding: var(--space-4);
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  transition: all var(--duration-fast) var(--spring-snappy);
}

.calendar-day.today {
  background: var(--accent-primary);
  color: white;
  font-weight: var(--weight-semibold);
}

.calendar-day.has-event::after {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-danger);
  margin-top: 2px;
}

.calendar-day:active {
  transform: scale(0.9);
}
```

---

### 11. Modais e Sheets — iOS Bottom Sheet

```css
/* Bottom sheet — estilo iOS */
.bottom-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
  opacity: 0;
  animation: fade-in 0.2s ease forwards;
}

@keyframes fade-in {
  to { opacity: 1; }
}

.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-elevated);
  border-radius: 20px 20px 0 0;
  padding: var(--space-4);
  padding-bottom: calc(var(--safe-bottom) + var(--space-4));
  transform: translateY(100%);
  animation: slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  z-index: 201;
  border-top: 0.5px solid var(--card-border);
}

@keyframes slide-up {
  to { transform: translateY(0); }
}

.sheet-handle {
  width: 36px;
  height: 5px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  margin: 0 auto var(--space-4);
}
```

---

### 12. Dark Mode como Padrão

O app DEVE iniciar em dark mode. O light mode é opcional.

```css
/* Light mode override */
@media (prefers-color-scheme: light) {
  /* Opcional: sobrescrever tokens para light mode */
}

/* Classes do sistema */
.dark { /* dark mode - default */ }
.light { /* light mode - alternativo */ }
```

---

### 13. PWA e Native Feel

```html
<!-- No index.html -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Money Balance">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="theme-color" content="#020203">
```

```css
/* Prevenir seleção acidental */
body {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* Permitir seleção apenas em inputs */
input, textarea {
  -webkit-user-select: text;
  user-select: text;
}

/* Tap highlight transparente */
* {
  -webkit-tap-highlight-color: transparent;
}
```

---

### 14. Checklist de Verificação iOS Native

- [ ] **Safe areas**: `env(safe-area-inset-*)` em todos os cantos
- [ ] **Tab bar**: glassmorphism, blur, 54px height, 10px labels, spring press
- [ ] **Headers**: large titles (SF Pro Display Bold), integrated back buttons
- [ ] **Cards**: glass card pattern em TODOS, border 0.5px hairline
- [ ] **Press feedback**: scale(0.96-0.98) em todos os clicáveis com spring bounce
- [ ] **Animations**: spring easing `cubic-bezier(0.16, 1, 0.3, 1)` em transições
- [ ] **Stagger**: fade-slide-in children com delay progressivo
- [ ] **Skeleton**: shimmer loading em todas as telas
- [ ] **Typography**: SF Pro em todo lugar, tabular-nums em valores
- [ ] **Colors**: iOS system colors (red, green, blue, orange)
- [ ] **Scroll**: overscroll-behavior, bounce, scrollbar fina
- [ ] **Ambient**: animated blobs sutis no fundo
- [ ] **Status bar**: transparente, conteúdo por baixo
- [ ] **Touch targets**: mínimo 44x44px (iOS HIG)
- [ ] **Font rendering**: `-webkit-font-smoothing: antialiased` em Mac
- [ ] **No FOUC**: tema definido antes do render via script inline
- [ ] **Icons**: Material Symbols Outlined com FILL 0, wght 300
- [ ] **Bottom sheets**: slide-up animation com handle grabber
- [ ] **Segmented control**: iOS-style pill toggle
- [ ] **Pull to refresh**: spinner nativo

---

### 15. Arquivos a Modificar

1. `src/index.css` → Substituir por completo com os Design Tokens + efeitos globais
2. Componentes de layout (Header, TabBar, etc.) → Aplicar novos estilos iOS
3. Telas: Login, Dashboard, Transações, Gastos/Análises, Agenda
4. Componentes compartilhados: Card, Button, Input, Modal, Skeleton

---

### 16. Inspiração Visual

Buscar referência em:
- **Apple Wallet** — cartões de crédito com gradiente, glassmorphism
- **iOS Health** — métricas em cards, gráficos simplificados
- **iOS Settings** — listas com seções agrupadas, chevrons
- **iOS Calendar** — grid de calendário com dots de eventos
- **iOS Music** — glass tab bar, blurred backgrounds
- **Robinhood / Monzo** — fintech dark mode premium

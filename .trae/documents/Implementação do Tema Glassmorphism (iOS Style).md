O plano a seguir detalha a transformação completa da interface para o estilo **Glassmorphism**, garantindo consistência, modernidade e performance, conforme solicitado.

### 1. Sistema de Design & Configuração Global (index.html)
Vamos redefinir a base visual do aplicativo removendo o tema "Neo-Brutalist" e injetando as variáveis do Glassmorphism.

*   **Tokens de Design (Tailwind):**
    *   **Cores:** Definir paleta semitransparente (ex: `bg-white/10`, `bg-black/20`).
    *   **Blur:** Padronizar `backdrop-blur-md` (12px) e `backdrop-blur-lg` (16px).
    *   **Bordas:** Remover bordas grossas pretas; adotar `border border-white/20`.
    *   **Sombras:** Substituir `shadow-neo` por sombras suaves (`shadow-lg`, `shadow-xl`) com cores coloridas/difusas.
*   **Background Global:** Adicionar um gradiente de fundo rico no `body` para que o efeito de vidro seja visível e impactante.

### 2. Refatoração de Componentes
Aplicaremos o novo estilo componente por componente, substituindo classes antigas pelas novas.

#### A. Estrutura e Navegação
*   **BottomNav.tsx:** Já possui base glass, mas será refinado para usar os novos tokens padronizados e garantir contraste.
*   **BottomSheet.tsx:** O fundo do modal receberá `backdrop-blur-md` para focar no conteúdo.

#### B. Dashboard (Principal)
*   **Cards de Resumo (Hoje/Ontem):**
    *   De: Fundo sólido, borda preta grossa.
    *   Para: `bg-white/10`, `backdrop-blur-md`, borda fina `white/20`, sombra suave.
*   **Gráficos e Listas:** Containers translúcidos com cantos arredondados (`rounded-2xl` ou `rounded-3xl` para padrão iOS).
*   **PastSelfWidget:** Atualizar para seguir a mesma estética flutuante.

#### C. Telas Secundárias
*   **Settings.tsx:** Transformar a lista de configurações em "tiras de vidro" flutuantes, removendo as divisórias rígidas.
*   **Reports.tsx & Transactions.tsx:** Padronizar os cards de estatísticas e formulários de entrada.

### 3. Animações e Interações (iOS Feel)
Implementaremos feedback visual refinado usando `Framer Motion` e classes CSS.
*   **Hover/Active:** Efeito de escala (`scale-95` ao clicar) e aumento de opacidade do fundo.
*   **Transições:** Padronizar `duration-300` e `ease-in-out` para todas as mudanças de estado.
*   **Parallax:** Adicionar leve movimento nos elementos de fundo (se aplicável sem comprometer performance).

### 4. Performance
*   Utilizar propriedades que ativam aceleração de hardware (`transform`, `opacity`, `filter`).
*   Evitar blurs excessivos em áreas muito grandes de rolagem se houver queda de FPS.

### Cronograma de Execução
1.  **Setup:** Limpar `index.html` e definir novos estilos base.
2.  **Migração:** Refatorar Dashboard e Navegação (mudança de maior impacto).
3.  **Expansão:** Aplicar estilo em Settings, Reports e Transactions.
4.  **Polimento:** Ajustar animações e verificar contraste (modo Dark/Light).

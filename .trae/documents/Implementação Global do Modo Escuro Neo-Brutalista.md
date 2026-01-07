## Objetivo
Implementar o modo escuro (Dark Mode) globalmente na aplicação, garantindo consistência visual, persistência e aderência ao estilo Neo-Brutalista em todas as telas.

## Análise e Diagnóstico
1.  **Configuração Atual (`index.html`):** O Tailwind está configurado com `darkMode: 'class'`, mas as cores `background-dark` e `surface-dark` estão mapeadas incorretamente para tons claros (`#F7F7F7`, `#FFFFFF`), impedindo a inversão de cores.
2.  **Uso de Classes:** A maioria dos componentes usa classes hardcoded (`bg-white`, `text-dark`, `border-dark`) que não reagem à classe `dark` no HTML.
3.  **Layout Global (`App.tsx`):** Define `bg-background-dark` (atualmente claro) como fundo principal.
4.  **Componentes:** `BottomNav`, `Dashboard`, `Transactions`, etc., precisam de atualizações manuais para incluir classes com prefixo `dark:`.

## Plano de Implementação

### 1. Atualizar Configuração do Tailwind (`index.html`)
Redefinir as cores para suportar semanticamente os dois modos:
*   `background-light`: `#F7F7F7` (Cinza muito claro)
*   `background-dark`: `#000000` (Preto absoluto)
*   `surface-light`: `#FFFFFF` (Branco)
*   `surface-dark`: `#121212` (Preto suave para cartões)
*   Manter cores de destaque (`primary`, `secondary`, `danger`) vibrantes para contraste.

### 2. Atualizar Layout Principal (`App.tsx`)
*   Alterar o container principal para usar `bg-background-light dark:bg-background-dark`.
*   Definir cor de texto base: `text-dark dark:text-white`.

### 3. Atualizar Componentes Globais (`components/BottomNav.tsx`)
*   Fundo: `bg-white dark:bg-surface-dark`.
*   Bordas: `border-dark dark:border-white`.
*   Ícones/Texto: `text-dark dark:text-white` (com hover mantendo `text-primary`).

### 4. Atualizar Páginas Principais
Iterar sobre `Dashboard.tsx`, `Transactions.tsx`, `Reports.tsx`, `ProjecaoFutura.tsx`, `AddTransaction.tsx` aplicando o padrão Neo-Brutalista Dark:
*   **Fundo de Cards:** `bg-white` -> `bg-white dark:bg-surface-dark`.
*   **Bordas:** `border-dark` -> `border-dark dark:border-white`.
*   **Texto:** `text-dark` -> `text-dark dark:text-white`.
*   **Sombras:** `shadow-neo` -> `shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]` (Sombra branca dura para contraste).
*   **Inputs/Selects:** Fundo escuro com texto claro e borda branca.

### 5. Validação
*   Verificar se o toggle em `Settings` alterna corretamente a classe `dark` no `<html>`.
*   Confirmar se a persistência no `localStorage` funciona (já implementada em Settings).
*   Garantir que não haja "flashes" de cores incorretas ou textos ilegíveis (preto sobre preto).

## Ordem de Execução
1.  `index.html` (Configuração de Cores)
2.  `App.tsx` (Layout Base)
3.  `BottomNav.tsx` (Navegação)
4.  `Dashboard.tsx` (Tela Inicial)
5.  `Transactions.tsx` (Listagem)
6.  `Reports.tsx` (Relatórios)
7.  `ProjecaoFutura.tsx` & `AddTransaction.tsx` (Telas Secundárias)

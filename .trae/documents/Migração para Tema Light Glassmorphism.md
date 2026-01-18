O plano é migrar o design system de "Dark Glassmorphism" para **"Light Glassmorphism"** para corrigir os problemas de contraste e atender à solicitação de tema claro.

### 1. Ajuste Global (`index.html`)
*   Manter o fundo gradiente claro (`#f3f4f6` a `#e5e7eb`).
*   Garantir que a cor padrão do texto seja escura (`text-gray-900`).

### 2. Menu Inferior (`BottomNav.tsx`)
*   **Fundo:** Alterar de `bg-[#1A1A1A]/80` para `bg-white/80` (vidro claro).
*   **Ícones:** Alterar de `text-white/40` para `text-gray-400` (inativo) e `text-primary` (ativo).
*   **FAB (Botão +):** Ajustar a borda para `border-white/50` para combinar com o tema claro.

### 3. Calendário (`CalendarView.tsx`)
*   **Container:** Alterar de `bg-white/5` para `bg-white/70` (vidro fosco mais opaco).
*   **Texto:** Alterar todos os `text-white` para `text-gray-900` (dias, títulos).
*   **Dias Inativos:** Ajustar opacidade para manter legibilidade.
*   **Marcadores:** Garantir que as bolinhas de receita/despesa tenham contraste.

### 4. Revisão Geral de Fontes e Contraste
Aplicarei o padrão **Light Glass** em todas as telas principais (`Dashboard`, `Transactions`, `Reports`, `Settings`):
*   **Cards/Containers:** `bg-white/60` ou `bg-white/70` com `backdrop-blur-xl`.
*   **Bordas:** `border-white/40` ou `border-gray-200/50`.
*   **Sombras:** `shadow-lg` com cor suave (`black/5` ou `primary/10`).
*   **Títulos/Textos:** Substituir `text-white` por `text-gray-900` e `text-white/50` por `text-gray-500`.

Isso resolverá o problema de "texto branco no fundo branco" e criará uma interface limpa, legível e moderna.
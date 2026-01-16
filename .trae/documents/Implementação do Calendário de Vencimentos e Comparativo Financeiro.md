Vou implementar as funcionalidades solicitadas em 4 etapas principais, garantindo integração com o design system Neo-brutalism e o backend Supabase.

### 1. Configuração e Dependências
*   Instalar a biblioteca `date-fns` conforme solicitado para manipulação robusta de datas.
*   Criar estrutura de pastas organizada: `components/calendar`, `components/dashboard`, `components/ui`.

### 2. Componente Genérico "Bottom Sheet"
Desenvolver um componente reutilizável `BottomSheet.tsx` usando `framer-motion` que servirá de base para os detalhes do calendário.
*   **Features:** Animação de deslize (slide-up), backdrop escurecido, gestos de fechar (drag down) e acessibilidade (foco).

### 3. Funcionalidade 1: Calendário de Vencimentos
*   **Componente `CalendarView.tsx`:**
    *   Grid mensal responsivo gerado dinamicamente com `date-fns`.
    *   Header com navegação de meses.
    *   Integração com Supabase para buscar transações do mês visível.
*   **Indicadores Visuais:**
    *   Lógica para identificar dias com contas (vermelho) e recebimentos (verde).
    *   Renderização de "dots" discretos nos dias correspondentes.
*   **Interatividade:**
    *   Ao clicar no dia, abrir o `BottomSheet` com a lista de transações daquela data.
    *   Botão de ação rápida "Marcar como Pago" direto na lista.
*   **Página Dedicada:** Criar `pages/CalendarPage.tsx` e adicionar à rota `/calendar`.

### 4. Funcionalidade 2: Comparativo "Eu do Passado"
*   **Componente `PastSelfWidget.tsx`:**
    *   Widget para a Dashboard (`Home.tsx`).
    *   **Lógica de Dados:**
        *   Buscar totais por categoria do mês atual.
        *   Buscar totais por categoria do mês anterior.
        *   Calcular variação percentual.
    *   **Interface:**
        *   Cards com ícones contextuais (ex: seta para cima vermelha se gastou mais em despesas supérfluas).
        *   Mensagens geradas dinamicamente ("Você economizou 10% em Mercado!").
        *   Estilização consistente (bordas, sombras neo-brutalist).

### Tecnologias Chave
*   **Frontend:** React, Tailwind CSS, Framer Motion.
*   **Lógica:** date-fns, Hooks personalizados (`useTransactions`).
*   **Backend:** Supabase (Queries filtradas por data).

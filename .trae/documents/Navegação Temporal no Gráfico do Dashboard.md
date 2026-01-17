Vou atualizar o gráfico do Dashboard para permitir a navegação entre anos, exibindo os dados históricos de forma fluida.

**Plano de Implementação:**

1.  **Estado do Ano do Gráfico:** Criar um estado `chartYear` separado do `selectedYear` global (ou reutilizá-lo se a intenção for sincronizar tudo), para controlar qual ano está sendo exibido no gráfico de barras.
2.  **Controles de Navegação:** Adicionar setas (esquerda/direita) ao cabeçalho da seção "Gráficos" para permitir trocar o ano visualizado.
3.  **Gestos (Swipe):** Implementar detecção de gestos de deslize (swipe) usando `framer-motion` no container do gráfico para navegar entre anos (esquerda -> ano anterior, direita -> próximo ano).
4.  **Busca de Dados Históricos:** Atualizar a função `buildChart` para buscar os dados baseados no `chartYear` selecionado, garantindo que as barras reflitam corretamente as entradas/saídas do ano em questão.
5.  **Animação:** Adicionar animação de transição (`AnimatePresence`) para suavizar a troca entre os anos.

Isso permitirá que o usuário visualize facilmente o histórico financeiro de anos anteriores sem sair da tela principal.
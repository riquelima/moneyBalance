Vou implementar o filtro de ano na página de Transações e atualizar o ícone do widget "Eu do Passado".

**Plano de Implementação:**

1.  **Filtro de Ano em `Transactions.tsx`:**
    *   Adicionar estado `yearFilter` (padrão: ano atual).
    *   Calcular dinamicamente os anos disponíveis com base nas transações (`items`), garantindo que o ano atual sempre esteja na lista.
    *   Inserir a seção de seleção de ano no modal de filtros (antes do mês).
    *   Atualizar a lógica de `filteredItems` para filtrar também pelo ano selecionado (se não for 'all').
    *   Atualizar a função de "Limpar" para resetar o ano para 'all' ou ano atual (vou resetar para 'all' para consistência, ou manter o comportamento atual de resetar tudo).
2.  **Atualização de Ícone em `PastSelfWidget.tsx`:**
    *   Substituir o ícone `history_edu` por `history`, que é mais apropriado e foi solicitado pelo usuário.

Essas mudanças resolvem a dificuldade de navegar entre anos no histórico e melhoram a semântica visual do widget.
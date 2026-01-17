Vou atualizar a página de Transações para buscar as categorias diretamente do banco de dados, garantindo que o filtro reflita exatamente o que o usuário criou.

**Plano de Implementação:**

1.  **Estado Dinâmico:** Criar um novo estado `userCategories` em `Transactions.tsx` para armazenar a lista de categorias do usuário.
2.  **Busca no Banco de Dados:** Adicionar um `useEffect` que conecta ao Supabase na tabela `user_categories` e busca os nomes das categorias pertencentes ao usuário logado (`user_id`).
3.  **Atualização em Tempo Real:** Configurar uma subscrição do Supabase (`.on('postgres_changes'...)`) para atualizar a lista automaticamente caso o usuário crie ou remova categorias em outra aba ou dispositivo.
4.  **Integração com o Filtro:** Atualizar a lógica de `categoriesForFilter` para usar essa nova lista dinâmica em vez da lista estática importada.
    *   Manter a lógica que adiciona "Sem Categoria" automaticamente se existirem transações sem classificação.
    *   Manter o botão "Todas" fixo no início.
5.  **Limpeza:** Garantir que o tratamento de lista vazia funcione (o filtro mostrará apenas "Todas" e "Sem Categoria" se não houver categorias personalizadas).

Essa alteração garante que o seletor de filtros esteja sempre sincronizado com os dados reais do usuário.
Vou refatorar a interface de filtro em `Transactions.tsx` para resolver o problema de sobreposição e acessibilidade.

**Plano de Implementação:**

1.  **Alterar o Contêiner do Modal:** Em vez de usar `fixed inset-0` (que cria um overlay sobre toda a tela), vou mover o conteúdo do filtro para dentro de um bloco expansível (dropdown/accordion) logo abaixo da barra de pesquisa.
2.  **Comportamento:**
    *   Ao clicar no botão de filtro, em vez de abrir um modal, uma seção deslizará para baixo (`AnimatePresence` + `motion.div`) empurrando o conteúdo da lista de transações.
    *   Isso garante que o filtro faça parte do fluxo da página, permitindo rolagem natural se a lista de categorias ou opções for longa, especialmente em telas menores.
3.  **Remover Overlay:** Eliminar o fundo escurecido (`bg-black/60`) que bloqueava a interação com o restante do app.
4.  **Manter Funcionalidade:** Todos os seletores (Status, Tipo, Ano, Mês, Categoria) e botões de ação (Limpar, Aplicar) serão preservados.

Essa mudança melhora a UX em mobile, evitando que o teclado ou a barra de endereços do navegador ocultem partes do modal fixo.
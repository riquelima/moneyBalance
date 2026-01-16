Vou implementar a funcionalidade de colapso/expansão no widget "Eu do Passado" (`PastSelfWidget.tsx`) conforme suas instruções.

**Plano de Implementação:**

1.  **Estado de Controle:** Adicionar um estado `isOpen` (inicializado como `false` para começar colapsado).
2.  **Interatividade no Cabeçalho:**
    *   Transformar o `h3` em um elemento interativo (com cursor pointer).
    *   Adicionar um manipulador `onClick` para alternar o estado `isOpen`.
    *   Adicionar um ícone de seta (`expand_more`/`expand_less`) que rotaciona conforme o estado para feedback visual claro.
3.  **Animação Suave:**
    *   Envolver o container dos cards (`div.grid`) com `AnimatePresence` e `motion.div`.
    *   Usar as propriedades `initial`, `animate` e `exit` do Framer Motion para animar a altura (`height`) e a opacidade (`opacity`), criando o efeito de deslizar suave (accordion).
4.  **Acessibilidade (ARIA):**
    *   Adicionar `role="button"` e `tabIndex={0}` ao cabeçalho (ou envolver o texto em um `<button>`).
    *   Adicionar `aria-expanded={isOpen}` e `aria-controls` apontando para o ID da seção de conteúdo.
    *   Garantir navegação por teclado (Enter/Space para expandir).

Isso garantirá uma experiência fluida, acessível e visualmente consistente com o restante da aplicação.

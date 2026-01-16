Vou corrigir as cores da interface de "Adicionar Transação" para que o modo "Despesa" utilize a cor vermelha (danger) em vez da cor roxa (primary), conforme solicitado.

### **Alterações Planejadas em `pages/AddTransaction.tsx`**

1.  **Botão de Seleção "Despesa":**
    *   Alterar a classe condicional de `bg-primary` para `bg-danger` quando o tipo for despesa.
2.  **Input de Valor:**
    *   Alterar a cor do texto de `text-primary` para `text-danger` quando for despesa.
3.  **Toggles "Pago" e "Recorrente":**
    *   Alterar a cor de fundo ativa de `bg-primary` para `bg-danger` quando for despesa.

Isso garantirá que toda a identidade visual da transação de "Despesa" seja consistentemente vermelha, diferenciando-se claramente da "Receita" (verde) e do tema padrão.

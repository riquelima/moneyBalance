# Plano de Correção: Erro de "Too many re-renders" no Menu de Projeções

Identifiquei a causa raiz do loop infinito que impede a abertura do menu de projeções. O erro ocorre devido a uma chamada de função imediata dentro de um manipulador de evento `onClick`, que dispara atualizações de estado durante a renderização do componente.

## Diagnóstico
No arquivo `pages/ProjecaoFutura.tsx`, linha 625:
- **Problema**: `onClick={handleSaveEdit(category.id)}` executa a função imediatamente toda vez que o componente renderiza.
- **Consequência**: A função atualiza o estado (`setProjectionCategories`), o que força uma nova renderização, executando a função novamente e criando um ciclo infinito.

## Etapas da Correção
1. **Corrigir `pages/ProjecaoFutura.tsx`**:
   - Envolver a chamada `handleSaveEdit` em uma *arrow function* para garantir que ela só seja executada após o clique do usuário.
   - De: `onClick={handleSaveEdit(category.id)}`
   - Para: `onClick={() => handleSaveEdit(category.id)}`

2. **Verificação de Segurança**:
   - Revisei o restante do arquivo e confirmei que outras funções como `handleDeleteCategory` e `handleCategorySelect` já estão implementadas corretamente.

## Testes e Validação
- Após a correção, o menu de projeções abrirá instantaneamente sem erros.
- As funcionalidades de editar e salvar categorias funcionarão conforme esperado.
- A correção é isolada e não afeta outras partes do sistema.
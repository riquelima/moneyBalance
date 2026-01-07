## Objetivo
- Exibir texto tachado (line-through + menor opacidade) nas Entradas marcadas como "Recebido" (usa `is_paid` para incomes), igual ao comportamento já aplicado para Saídas pagas.

## Onde alterar
- `pages/Transactions.tsx`
  - Título/descrição do item: na `span` que hoje aplica `line-through` apenas quando `t.type === 'expense' && t.is_paid` (aprox. `pages/Transactions.tsx:281`).
  - Valor do item: na `span` que também aplica `line-through` apenas para despesas pagas (aprox. `pages/Transactions.tsx:292`).
- (Opcional para consistência visual) `pages/Dashboard.tsx` onde há uso de `line-through` similar (aprox. `482, 484`).

## Implementação
1. Generalizar a condição de estilo para considerar qualquer item com `t.is_paid === true`:
   - Substituir `t.type === 'expense' && t.is_paid ? 'line-through opacity-60' : ''` por `t.is_paid ? 'line-through opacity-60' : ''` nas duas `span` do item.
   - Manter cores/ícones por tipo (`income` → `text-success` + `arrow_downward`; `expense` → `text-danger` + `arrow_upward`).
2. (Opcional) Replicar a mesma regra em `Dashboard.tsx` se lá também renderiza listas de Entradas/Saídas com `line-through` apenas para despesas.

## Verificação
- Rodar o ambiente local e acessar `Transactions`.
- Confirmar que itens de Entradas com `is_paid = true` aparecem com texto e valor tachados.
- Validar que Saídas continuam com tachado quando `is_paid = true` e que itens pendentes (de qualquer tipo) permanecem sem tachado.

## Entrega
- Criar commit único com mensagem clara (ex.: `feat(transactions): aplicar tachado em entradas recebidas`).
- Opcional: commit adicional para `Dashboard` se aplicado.

## Observação
- O label "Recebido" já é tratado em `AddTransaction.tsx`; não há alteração de dados, apenas apresentação visual nas listas. 
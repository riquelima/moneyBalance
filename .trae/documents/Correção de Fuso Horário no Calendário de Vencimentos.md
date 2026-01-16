Vou corrigir o problema de exibição de datas no `CalendarView.tsx`, onde transações aparecem no dia anterior devido ao tratamento incorreto de fuso horário.

**Análise do Problema:**
Atualmente, o código usa `new Date(t.date)` para converter as strings de data vindas do banco. Se a string for apenas "YYYY-MM-DD" (formato padrão de data), o JavaScript interpreta isso como UTC. Para usuários no Brasil (UTC-3), isso resulta em 21h do dia anterior, causando a discrepância visual.

**Plano de Correção:**

1.  **Importar Utilitário Confiável:**
    *   Vou importar a função `parseLocalISODate` do arquivo `../../utils/date` em `components/calendar/CalendarView.tsx`. Essa função já existe no projeto e foi desenhada para criar datas baseadas no horário local, ignorando o deslocamento UTC.

2.  **Substituir Parsing Direto:**
    *   Na função `getDayTransactions`, substituirei `new Date(t.date)` por `parseLocalISODate(t.date)`.
    *   Isso garantirá que a comparação `isSameDay` funcione corretamente, alinhando a data visual do calendário com a data real da transação.

3.  **Refatoração Adicional (Prevenção):**
    *   Revisarei se há outros pontos no componente usando `new Date()` em strings de data e aplicarei a correção.

Essa alteração é segura, isolada no componente de calendário e aproveita a lógica de datas já estabelecida no projeto.

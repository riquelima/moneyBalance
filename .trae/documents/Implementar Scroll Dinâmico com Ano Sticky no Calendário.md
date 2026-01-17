Vou implementar um cabeçalho de ano fixo (sticky) na página do Calendário que aparece dinamicamente ao rolar a página.

**Plano de Implementação:**

1.  **Modificar `CalendarPage.tsx`:**
    *   Adicionar um estado `currentYear` (inicialmente o ano atual).
    *   Criar uma referência (`useRef`) para o elemento container do calendário.
    *   Usar `useEffect` para adicionar um listener de scroll no elemento `div` principal (que tem `overflow-y-auto`).
    *   O listener irá verificar a posição de rolagem (`scrollTop`). Se for maior que um determinado limite (ex: 50px), mostrará um pequeno cabeçalho flutuante com o ano (ex: "2026").
    *   Como alternativa mais moderna e performática (conforme solicitado), usar a **Intersection Observer API** para detectar quando o cabeçalho principal sai da tela e, nesse momento, exibir o mini-cabeçalho do ano.

2.  **Estrutura do Elemento:**
    *   Inserir um `div` fixo (`fixed top-X`) ou `sticky` dentro do container, contendo o ano.
    *   Esse `div` terá estilos condicionais (visível/invisível) baseados no estado do scroll.
    *   Estilização consistente com o design (borda grossa, fonte uppercase, cores do tema).

3.  **Lógica do Ano:**
    *   O ano exibido deve ser sincronizado com o ano que está visível no `CalendarView`. Para simplificar, vou extrair o ano da data atual global ou passar essa informação via callback/contexto se necessário. No entanto, como o `CalendarView` gerencia seu próprio estado de data, o ideal é que ele comunique a mudança de ano para o pai (`CalendarPage`), ou mover o estado de data para o pai.
    *   *Refinamento:* Para atender rapidamente sem refatorar tudo, vou assumir o ano atual do sistema inicialmente, mas o ideal seria levantar o estado `currentDate` do `CalendarView` para `CalendarPage`. **Vou optar por levantar o estado**, pois é a forma correta de garantir que o título da página ("AGENDA") e o novo indicador de ano reflitam o mês/ano que o usuário está navegando no calendário.

**Refatoração Necessária:**
*   Mover `currentDate` e `setCurrentDate` de `CalendarView` para `CalendarPage`.
*   Passar `currentDate` e `setCurrentDate` como props para `CalendarView`.

Isso atenderá perfeitamente aos requisitos de scroll dinâmico e consistência de dados.
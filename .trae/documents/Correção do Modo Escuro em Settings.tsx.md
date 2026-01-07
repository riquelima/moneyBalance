## Objetivo

Corrigir a implementação do modo escuro (dark mode) no aplicativo, garantindo que a classe `dark` seja aplicada corretamente ao elemento `html` e que as variáveis CSS ou classes Tailwind respondam à mudança.

## Análise do Problema

1.  **Tailwind Configuration:** O arquivo `tailwind.config` está definido com `darkMode: "class"`, o que está correto.
2.  **HTML Root:** Os arquivos HTML (`index.html`, `code.html`, etc.) já possuem a classe `dark` hardcoded ou lógica para tal.
3.  **Lógica de Toggle:** O componente `Settings.tsx` alterna a classe `dark` no `document.documentElement` (que é o `<html>`), mas pode haver conflitos com outras definições ou falta de estilos `dark:` específicos nos componentes.
4.  **Estilos:** O `index.css` ou as definições inline do Tailwind precisam garantir que as cores de fundo e texto mudem quando a classe `dark` estiver presente. Atualmente, `Settings.tsx` força `bg-background-light` no container principal, o que pode estar sobrescrevendo a preferência global ou não tendo uma variante `dark:` correspondente eficaz.

## Plano de Correção

1.  **Atualizar `Settings.tsx`:**
    *   Verificar se o container principal (`motion.div`) possui as classes `dark:bg-background-dark dark:text-white` (ou equivalente da paleta) para reagir à classe pai.
    *   O código atual define `bg-background-light` fixo no container. Precisa ser `bg-background-light dark:bg-background-dark`.
2.  **Verificar Definições de Cor:**
    *   Garantir que `background-dark` e `background-light` estejam definidos corretamente no `tailwind.config` (via script no HTML ou arquivo de config).
    *   Pelos snippets, `background-dark` é `#102216` (verde muito escuro) ou `#0A0A0A` (preto) dependendo do arquivo. Vamos padronizar para a paleta Neo-Brutalista (provavelmente `#0A0A0A` ou similar).
3.  **Aplicar Classes Dark Mode:**
    *   Adicionar prefixo `dark:` em elementos chave que devem mudar de cor (cards, textos, bordas).
    *   Exemplo: `bg-white dark:bg-black`, `text-dark dark:text-white`, `border-dark dark:border-white` (ou manter borda preta se o fundo for colorido, mas adaptando para contraste).

## Ações Específicas

1.  **Editar `pages/Settings.tsx`:**
    *   Alterar `<motion.div className="...">` para incluir `dark:bg-background-dark dark:text-white`.
    *   Atualizar os componentes `SettingItem` e `SectionHeader` para terem estilos compatíveis com o modo escuro (ex: `dark:bg-black dark:border-white` se necessário, ou manter o estilo Neo-Brutalista com cores adaptadas).
2.  **Validação:**
    *   Testar o toggle.
    *   Verificar se o fundo muda de cor.
    *   Verificar se o texto permanece legível.

## Observação Neo-Brutalista em Dark Mode

No Neo-Brutalismo, o "Dark Mode" muitas vezes inverte totalmente: fundo preto, bordas brancas (ou cores vibrantes), texto branco. Vamos garantir que essa inversão ocorra.

**Passo Único:** Atualizar `Settings.tsx` para incluir as classes `dark:` necessárias.


## Objetivo
Redesenhar a página de Relatórios (`pages/Reports.tsx`) seguindo estritamente a estética Neo-Brutalista já aplicada no restante do app, focando especialmente nos gráficos e estatísticas.

## Mudanças Visuais (Neo-Brutalism)
- **Gráficos (Pie e Line):**
  - Remover gradientes suaves e transparências excessivas.
  - Usar cores sólidas e contrastantes (`#8854D0`, `#20BF55`, `#FF6B6B`, `#FFE66D`).
  - Adicionar bordas grossas (`strokeWidth="3"` ou `stroke="black"`) nos elementos SVG (fatias da pizza, linhas).
  - Tipografia dos rótulos em caixa alta, negrito e preto (dentro ou fora do gráfico).
- **Cards de Estatísticas:**
  - Fundo branco (`bg-white`) com bordas pretas grossas (`border-2 border-dark`).
  - Sombra dura deslocada (`shadow-neo`).
  - Tipografia pesada para valores e títulos.
- **Lista de Categorias:**
  - Blocos separados com bordas, em vez de lista contínua.
  - Indicadores de cor quadrados com borda preta.
- **Barras de Orçamento:**
  - Container com borda grossa.
  - Barra de progresso com cor sólida e borda interna/externa, sem arredondamento suave.

## Arquivos Alvo
- `pages/Reports.tsx`: Redesenho completo dos componentes visuais (seções, gráficos SVG, listas).

## Etapas de Implementação
1. **Atualizar Container Principal:** Fundo `bg-background-dark`, cabeçalho com borda inferior grossa.
2. **Redesenhar Seletor de Data:** Botões quadrados/retangulares com bordas pretas e sombras duras.
3. **Refatorar Gráfico de Pizza (`Pie` component interno):**
   - Adicionar `stroke="#000" strokeWidth="2"` nos caminhos `path`.
   - Ajustar cores para usar a paleta Neo-Brutalista (`primary`, `secondary`, `accent`, `danger`).
   - Rótulos de porcentagem com fundo branco ou contorno para legibilidade.
4. **Refatorar Gráfico de Linha (Projeção):**
   - Linha grossa sem suavização excessiva.
   - Pontos de dados marcados com quadrados ou círculos com borda preta.
   - Área preenchida com cor sólida ou hachurada, sem gradiente suave.
5. **Atualizar Listas de Categorias e Orçamentos:** Estilo de cartões individuais com sombra `shadow-neo-sm`.

## Verificação
- Acessar a rota `/reports`.
- Verificar se os gráficos possuem o visual "cartoon/sketch" típico do Neo-Brutalism (bordas pretas).
- Confirmar contraste e legibilidade dos textos.
- Garantir responsividade (scroll horizontal nos cards de estatísticas). 
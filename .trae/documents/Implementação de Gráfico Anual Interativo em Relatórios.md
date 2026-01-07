# Plano de Atualização do Gráfico de Projeção em Relatórios

Vou atualizar o gráfico de projeção na tela de Relatórios para exibir uma visão anual completa (Janeiro a Dezembro) e adicionar interatividade avançada (tooltips).

## 1. Atualização de Dados (Lógica)
- **Buscar dados anuais**: No `useEffect` de carregamento em `pages/Reports.tsx`, adicionarei uma consulta ao Supabase para buscar todas as transações do ano selecionado (`selectedYear`).
- **Processar dados**:
  - Agrupar as transações por mês (0 a 11).
  - Calcular o saldo líquido (Entradas - Saídas) para cada mês.
  - Criar um array de 12 posições.
  - Para meses passados ou iguais ao mês selecionado: usar o valor real.
  - Para meses futuros em relação ao mês selecionado: projetar o valor usando a taxa de crescimento (`percent`) calculada com base no mês selecionado.

## 2. Atualização da Interface (Gráfico)
- **Eixo X**: Exibir os 12 meses (Jan - Dez) em vez de apenas 3.
- **Renderização SVG**:
  - Ajustar a função `makeLinePath` e o mapeamento dos pontos para distribuir 12 pontos uniformemente na largura do gráfico.
  - Diferenciar visualmente (se necessário) ou apenas manter a linha contínua.

## 3. Interatividade (Tooltips e Feedback)
- **Novo Estado**: Adicionar estados para controlar o tooltip (`hoveredPoint`, `clickedPoint`).
- **Componente Tooltip**: Criar um elemento flutuante (dentro do SVG ou como div absoluta) que exibe:
  - Mês e Valor formatado.
  - Indicador se é "Real" ou "Projeção".
- **Eventos**:
  - `onMouseEnter`: Exibir tooltip e destacar o ponto (aumentar raio/bordas).
  - `onMouseLeave`: Esconder tooltip (se não houver clique persistente).
  - `onClick`: Fixar o tooltip no ponto selecionado.
- **Labels (p tags)**: Adicionar os mesmos eventos aos rótulos dos meses abaixo do gráfico para sincronizar com os pontos.

## 4. Estilo e Responsividade
- Garantir que o tooltip não estoure a tela em dispositivos móveis.
- Adicionar transições suaves (`transition-all`) para os efeitos de hover.

Essa abordagem atende a todos os requisitos: visualização anual completa, dados precisos (reais + projeção), e interatividade rica.
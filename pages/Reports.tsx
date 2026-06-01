import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const getCategoryIconUrl = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('mercado') || n.includes('feira') || n.includes('cesta')) return 'https://cdn-icons-png.flaticon.com/512/2203/2203239.png';
  if (n.includes('refeição') || n.includes('alimentação') || n.includes('comer') || n.includes('restaurante') || n.includes('cafe') || n.includes('café') || n.includes('padaria')) return 'https://cdn-icons-png.flaticon.com/512/2424/2424721.png';
  if (n.includes('transporte') || n.includes('ônibus') || n.includes('bus') || n.includes('carro') || n.includes('uber') || n.includes('gasolina') || n.includes('combustível')) return 'https://cdn-icons-png.flaticon.com/512/741/741407.png';
  if (n.includes('aluguel') || n.includes('moradia') || n.includes('casa') || n.includes('apartamento') || n.includes('condomínio')) return 'https://cdn-icons-png.flaticon.com/512/619/619153.png';
  if (n.includes('lazer') || n.includes('social') || n.includes('cinema') || n.includes('filme') || n.includes('pipoca') || n.includes('show') || n.includes('festa') || n.includes('viagem')) return 'https://cdn-icons-png.flaticon.com/512/3588/3588658.png';
  if (n.includes('saúde') || n.includes('médico') || n.includes('remédio') || n.includes('farmácia') || n.includes('hospital') || n.includes('academia') || n.includes('crossfit') || n.includes('dentista')) return 'https://cdn-icons-png.flaticon.com/512/1142/1142172.png';
  if (n.includes('compras') || n.includes('shopping') || n.includes('loja') || n.includes('vestuário') || n.includes('roupa')) return 'https://cdn-icons-png.flaticon.com/512/743/743007.png';
  
  if (n.includes('salário') || n.includes('pagamento') || n.includes('renda')) return 'https://cdn-icons-png.flaticon.com/512/2454/2454269.png';
  if (n.includes('invest') || n.includes('economia') || n.includes('poupança')) return 'https://cdn-icons-png.flaticon.com/512/2721/2721614.png';
  
  return 'https://cdn-icons-png.flaticon.com/512/5488/5488583.png';
};

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [statTab, setStatTab] = useState<'expense' | 'income'>('expense');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  // Totais reativos para o mês ativo (M) e os dois anteriores (M-1, M-2)
  const [monthTotal, setMonthTotal] = useState(0); // Despesa M
  const [incomeTotal, setIncomeTotal] = useState(0); // Receita M
  
  const [prevMonthTotal, setPrevMonthTotal] = useState(0); // Despesa M-1
  const [prevIncomeTotal, setPrevIncomeTotal] = useState(0); // Receita M-1

  const [prev2MonthTotal, setPrev2MonthTotal] = useState(0); // Despesa M-2
  const [prev2IncomeTotal, setPrev2IncomeTotal] = useState(0); // Receita M-2

  // Listagem de despesas e receitas mensais do ano inteiro (Jan a Dez) para os gráficos roláveis
  const [annualExpenses, setAnnualExpenses] = useState<number[]>(Array(12).fill(0));
  const [annualIncomes, setAnnualIncomes] = useState<number[]>(Array(12).fill(0));

  // Listagem reativa de categorias de Despesas e Receitas (Mês M)
  const [categories, setCategories] = useState<Array<{ name: string; amount: number; emoji: string }>>([]);
  const [incomeCategories, setIncomeCategories] = useState<Array<{ name: string; amount: number; emoji: string }>>([]);

  const barScrollRef = useRef<HTMLDivElement>(null);

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthFullNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatCompactBRL = (v: number) => {
    if (v === 0) return 'R$ 0';
    if (v >= 1000) {
      return `R$ ${(v / 1000).toFixed(1).replace('.0', '')}k`;
    }
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // 1. Carregamento de dados históricos reativos em uma única query otimizada
  const loadReportsData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    // Intervalo de datas: o ano inteiro (Janeiro a Dezembro do ano selecionado) para cobrir todos os gráficos anuais
    // Buscamos também M-2 do ano anterior caso o mês selecionado seja Jan ou Fev (cross-year)
    const crossYearStart = new Date(selectedYear, selectedMonth - 2, 1);
    const startQueryDate = crossYearStart.getFullYear() < selectedYear
      ? crossYearStart
      : new Date(selectedYear, 0, 1); // Sempre começa em Janeiro do ano selecionado
    const endQueryDate = new Date(selectedYear, 11, 31);

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    // Buscar ID da categoria "Ajuste de Saldo" para exclusão nas receitas
    let adjId: string | null = null;
    try {
      const { data: adjCat } = await supabase
        .from('user_categories')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', 'Ajuste de Saldo')
        .maybeSingle();
      if (adjCat) adjId = adjCat.id;
    } catch (e) { /* ignore */ }

    // Consulta única reativa
    const txQuery = supabase
      .from('user_transactions')
      .select('id, amount, type, date, category_id, is_paid, description')
      .eq('user_id', user.id)
      .gte('date', fmt(startQueryDate))
      .lte('date', fmt(endQueryDate));

    const { data: txs, error } = signal ? await txQuery.abortSignal(signal) : await txQuery;

    if (error) {
      const isAbort = error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('AbortError');
      if (isAbort) return;
      console.error('Erro ao buscar transações:', error);
      setLoading(false);
      return;
    }

    const txsList = txs || [];

    // Lógica para soma de meses históricos cruzando anos
    const getExpenseSumForMonth = (y: number, m: number) => {
      return txsList.filter(t => {
        if (t.type !== 'expense') return false;
        const parts = t.date.split('-');
        return parseInt(parts[0], 10) === y && parseInt(parts[1], 10) === (m + 1);
      }).reduce((acc, t) => acc + Number(t.amount || 0), 0);
    };

    const getIncomeSumForMonth = (y: number, m: number) => {
      return txsList.filter(t => {
        if (t.type !== 'income') return false;
        if (t.category_id === adjId || t.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558') return false;
        const parts = t.date.split('-');
        return parseInt(parts[0], 10) === y && parseInt(parts[1], 10) === (m + 1);
      }).reduce((acc, t) => acc + Number(t.amount || 0), 0);
    };

    // Mês M (Ativo selecionado)
    const curExp = getExpenseSumForMonth(selectedYear, selectedMonth);
    const curInc = getIncomeSumForMonth(selectedYear, selectedMonth);
    setMonthTotal(curExp);
    setIncomeTotal(curInc);

    // Mês M-1
    const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
    setPrevMonthTotal(getExpenseSumForMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth()));
    setPrevIncomeTotal(getIncomeSumForMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth()));

    // Mês M-2
    const prev2MonthDate = new Date(selectedYear, selectedMonth - 2, 1);
    setPrev2MonthTotal(getExpenseSumForMonth(prev2MonthDate.getFullYear(), prev2MonthDate.getMonth()));
    setPrev2IncomeTotal(getIncomeSumForMonth(prev2MonthDate.getFullYear(), prev2MonthDate.getMonth()));

    // Calcular os 12 meses de despesas do ano selecionado para os gráficos
    const annualExp = Array(12).fill(0);
    const annualInc = Array(12).fill(0);
    
    txsList.forEach(t => {
      const parts = t.date.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      
      if (y === selectedYear && m >= 0 && m <= 11) {
        if (t.type === 'expense') {
          annualExp[m] += Number(t.amount || 0);
        } else if (t.type === 'income') {
          if (t.category_id === adjId || t.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558') return;
          annualInc[m] += Number(t.amount || 0);
        }
      }
    });
    
    setAnnualExpenses(annualExp);
    setAnnualIncomes(annualInc);

    // Filtragem de Categorias de Despesas do mês M
    const expCur = txsList.filter(t => {
      if (t.type !== 'expense') return false;
      const parts = t.date.split('-');
      return parseInt(parts[0], 10) === selectedYear && parseInt(parts[1], 10) === (selectedMonth + 1);
    });

    const expMap = new Map<string, number>();
    expCur.forEach(t => {
      const catId = t.category_id || 'none';
      expMap.set(catId, (expMap.get(catId) || 0) + Number(t.amount || 0));
    });

    // Filtragem de Categorias de Receitas do mês M
    const incCur = txsList.filter(t => {
      if (t.type !== 'income') return false;
      if (t.category_id === adjId || t.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558') return false;
      const parts = t.date.split('-');
      return parseInt(parts[0], 10) === selectedYear && parseInt(parts[1], 10) === (selectedMonth + 1);
    });

    const incMap = new Map<string, number>();
    incCur.forEach(t => {
      const catId = t.category_id || 'none';
      incMap.set(catId, (incMap.get(catId) || 0) + Number(t.amount || 0));
    });

    // Buscar nomes reais de categorias no Supabase
    const allCatIds = Array.from(new Set([...expMap.keys(), ...incMap.keys()])).filter(id => id !== 'none');
    let catsById: Record<string, string> = {};
    if (allCatIds.length) {
      const { data: catsData } = await supabase
        .from('user_categories')
        .select('id, name')
        .in('id', allCatIds);
      (catsData || []).forEach(c => {
        catsById[c.id] = c.name;
      });
    }

    const getEmoji = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('mercado') || n.includes('feira') || n.includes('compras de casa')) return '🧺';
      if (n.includes('refeição') || n.includes('restaurante') || n.includes('alimentação') || n.includes('comida') || n.includes('jantar')) return '🍽️';
      if (n.includes('transporte') || n.includes('uber') || n.includes('ônibus') || n.includes('combustível') || n.includes('carro')) return '🚌';
      if (n.includes('aluguel') || n.includes('moradia') || n.includes('casa') || n.includes('condomínio')) return '🏠';
      if (n.includes('lazer') || n.includes('cinema') || n.includes('viagem') || n.includes('show') || n.includes('festa')) return '🍿';
      if (n.includes('saúde') || n.includes('médico') || n.includes('farmácia') || n.includes('remédio') || n.includes('dentista')) return '🧰';
      if (n.includes('compras') || n.includes('vestuário') || n.includes('roupa') || n.includes('shopping')) return '🛍️';
      if (n.includes('salário') || n.includes('pagamento') || n.includes('receita') || n.includes('trabalho')) return '💼';
      if (n.includes('educação') || n.includes('curso') || n.includes('escola') || n.includes('livro')) return '📚';
      if (n.includes('assinatura') || n.includes('netflix') || n.includes('spotify') || n.includes('premium')) return '🎟️';
      return '🛒';
    };

    const buildCategoryList = (map: Map<string, number>) => {
      return Array.from(map.entries()).map(([id, amt]) => {
        const name = id === 'none' ? 'Sem Categoria' : (catsById[id] || 'Categoria');
        return {
          name,
          amount: amt,
          emoji: getEmoji(name)
        };
      }).sort((a, b) => b.amount - a.amount);
    };

    setCategories(buildCategoryList(expMap));
    setIncomeCategories(buildCategoryList(incMap));

    setLoading(false);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const ac = new AbortController();
    loadReportsData(ac.signal).catch(() => {});
    return () => ac.abort();
  }, [loadReportsData]);

  useEffect(() => {
    const channel = supabase
      .channel('reports_annual_roll_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_transactions' }, () => {
        loadReportsData().catch(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReportsData]);

  // Quantidade de dias do mês selecionado
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // 2. Gráfico de Barras Rolável Horizontalmente com os 12 meses (Emparelhado Despesa / Receita)
  const barChartData = useMemo(() => {
    const maxVal = Math.max(...annualExpenses, ...annualIncomes, 1);

    // Calcular as barras de Despesa e Receita para cada um dos 12 meses
    const monthsData = monthNames.map((m, idx) => {
      const expense = annualExpenses[idx];
      const income = annualIncomes[idx];
      return {
        label: m,
        expense,
        income,
        expHeight: (expense / maxVal) * 118,
        incHeight: (income / maxVal) * 118
      };
    });

    return { monthsData, maxVal };
  }, [annualExpenses, annualIncomes]);

  // Scroll automático para centralizar o mês selecionado no gráfico de barras rolável
  useEffect(() => {
    const timer = setTimeout(() => {
      if (barScrollRef.current) {
        const el = barScrollRef.current;
        // Centralizar o mês ativo: cada coluna ocupa 56px, com padding inicial de 30px
        const targetX = 30 + selectedMonth * 56 - (el.clientWidth / 2) + 28;
        el.scrollLeft = Math.max(0, targetX);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedMonth, selectedYear, activeTab]);

  // 3. Gráfico de Linha de Tendência de Gastos Mensais (Valores e Meses do Ano Reais)
  const lineChartData = useMemo(() => {
    const maxVal = Math.max(...annualExpenses, 1);

    const points = annualExpenses.map((val, idx) => {
      const x = (idx / 11) * 280;
      const ratio = val / maxVal;
      const y = 148 - ratio * 100; // Mantém a linha entre y=48 e y=148
      return { x, y, month: idx, val };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    let peakPoint = points[0];
    points.forEach(p => {
      if (p.val > peakPoint.val) {
        peakPoint = p;
      }
    });

    if (peakPoint.val === 0 && points.length > 0) {
      peakPoint = points[selectedMonth];
    }

    return { points, linePath, peakPoint, maxVal };
  }, [annualExpenses, selectedMonth]);

  // 4. Donut Chart (Gráfico de Rosca) Dinâmico & Posicionamento Geométrico de Emojis
  const donutChartData = useMemo(() => {
    const list = statTab === 'expense' ? categories : incomeCategories;
    const totalAmt = list.reduce((acc, c) => acc + c.amount, 0);

    const C = 2 * Math.PI * 85; // Circunferência total para r=85
    let accumulatedPercent = 0;

    const colorsPalette = [
      '#f06a5d', // Coral Red
      '#f7b3a8', // Light Salmon
      '#fcd5e0', // Light Pink
      '#8e7ce0', // Purple
      '#f06fb5', // Magenta Pink
      '#f78fc6', // Bright Pink
      '#f2913a', // Orange
      '#3b5bdb', // Blue
      '#2b8a3e', // Green
      '#f59f00', // Yellow
    ];

    const segments = list.map((c, i) => {
      const pct = totalAmt > 0 ? (c.amount / totalAmt) : 0;
      const amplitude = pct * C;
      const offset = -accumulatedPercent * C;

      const midAngle = (accumulatedPercent + pct / 2) * 2 * Math.PI - Math.PI / 2;
      const x = 120 + Math.cos(midAngle) * 85;
      const y = 120 + Math.sin(midAngle) * 85;

      accumulatedPercent += pct;

      const pctInt = Math.round(pct * 100);

      return {
        ...c,
        pct: pctInt,
        strokeDashArray: `${amplitude.toFixed(2)} ${C.toFixed(2)}`,
        strokeDashOffset: offset.toFixed(2),
        color: colorsPalette[i % colorsPalette.length],
        emojiX: x,
        emojiY: y
      };
    });

    return { segments, totalAmt };
  }, [statTab, categories, incomeCategories]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

        .phone, .phone * {
          font-family: 'Poppins', sans-serif !important;
        }

        .phone {
          position: relative;
          width: min(100vw, 393px);
          margin-inline: auto;
          min-height: 100vh;
          overflow-x: hidden;
          background: #eef0f7;
          display: flex;
          flex-direction: column;
        }

        .reports-sticky-top {
          position: sticky;
          top: 0;
          z-index: 40;
          background: #eef0f7;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .reports-header {
          background: #eef0f7;
          padding: 0 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60px;
          box-sizing: border-box;
        }
        .header-title { font-size: 17px; font-weight: 600; color: #111; }
        .header-sub {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          font-weight: 400;
          color: #555;
          margin-top: 2px;
          cursor: pointer;
        }
        .header-sub:active { opacity: 0.7; }
        .header-sub svg { width: 12px; height: 12px; }

        /* ── Tabs ── */
        .tabs {
          display: flex;
          padding: 10px 20px 0;
          background: #eef0f7;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          border: none;
          border-bottom: 2.5px solid transparent;
          background: transparent;
          flex: 1;
          justify-content: center;
          transition: color 0.2s, border-bottom-color 0.2s, font-weight 0.2s;
          outline: none !important;
          box-shadow: none !important;
          opacity: 1 !important;
          -webkit-tap-highlight-color: transparent;
        }
        .tab.active {
          color: #3b5bdb;
          border-bottom-color: #3b5bdb;
          font-weight: 600;
        }
        .tab svg { width: 16px; height: 16px; stroke: currentColor; opacity: 1; }

        /* ── Scroll Content ── */
        .content-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 14px 14px 140px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .content-scroll::-webkit-scrollbar { display: none; }

        /* ── Cards Despesa / Receita ── */
        .cards-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .card {
          background: #fff;
          border-radius: 18px;
          padding: 14px;
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .card-dots {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 18px;
          color: #bbb;
          letter-spacing: 1px;
          line-height: 0.6;
          cursor: pointer;
        }
        .card-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 10px;
        }
        .card-icon.expense { background: #f8d7d7; }
        .card-icon.income  { background: #d4f0e0; }
        .card-type { font-size: 13px; font-weight: 500; color: #888; margin-bottom: 4px; }
        .card-amount { font-size: 20px; font-weight: 600; }
        .card-amount.expense { color: #e03131; }
        .card-amount.income  { color: #2e9e44; }

        /* ── Chart Card ── */
        .chart-card {
          background: #fff;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .chart-title { font-size: 15px; font-weight: 600; color: #1a2366; margin-bottom: 16px; }

        /* Bar Chart */
        .bar-area {
          display: flex;
          align-items: stretch;
          height: 170px;
        }
        .bar-y-axis {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-bottom: 24px;
          margin-right: 6px;
          flex-shrink: 0;
        }
        .bar-y-label {
          font-size: 10px;
          font-weight: 400;
          color: #c0c4d6;
          text-align: right;
          line-height: 1;
        }
        .bar-svg-wrap { flex: 1; overflow: hidden; }

        .chart-legend {
          display: flex;
          gap: 16px;
          padding-top: 10px;
          padding-left: 54px;
        }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #555; }
        .legend-dot { width: 12px; height: 12px; border-radius: 3px; }

        /* Line Chart */
        .line-y-label { font-size: 9px; font-weight: 500; color: #c0c4d6; text-align: right; white-space: nowrap; }

        /* Tooltip */
        .tooltip-box {
          position: absolute;
          background: #1a2366;
          color: #fff;
          border-radius: 10px;
          padding: 5px 12px;
          text-align: center;
          pointer-events: none;
          white-space: nowrap;
          transform: translate(-50%, -100%);
        }
        .tooltip-date { font-size: 10px; font-weight: 500; opacity: 0.75; }
        .tooltip-val  { font-size: 14px; font-weight: 600; }
        .tooltip-arrow {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #1a2366;
        }

        .panel {
          background: #fff;
          border-radius: 22px;
          padding: 18px 16px 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }

        /* Toggle Despesa / Receita */
        .toggle-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }
        .toggle {
          background: #eef0f7;
          border-radius: 14px;
          padding: 4px;
          display: flex;
          gap: 2px;
        }
        .toggle-btn {
          padding: 8px 26px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          background: transparent;
          color: #999;
          transition: all 0.2s;
        }
        .toggle-btn.active {
          background: #fff;
          color: #111;
          box-shadow: 0 2px 6px rgba(0,0,0,0.10);
        }

        /* Donut chart */
        .donut-wrap {
          position: relative;
          width: 240px;
          height: 240px;
          margin: 6px auto 16px;
        }
        .donut-icon {
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid #eee;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          transform: translate(-50%, -50%);
        }

        /* List */
        .cat-row {
          display: flex;
          align-items: center;
          padding: 13px 4px;
          border-bottom: 1px solid #f2f3f8;
        }
        .cat-row:last-child { border-bottom: none; }
        .cat-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #f6f7fb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          margin-right: 12px;
          flex-shrink: 0;
          border: 1px solid #f0f1f7;
        }
        .cat-pct { font-size: 15px; font-weight: 600; color: #111; margin-right: 6px; }
        .cat-name { font-size: 14px; font-weight: 400; color: #8a8fa3; flex: 1; }
        .cat-value { font-size: 15px; font-weight: 600; color: #111; }

        .blur-privacy {
          filter: blur(8px);
          opacity: 0.6;
          user-select: none;
          pointer-events: none;
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .dark .phone {
          background: #0c0c0e;
        }
        .dark .reports-sticky-top {
          background: #0c0c0e;
        }
        .dark .reports-header {
          background: #0c0c0e;
        }
        .dark .header-title {
          color: #ffffff;
        }
        .dark .header-sub {
          color: #aaaaaa;
        }
        .dark .tabs {
          background: #0c0c0e;
          border-bottom-color: rgba(255,255,255,0.06);
        }
        .dark .tab {
          color: #888888;
        }
        .dark .tab.active {
          color: #8854D0;
          border-bottom-color: #8854D0;
        }
        .dark .card {
          background: #1c1c1e;
        }
        .dark .card-icon.expense {
          background: rgba(255,107,107,0.15);
        }
        .dark .card-icon.income {
          background: rgba(32,191,85,0.15);
        }
        .dark .card-type {
          color: #888888;
        }
        .dark .chart-card {
          background: #1c1c1e;
        }
        .dark .chart-title {
          color: #ffffff;
        }
        .dark .panel {
          background: #1c1c1e;
        }
        .dark .toggle {
          background: #1c1c1e;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .dark .toggle-btn {
          color: #888888;
        }
        .dark .toggle-btn.active {
          background: rgba(255,255,255,0.1);
          color: #ffffff;
        }
        .dark .cat-row {
          border-bottom-color: rgba(255,255,255,0.05);
        }
        .dark .cat-icon {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.05);
        }
        .dark .cat-pct {
          color: #ffffff;
        }
        .dark .cat-name {
          color: #888888;
        }
        .dark .cat-value {
          color: #ffffff;
        }
      `}} />

      <main className="phone">
        <div className="reports-sticky-top">
          {/* Cabeçalho */}
          <header className="reports-header">
            <div className="header-title">Análises</div>
            <div className="header-sub" onClick={() => setShowMonthPicker(true)}>
              {monthFullNames[selectedMonth]} {selectedYear}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </header>

          {/* Abas */}
          <nav className="tabs" aria-label="Navegação da análise">
            <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Visão Geral
            </button>
            <button className={`tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
              Detalhamento
            </button>
          </nav>
        </div>

        {/* Conteúdo Rolável */}
        <div className="content-scroll">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-3"
              >
                {/* Cards Despesa / Receita */}
                <div className="cards-row">
                  <article className="card cursor-pointer" onClick={() => { setActiveTab('details'); setStatTab('expense'); }}>
                    <div className="card-dots">···</div>
                    <div className="card-icon expense" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="https://cdn-icons-png.flaticon.com/512/2454/2454282.png" alt="Despesa" className="w-6 h-6 object-contain" />
                    </div>
                    <div className="card-type">Despesa</div>
                    <div className="card-amount expense">{fmtBRL(monthTotal)}</div>
                  </article>
                  <article className="card cursor-pointer" onClick={() => { setActiveTab('details'); setStatTab('income'); }}>
                    <div className="card-dots">···</div>
                    <div className="card-icon income" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="https://cdn-icons-png.flaticon.com/512/2454/2454269.png" alt="Receita" className="w-6 h-6 object-contain" />
                    </div>
                    <div className="card-type">Receita</div>
                    <div className="card-amount income">{fmtBRL(incomeTotal)}</div>
                  </article>
                </div>

                {/* Gráfico de Barras ROLÁVEL (12 Meses com Entradas e Saídas Reais) */}
                <div className="chart-card">
                  <h3 className="chart-title">Últimos meses</h3>
                  <div className="bar-area">
                    {/* Eixo Y Fixo com Valores Reais Proporcionais */}
                    <div className="bar-y-axis" aria-hidden="true" style={{ minWidth: '46px' }}>
                      <span className="bar-y-label">{formatCompactBRL(barChartData.maxVal)}</span>
                      <span className="bar-y-label">{formatCompactBRL(barChartData.maxVal * 0.75)}</span>
                      <span className="bar-y-label">{formatCompactBRL(barChartData.maxVal * 0.50)}</span>
                      <span className="bar-y-label">{formatCompactBRL(barChartData.maxVal * 0.25)}</span>
                      <span className="bar-y-label">R$ 0</span>
                    </div>
                    {/* Div de Scroll Horizontal de Alta Performance e Toque Natural */}
                    <div 
                      ref={barScrollRef}
                      className="bar-svg-wrap overflow-x-auto no-scrollbar flex cursor-grab active:cursor-grabbing scroll-smooth"
                    >
                      <svg viewBox="0 0 732 156" width="732px" height="156px" className="overflow-visible flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff8fa3"/>
                            <stop offset="100%" stopColor="#ffc9d4"/>
                          </linearGradient>
                          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#63e6a0"/>
                            <stop offset="100%" stopColor="#b3f0d0"/>
                          </linearGradient>
                        </defs>
                        {/* Linhas de grade horizontais sintonizadas e roláveis */}
                        <line x1="0" y1="0"   x2="732" y2="0"   stroke="#f0f1f7" strokeWidth="1"/>
                        <line x1="0" y1="32"  x2="732" y2="32"  stroke="#f0f1f7" strokeWidth="1"/>
                        <line x1="0" y1="64"  x2="732" y2="64"  stroke="#f0f1f7" strokeWidth="1"/>
                        <line x1="0" y1="96"  x2="732" y2="96"  stroke="#f0f1f7" strokeWidth="1"/>
                        <line x1="0" y1="128" x2="732" y2="128" stroke="#f0f1f7" strokeWidth="1"/>

                        {/* Desenho das Barras e Rótulos para cada um dos 12 Meses */}
                        {barChartData.monthsData.map((m, idx) => {
                          const monthX = 30 + idx * 56;
                          return (
                            <g key={m.label} className="cursor-pointer" onClick={() => setSelectedMonth(idx)}>
                              {/* Barra Despesa */}
                              <rect 
                                x={monthX} 
                                y={128 - m.expHeight} 
                                width="16" 
                                height={m.expHeight} 
                                rx="5" 
                                fill="url(#gExp)"
                                className="transition-all duration-300"
                              />
                              {/* Barra Receita */}
                              <rect 
                                x={monthX + 20} 
                                y={128 - m.incHeight} 
                                width="16" 
                                height={m.incHeight} 
                                rx="5" 
                                fill="url(#gInc)"
                                className="transition-all duration-300"
                              />
                              {/* Rótulo de Sigla do Mês */}
                              <text 
                                x={monthX + 18} 
                                y={146} 
                                textAnchor="middle"
                                fontSize="9.5"
                                fontWeight={idx === selectedMonth ? '800' : '600'}
                                fill={idx === selectedMonth ? '#3b5bdb' : '#c0c4d6'}
                                style={{ fontFamily: 'Poppins, sans-serif', textTransform: 'uppercase', userSelect: 'none' }}
                              >
                                {m.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: 'linear-gradient(to bottom, #ff8fa3, #ffc9d4)' }}></div> Despesa
                    </div>
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: 'linear-gradient(to bottom, #63e6a0, #b3f0d0)' }}></div> Receita
                    </div>
                  </div>
                </div>

                {/* Gráfico de Linha de Tendência */}
                <div className="chart-card">
                  <h3 className="chart-title">Tendência de Gastos Mensais</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    {/* Eixo Y Reativo com Valores Reais */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, paddingBottom: '2px', minWidth: '46px' }} aria-hidden="true">
                      <span className="line-y-label">{formatCompactBRL(lineChartData.maxVal)}</span>
                      <span className="line-y-label">{formatCompactBRL(lineChartData.maxVal * 0.75)}</span>
                      <span className="line-y-label">{formatCompactBRL(lineChartData.maxVal * 0.50)}</span>
                      <span className="line-y-label">{formatCompactBRL(lineChartData.maxVal * 0.25)}</span>
                      <span className="line-y-label">R$ 0</span>
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      {/* Tooltip Dinâmico seguindo o mês selecionado */}
                      {(() => {
                        const activePoint = lineChartData.points[selectedMonth];
                        if (!activePoint) return null;
                        return (
                          <div
                            className="tooltip-box"
                            style={{
                              top: `${activePoint.y}px`,
                              left: `${(activePoint.x / 280) * 100}%`
                            }}
                          >
                            <div className="tooltip-date">{monthFullNames[activePoint.month]} {selectedYear}</div>
                            <div className="tooltip-val">{fmtBRL(activePoint.val)}</div>
                            <div className="tooltip-arrow"></div>
                          </div>
                        );
                      })()}

                      <svg viewBox="0 0 280 160" width="100%" height="160" xmlns="http://www.w3.org/2000/svg">
                        {/* Linhas de grade */}
                        <line x1="0" y1="0"   x2="280" y2="0"   stroke="#f0f1f7" strokeWidth="1"/>
                        <line x1="0" y1="40"  x2="280" y2="40"  stroke="#f0f1f7" strokeWidth="1"/>
                        <line x1="0" y1="80"  x2="280" y2="80"  stroke="#f0f1f7" strokeWidth="1"/>
                        <line x1="0" y1="120" x2="280" y2="120" stroke="#f0f1f7" strokeWidth="1"/>
                        <line x1="0" y1="160" x2="280" y2="160" stroke="#f0f1f7" strokeWidth="1"/>

                        {/* Linha tracejada dinamicamente calculada */}
                        {lineChartData.points.length > 0 && (
                          <path
                            d={lineChartData.linePath}
                            fill="none"
                            stroke="#3b5bdb"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Linha vertical no mês selecionado */}
                        {(() => {
                          const ap = lineChartData.points[selectedMonth];
                          if (!ap) return null;
                          return (
                            <line
                              x1={ap.x} y1={ap.y + 6}
                              x2={ap.x} y2="160"
                              stroke="#3b5bdb"
                              strokeWidth="1"
                              strokeDasharray="3 3"
                              strokeOpacity="0.3"
                            />
                          );
                        })()}

                        {/* Dots clicáveis em todos os pontos */}
                        {lineChartData.points.map((p, idx) => {
                          const isActive = idx === selectedMonth;
                          return (
                            <g
                              key={idx}
                              style={{ cursor: 'pointer' }}
                              onClick={() => setSelectedMonth(idx)}
                            >
                              {/* Área de toque ampla (invisível) */}
                              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                              {/* Halo de destaque no mês ativo */}
                              {isActive && (
                                <circle cx={p.x} cy={p.y} r="10" fill="#3b5bdb" fillOpacity="0.15" />
                              )}
                              {/* Dot principal — visível apenas com valor > 0 */}
                              {p.val > 0 && (
                                <>
                                  <circle
                                    cx={p.x} cy={p.y}
                                    r={isActive ? 5.5 : 3}
                                    fill={isActive ? '#3b5bdb' : '#93a4f4'}
                                  />
                                  {isActive && (
                                    <circle cx={p.x} cy={p.y} r="2.5" fill="#fff" />
                                  )}
                                </>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                  {/* Index com os meses do ano — clicáveis */}
                  <div className="flex justify-between pl-[54px] pr-1 mt-2.5 select-none">
                    {monthNames.map((m, idx) => (
                      <span
                        key={m}
                        onClick={() => setSelectedMonth(idx)}
                        style={{
                          fontSize: '8.5px',
                          fontWeight: idx === selectedMonth ? '800' : '600',
                          color: idx === selectedMonth ? '#3b5bdb' : '#c0c4d6',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'color 0.2s',
                          fontFamily: 'Poppins, sans-serif',
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="panel"
              >
                {/* Toggle Despesa / Receita */}
                <div className="toggle-wrap">
                  <div className="toggle">
                    <button 
                      className={`toggle-btn ${statTab === 'expense' ? 'active' : ''}`}
                      onClick={() => setStatTab('expense')}
                    >
                      Despesa
                    </button>
                    <button 
                      className={`toggle-btn ${statTab === 'income' ? 'active' : ''}`}
                      onClick={() => setStatTab('income')}
                    >
                      Receita
                    </button>
                  </div>
                </div>

                {/* Donut Chart com emojis trigonométricos dinâmicos */}
                <div className="donut-wrap">
                  <svg viewBox="0 0 240 240" width="240" height="240" xmlns="http://www.w3.org/2000/svg">
                    <g transform="rotate(-90 120 120)">
                      {donutChartData.segments.length === 0 ? (
                        <circle cx="120" cy="120" r="85" fill="none" stroke="#eef0f7" strokeWidth="44"/>
                      ) : (
                        donutChartData.segments.map((seg) => (
                          <circle
                            key={seg.name}
                            cx="120"
                            cy="120"
                            r="85"
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="44"
                            strokeDasharray={seg.strokeDashArray}
                            strokeDashoffset={seg.strokeDashOffset}
                            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                          />
                        ))
                      )}
                    </g>
                  </svg>

                  {/* Emojis dinamicamente posicionados sobre as fatias da rosca */}
                  {donutChartData.segments.map((seg) => (
                    <div 
                      key={`emoji-${seg.name}`}
                      className="donut-icon" 
                      style={{ 
                        left: `${seg.emojiX}px`, 
                        top: `${seg.emojiY}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={seg.name}
                    >
                      <img src={getCategoryIconUrl(seg.name)} alt={seg.name} className="w-[22px] h-[22px] object-contain" />
                    </div>
                  ))}
                </div>

                {/* Lista de Categorias do Mês */}
                <div className="category-list">
                  {donutChartData.segments.length === 0 ? (
                    <p className="text-center text-xs text-gray-500 italic py-6">
                      Nenhuma {statTab === 'expense' ? 'despesa' : 'receita'} registrada
                    </p>
                  ) : (
                    donutChartData.segments.map((seg) => (
                      <div className="cat-row" key={seg.name}>
                        <div className="cat-icon" style={{ backgroundColor: `${seg.color}15`, borderColor: `${seg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={getCategoryIconUrl(seg.name)} alt={seg.name} className="w-[26px] h-[26px] object-contain" />
                        </div>
                        <span className="cat-pct">{seg.pct}%</span>
                        <span className="cat-name">{seg.name}</span>
                        <span className="cat-value">{fmtBRL(seg.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Indicador Home iOS */}
        <div className="home-indicator">
          <div className="home-bar"></div>
        </div>


      </main>

      {/* Month Picker arrastável premium em Portal */}
      {createPortal(
        <AnimatePresence>
          {showMonthPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMonthPicker(false)}
            >
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 250 }}
                dragElastic={{ top: 0.05, bottom: 0.6 }}
                onDragEnd={(e, info) => {
                  if (info.offset.y > 120) {
                    setShowMonthPicker(false);
                  }
                }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 210 }}
                className="w-full max-w-md bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl p-6 rounded-t-[2.5rem] border-t border-white/40 dark:border-white/10 shadow-glass-lg relative flex flex-col gap-4 select-none cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-2" />

                <div className="flex items-center justify-between border-b border-gray-200/50 pb-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedYear(y => y - 1)}
                    className="rounded-full p-2 hover:bg-black/5 text-gray-900 transition-all flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </motion.button>
                  
                  <div className="px-6">
                    <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">{selectedYear}</p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedYear(y => y + 1)}
                    className="rounded-full p-2 hover:bg-black/5 text-gray-900 transition-all flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </motion.button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[selectedYear - 2, selectedYear - 1, selectedYear].map((y) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${y === selectedYear ? 'bg-[#3b5bdb] text-white shadow-lg' : 'bg-black/5 text-gray-500 hover:bg-black/10'}`}
                    >
                      {y}
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {monthNames.map((m, idx) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={m}
                      onClick={() => { setSelectedMonth(idx); setShowMonthPicker(false); }}
                      className={`px-2 py-3.5 rounded-xl text-xs font-black uppercase transition-all ${idx === selectedMonth ? 'bg-[#3b5bdb] text-white shadow-lg' : 'bg-black/5 text-gray-500 hover:bg-black/10'}`}
                    >
                      {m}
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { const d = new Date(); setSelectedYear(d.getFullYear()); setSelectedMonth(d.getMonth()); setShowMonthPicker(false); }}
                    className="flex-1 rounded-2xl bg-black/5 py-3.5 text-xs font-black uppercase text-gray-900 hover:bg-black/10 transition-all"
                  >
                    Mês Atual
                  </motion.button>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMonthPicker(false)}
                    className="flex-1 rounded-2xl bg-gray-900 py-3.5 text-xs font-black uppercase text-white shadow-lg hover:shadow-black/20 transition-all"
                  >
                    Fechar
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Reports;

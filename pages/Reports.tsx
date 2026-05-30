import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { categories as categoryNames } from '../categories';
import StyledPieChart from '../components/StyledPieChart';
import Header from '../components/common/Header';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [hasData, setHasData] = useState(false);
  const [monthTotal, setMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [categories, setCategories] = useState<Array<{ name: string; amount: number }>>([]);
  const [projection, setProjection] = useState<{ labels: string[]; values: number[]; total: number; percent: number; isProjected: boolean[] }>({ labels: [], values: [], total: 0, percent: 0, isProjected: [] });
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [clickedPoint, setClickedPoint] = useState<number | null>(null);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<string>('');
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [lastIncomeTotal, setLastIncomeTotal] = useState(0);
  const [incomeCategories, setIncomeCategories] = useState<Array<{ name: string; amount: number }>>([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [statTab, setStatTab] = useState<'expense' | 'income'>('expense');
  const [activeCatIndex, setActiveCatIndex] = useState<number | null>(null);

  // Estados para o Gráfico Linear Diário ("Fluxo Diário")
  const [monthlyTransactions, setMonthlyTransactions] = useState<any[]>([]);
  const [dailyTab, setDailyTab] = useState<'expense' | 'income'>('expense');
  const [adjustmentCatId, setAdjustmentCatId] = useState<string | null>(null);
  const dailyScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveCatIndex(null);
  }, [statTab]);

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const budgetNames = categoryNames.slice();
  const incomeNames = ['Salário', 'Rendimentos', 'Dinheiro Extra'];
  const budgetCats = useMemo(() => budgetNames.map(n => {
    const src = incomeNames.includes(n) ? incomeCategories : categories;
    return { name: n, amount: (src.find(c => c.name === n)?.amount || 0) };
  }), [categories, incomeCategories]);

  useEffect(() => {
    const ac = new AbortController();
    let tid: number | undefined;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { setHasData(false); return; }

      // Carregar avatar do perfil do cache local
      try {
        const cached = localStorage.getItem(`dashboard_cache_profile_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.data?.avatarUrl) {
            setAvatarUrl(parsed.data.avatarUrl);
          }
        } else {
          const { data: prof } = await supabase.from('user_profiles').select('avatar_url').eq('id', user.id).maybeSingle();
          if (prof?.avatar_url) {
            setAvatarUrl(prof.avatar_url);
          }
        }
      } catch (e) { /* ignore */ }
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };

      // FETCH ADJUSTMENT ID
      let adjustmentCatIdLocal: string | null = null;
      try {
        const { data: adjCat } = await supabase
          .from('user_categories')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', 'Ajuste de Saldo')
          .abortSignal(ac.signal)
          .maybeSingle();
        if (adjCat) {
          adjustmentCatIdLocal = adjCat.id;
          setAdjustmentCatId(adjCat.id);
        }
      } catch (e) { /* ignore */ }


      const startCur = new Date(selectedYear, selectedMonth, 1);
      const endCur = new Date(selectedYear, selectedMonth + 1, 0);
      const startPrev = new Date(selectedYear, selectedMonth - 1, 1);
      const endPrev = new Date(selectedYear, selectedMonth, 0);

      const { data: curTx } = await supabase
        .from('user_transactions')
        .select('amount, type, date, category_id, is_paid')
        .eq('user_id', user.id)
        .gte('date', fmt(startCur))
        .lte('date', fmt(endCur))
        .abortSignal(ac.signal);

      const { data: prevTx } = await supabase
        .from('user_transactions')
        .select('amount, type, date, category_id') // Added category_id
        .eq('user_id', user.id)
        .gte('date', fmt(startPrev))
        .lte('date', fmt(endPrev))
        .abortSignal(ac.signal);

      // --- EXPENSES (no change) ---
      const expCur = (curTx || []).filter((t: any) => t.type === 'expense');
      const totalCur = expCur.reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const totalPrev = (prevTx || []).filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0);
      setMonthTotal(totalCur);
      setLastMonthTotal(totalPrev);

      const paidCur = expCur.filter((t: any) => t.is_paid).reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const pendingCur = expCur.filter((t: any) => !t.is_paid).reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      setPaidTotal(paidCur);
      setPendingTotal(pendingCur);

      const map = new Map<string, number>();
      expCur.forEach((t: any) => {
        const key = t.category_id || 'none';
        map.set(key, (map.get(key) || 0) + Number(t.amount));
      });
      const ids = Array.from(map.keys()).filter(k => k !== 'none');
      let catsById: Record<string, string> = {};
      if (ids.length) {
        const { data: cats } = await supabase
          .from('user_categories')
          .select('id, name')
          .in('id', ids);
        (cats || []).forEach((c: any) => { catsById[c.id as string] = String(c.name || 'Categoria'); });
      }
      const arr = Array.from(map.entries()).map(([id, amt]) => ({ name: id === 'none' ? 'Sem Categoria' : (catsById[id] || 'Categoria'), amount: amt }));
      arr.sort((a, b) => b.amount - a.amount);
      setCategories(arr);

      // --- INCOME (Exclude Adjustment) ---
      const incomeCurRaw = (curTx || []).filter((x: any) => x.type === 'income');
      const incomePrevRaw = (prevTx || []).filter((x: any) => x.type === 'income');

      // Filter Logic
      const incomeCurFiltered = incomeCurRaw.filter((t: any) => t.category_id !== adjustmentCatIdLocal && t.category_id !== 'd7956754-9a58-487d-9636-2cd59c2f4558');
      const incomePrevFiltered = incomePrevRaw.filter((t: any) => t.category_id !== adjustmentCatIdLocal && t.category_id !== 'd7956754-9a58-487d-9636-2cd59c2f4558');

      const incomeCur = incomeCurFiltered.reduce((s: number, x: any) => s + Number(x.amount), 0);
      const incomePrev = incomePrevFiltered.reduce((s: number, x: any) => s + Number(x.amount), 0);

      // For Net Calculation (Projection), should we exclude adjustment?
      // "Ajuste de Saldo" is artificial. Excluding it gives a better "real" net.
      // But BALANCE requires it.
      // However, Projection is about specific monthly performance.
      // Let's exclude it from Net for projection purposes to avoid spikes.
      const expenseCur = totalCur;
      const expensePrev = totalPrev;

      const totalNet = incomeCur - expenseCur; // This net excludes adjustment
      const prevNet = incomePrev - expensePrev;
      const percent = prevNet ? ((totalNet - prevNet) / prevNet) * 100 : 0;

      // Fetch Year Data for Annual Projection
      const startYear = new Date(selectedYear, 0, 1);
      const endYear = new Date(selectedYear, 11, 31);
      const { data: yearTx } = await supabase
        .from('user_transactions')
        .select('amount, type, date, category_id') // Added category_id
        .eq('user_id', user.id)
        .gte('date', fmt(startYear))
        .lte('date', fmt(endYear))
        .abortSignal(ac.signal);

      // Process Year Data
      const monthlyNet = Array(12).fill(0);
      const monthlyDataExists = Array(12).fill(false);

      (yearTx || []).forEach((t: any) => {
        // Exclude Adjustment and transfer from annual projection data as well
        if (t.type === 'income' && (t.category_id === adjustmentCatIdLocal || t.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558')) return;

        const parts = String(t.date || '').split('-');
        const m = parseInt(parts[1], 10) - 1; // 0-11
        if (m >= 0 && m <= 11) {
          const val = Number(t.amount);
          if (t.type === 'income') monthlyNet[m] += val;
          else monthlyNet[m] -= val;
          monthlyDataExists[m] = true;
        }
      });

      // Calculate Projection
      // Use actuals up to the selected month (or all actuals if year is past/fully present)
      // Project future months based on the trend calculated (percent)
      const projectedValues = [...monthlyNet];
      const isProjected = Array(12).fill(false);

      // Determine cutoff for projection. We project starting from selectedMonth + 1
      let lastVal = monthlyNet[selectedMonth];
      // If selected month has no data (e.g. future), try to find last month with data?
      // Or just use the totalNet calculated earlier (which is incomeCur - expenseCur)
      // totalNet effectively IS monthlyNet[selectedMonth] but computed from fresh curTx data.
      lastVal = totalNet;

      for (let i = selectedMonth + 1; i < 12; i++) {
        if (!monthlyDataExists[i]) { // Only project if no actual data? Or always project future?
          // Always project for "future" relative to selected context
          const nextVal = lastVal * (1 + percent / 100);
          projectedValues[i] = nextVal;
          isProjected[i] = true;
          lastVal = nextVal;
        }
      }

      setProjection({
        labels: monthNames,
        values: projectedValues,
        total: totalNet,
        percent,
        isProjected
      });

      setIncomeTotal(incomeCur);
      setLastIncomeTotal(incomePrev);

      // --- INCOME CATEGORIES (Exclude Adjustment) ---
      const mapInc = new Map<string, number>();
      incomeCurFiltered.forEach((t: any) => {
        const key = t.category_id || 'none';
        mapInc.set(key, (mapInc.get(key) || 0) + Number(t.amount));
      });
      const idsInc = Array.from(mapInc.keys()).filter(k => k !== 'none');
      let catsByIdInc: Record<string, string> = {};
      if (idsInc.length) {
        const { data: catsInc } = await supabase
          .from('user_categories')
          .select('id, name')
          .in('id', idsInc);
        (catsInc || []).forEach((c: any) => { catsByIdInc[c.id as string] = String(c.name || 'Categoria'); });
      }
      const arrInc = Array.from(mapInc.entries()).map(([id, amt]) => ({ name: id === 'none' ? 'Sem Categoria' : (catsByIdInc[id] || 'Categoria'), amount: amt }));
      arrInc.sort((a, b) => b.amount - a.amount);
      setIncomeCategories(arrInc);
      setMonthlyTransactions(curTx || []);

      setHasData(((curTx || []).length + (prevTx || []).length) > 0);
    };
    // debounce para reduzir aborts ao alternar mês/ano rapidamente
    tid = window.setTimeout(() => { load().catch(() => { }); }, 250);
    return () => { if (tid) clearTimeout(tid); ac.abort(); };
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    let cancelled = false;
    const loadBudgets = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data: rows } = await supabase
        .from('user_budgets')
        .select('category, limit_amount')
        .eq('user_id', user.id)
        .eq('year', selectedYear)
        .eq('month', selectedMonth);
      const map: Record<string, number> = {};
      (rows || []).forEach((r: any) => { map[String(r.category)] = Number(r.limit_amount || 0); });
      if (!cancelled) setBudgets(map);
    };
    loadBudgets();
    return () => { cancelled = true; };
  }, [selectedYear, selectedMonth]);



  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const changePct = useMemo(() => {
    if (!lastMonthTotal) return 0;
    return ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  }, [monthTotal, lastMonthTotal]);
  const topCats = useMemo(() => categories.slice(0, 4), [categories]);
  const incomeChangePct = useMemo(() => {
    if (!lastIncomeTotal) return 0;
    return ((incomeTotal - lastIncomeTotal) / lastIncomeTotal) * 100;
  }, [incomeTotal, lastIncomeTotal]);
  const topIncomeCats = useMemo(() => incomeCategories.slice(0, 4), [incomeCategories]);
  const makeLinePath = (vals: number[], width = 478, height = 150) => {
    if (!vals.length) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const rng = max - min || 1;
    const w = width - 2;
    const h = height - 2;
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / rng) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };
  const linePath = makeLinePath(projection.values);
  const colorTone = (p: number, type: 'income' | 'expense') => {
    // Neo-brutalist colors: 
    // Expense: primary (#8854D0), danger (#FF6B6B), accent (#FFE66D), dark (#000)
    // Income: secondary (#20BF55), accent (#FFE66D), primary-teal (#4ECDC4)
    if (type === 'expense') {
      const colors = ['#8854D0', '#FF6B6B', '#FD9644', '#4A4A4A', '#8854D0'];
      const idx = Math.floor(p * 10) % colors.length;
      return colors[idx];
    } else {
      const colors = ['#20BF55', '#4ECDC4', '#FFE66D', '#3867D6', '#20BF55'];
      const idx = Math.floor(p * 10) % colors.length;
      return colors[idx];
    }
  };
  const makeIncomeColors = (data: Array<{ name: string; amount: number }>) => {
    return data.map((_, i) => {
      // Expanded palette for Income (Greens, Teals, Blues, Yellows)
      const palette = [
        '#20BF55', '#4ECDC4', '#3867D6', '#FFE66D',
        '#26de81', '#2bcbba', '#45aaf2', '#f7b731',
        '#0fb9b1', '#20bf6b', '#2d98da', '#fa8231',
        '#00d2d3', '#54a0ff', '#5f27cd', '#c8d6e5'
      ];
      return palette[i % palette.length];
    });
  };
  const makeExpenseColors = (data: Array<{ name: string; amount: number }>) => {
    return data.map((_, i) => {
      // Expanded palette for Expenses (Reds, Oranges, Purples, Darks, Blues)
      const palette = [
        '#FF6B6B', '#FD9644', '#8854D0', '#2D9CDB',
        '#eb3b5a', '#fa8231', '#a55eea', '#4b7bec',
        '#fc5c65', '#fd9644', '#45aaf2', '#26de81',
        '#778ca3', '#d1d8e0', '#4b6584', '#a5b1c2'
      ];
      return palette[i % palette.length];
    });
  };
  const incomeColors = useMemo(() => makeIncomeColors(incomeCategories), [incomeCategories]);
  const expenseColors = useMemo(() => makeExpenseColors(categories), [categories]);

  // Quantidade de dias do mês selecionado
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Dados diários calculados para o gráfico linear
  const dailyChartData = useMemo(() => {
    const days = daysInMonth;
    const tab = dailyTab; // 'expense' | 'income'
    
    const values = Array.from({ length: days }, (_, i) => {
      const dayNum = i + 1;
      const txs = monthlyTransactions.filter((tx: any) => {
        if (!tx.date || tx.type !== tab) return false;
        if (!tx.is_paid) return false; // Exibe apenas saídas e entradas marcadas como JÁ PAGAS!
        if (tab === 'income' && (tx.category_id === adjustmentCatId || tx.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558')) return false;
        
        // Tratar formato YYYY-MM-DD
        const parts = tx.date.split('-');
        return parseInt(parts[2], 10) === dayNum;
      });
      const sum = txs.reduce((acc: number, tx: any) => acc + (Number(tx.amount) || 0), 0);
      return { day: dayNum, value: sum };
    });

    const rawMax = Math.max(...values.map(v => v.value), 0);
    const maxVal = rawMax || 1000;
    
    const width = 720;
    const height = 210; // Aumentado para dar espaço para pílulas em múltiplos níveis sem cortar no topo
    const paddingTop = 65; // Aumentado para acomodar os níveis de colisão (até 65px de elevação)
    const paddingBottom = 30;
    const paddingLeft = 20;
    const paddingRight = 20;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const points = values.map((v, i) => {
      const x = paddingLeft + (i / (days - 1)) * chartWidth;
      const ratio = rawMax > 0 ? (v.value / maxVal) : 0;
      const y = height - paddingBottom - ratio * chartHeight;
      return { day: v.day, value: v.value, x, y, labelOffsetY: 25 }; // 25 é o valor padrão
    });

    // Algoritmo dinâmico de resolução de colisões horizontais para rótulos de valores ativos
    points.forEach((p, idx) => {
      if (p.value === 0) return;
      
      const levels = [25, 45, 65]; // Níveis de altura (afastamento vertical) para pílulas
      let chosenLevel = 25;
      
      for (const lvl of levels) {
        let hasCollision = false;
        
        // Compara com os pontos anteriores com movimentação ativa para evitar sobreposição horizontal
        for (let i = Math.max(0, idx - 3); i < idx; i++) {
          const prevP = points[i];
          if (prevP.value > 0) {
            const distX = p.x - prevP.x;
            // Se as pílulas estão muito próximas horizontalmente (menos de 52px) e no mesmo nível
            if (distX < 52 && prevP.labelOffsetY === lvl) {
              hasCollision = true;
              break;
            }
          }
        }
        
        if (!hasCollision) {
          chosenLevel = lvl;
          break;
        }
      }
      
      p.labelOffsetY = chosenLevel;
    });
    
    // Caminho da linha
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    
    // Caminho da área preenchida
    const fillPath = points.length > 0 
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} L${points[0].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} Z`
      : '';
      
    // Encontrar o ponto de maior pico com valor > 0
    let peakPoint = null;
    if (rawMax > 0) {
      const sorted = [...points].sort((a, b) => b.value - a.value);
      peakPoint = sorted[0];
    }
      
    return { points, linePath, fillPath, maxVal, rawMax, width, height, paddingTop, paddingBottom, peakPoint };
  }, [daysInMonth, dailyTab, monthlyTransactions, adjustmentCatId]);

  // Efeito de scroll automático para os últimos dias (fim do contêiner) ao carregar ou alternar filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dailyScrollRef.current) {
        const el = dailyScrollRef.current;
        el.scrollLeft = el.scrollWidth - el.clientWidth;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [dailyTab, monthlyTransactions, selectedYear, selectedMonth]);



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen p-4 pb-28 gap-8 font-display text-gray-900"
    >
      <Header
        title={
          <div className="flex flex-col items-center gap-1 py-0.5 w-full">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none select-none">Gastos</h1>
            
            {/* Filtro global 'Este Mês' no centro do header, abaixo do título */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMonthPicker(s => !s)}
              className="h-7 px-2 border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm backdrop-blur-md select-none mt-1"
            >
              <span className="material-symbols-outlined !text-[11px] leading-none">calendar_month</span>
              <span className="leading-none">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
            </motion.button>
          </div>
        }
        className="!pt-4 !pb-1.5"
        leftAction={
          avatarUrl ? (
            <motion.img
              whileTap={{ scale: 0.95 }}
              src={avatarUrl}
              alt="Profile"
              className="h-10 w-10 rounded-full border border-white/40 shadow-sm object-cover cursor-pointer hover:opacity-80 transition-all"
              onClick={() => navigate('/settings')}
            />
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-white/40 shadow-sm transition-all text-gray-700"
              onClick={() => navigate('/settings')}
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </motion.button>
          )
        }
        rightAction={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-white/40 shadow-sm backdrop-blur-md transition-all text-gray-700"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-white"></span>
          </motion.button>
        }
      />

      {/* Bottom Sheet de Seleção de Mês - Painel Arrastável com AnimatePresence */}
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
            {/* Painel com animação Spring elástica e suporte a arrastar para fechar (drag="y") */}
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
              onClick={(e) => e.stopPropagation()} // Impede fechamento ao clicar no painel
            >
              {/* Indicador visual de pílula arrastável */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-2" />

              {/* Cabeçalho do seletor de Ano */}
              <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedYear(y => y - 1)}
                  className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-all flex items-center justify-center border border-transparent active:border-black/10 dark:active:border-white/10"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </motion.button>
                
                <div className="px-6">
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{selectedYear}</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedYear(y => y + 1)}
                  className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-all flex items-center justify-center border border-transparent active:border-black/10 dark:active:border-white/10"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </motion.button>
              </div>

              {/* Seletor rápido de anos (Últimos 3 Anos) */}
              <div className="grid grid-cols-3 gap-2">
                {[selectedYear - 2, selectedYear - 1, selectedYear].map((y) => (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${y === selectedYear ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
                  >
                    {y}
                  </motion.button>
                ))}
              </div>

              {/* Grade de meses (Botões grandes e confortáveis) */}
              <div className="grid grid-cols-4 gap-2">
                {monthNames.map((m, idx) => (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={m}
                    onClick={() => { setSelectedMonth(idx); setShowMonthPicker(false); }}
                    className={`px-2 py-3.5 rounded-xl text-xs font-black uppercase transition-all ${idx === selectedMonth ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>

              {/* Botões de Ação na Base */}
              <div className="flex gap-3 mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { const d = new Date(); setSelectedYear(d.getFullYear()); setSelectedMonth(d.getMonth()); setShowMonthPicker(false); }}
                  className="flex-1 rounded-2xl bg-black/5 dark:bg-white/5 py-3.5 text-xs font-black uppercase text-gray-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5"
                >
                  Mês Atual
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMonthPicker(false)}
                  className="flex-1 rounded-2xl bg-secondary py-3.5 text-xs font-black uppercase text-white shadow-lg shadow-secondary/30 hover:shadow-secondary/50 transition-all"
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

      <section>
        {/* Título de Estatísticas simétrico com Gráficos */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-center justify-center shadow-sm">
              <img src="https://cdn-icons-png.flaticon.com/512/1043/1043432.png" alt="Ícone estatísticas" className="w-6 h-6 dark:invert" />
            </div>
            <h3 className="text-xl font-black uppercase text-gray-900 dark:text-white tracking-tight">Estatísticas</h3>
          </div>
        </div>

        {/* Toggle Premium SAÍDAS / ENTRADAS */}
        <div className="flex items-center justify-center mb-6 px-1">
          <div className="bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl flex items-center shadow-inner border border-black/5 dark:border-white/10 w-full max-w-xs">
            <button
              onClick={() => setStatTab('expense')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${statTab === 'expense' ? 'bg-[#FF6B6B] text-white shadow-lg shadow-[#FF6B6B]/20 scale-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white scale-95 hover:scale-100'}`}
            >
              SAÍDAS
            </button>
            <button
              onClick={() => setStatTab('income')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${statTab === 'income' ? 'bg-[#20BF55] text-white shadow-lg shadow-[#20BF55]/20 scale-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white scale-95 hover:scale-100'}`}
            >
              ENTRADAS
            </button>
          </div>
        </div>

        {/* Card Premium de Estatísticas com Rosquinha Centralizada e Legenda Interna */}
        <div className="w-full">
          <motion.div
            layout
            key={statTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-br from-white/70 to-white/40 dark:from-[#1C1C1E]/60 dark:to-black/60 p-4 sm:p-6 border border-white/50 dark:border-white/10 shadow-glass dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2.5rem] backdrop-blur-2xl flex flex-col gap-3"
          >
            {/* Donut Chart com Valor no Centro - Margens minimizadas à direita e abaixo */}
            <div className="flex flex-col items-center justify-center py-0.5 relative w-full overflow-hidden">
              <div className="relative flex items-center justify-center -mr-1 -mb-1">
                <StyledPieChart
                  data={(statTab === 'expense' ? categories : incomeCategories).map((c, i) => ({
                    name: c.name,
                    value: c.amount,
                    color: (statTab === 'expense' ? expenseColors : incomeColors)[i % (statTab === 'expense' ? expenseColors : incomeColors).length]
                  }))}
                  size={290}
                  thickness={30}
                  hideLegend={true}
                  hideCenterText={true}
                  activeIndex={activeCatIndex}
                  onActiveIndexChange={setActiveCatIndex}
                />
                {/* Valor Centralizado Dinâmico com Legenda Interna - Maior Diâmetro Útil & Auto-Scaling */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <div className="w-full max-w-[160px] sm:max-w-[190px] flex flex-col items-center justify-center text-center overflow-hidden">
                    {activeCatIndex === null ? (
                      (() => {
                        const valStr = (statTab === 'expense' ? monthTotal : incomeTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
                        const valFontClass = valStr.length <= 8
                          ? 'text-2xl sm:text-3xl font-black tracking-tight leading-tight'
                          : valStr.length <= 12
                          ? 'text-xl sm:text-2xl font-black tracking-tight leading-tight'
                          : 'text-lg sm:text-xl font-black tracking-tight leading-tight';
                        return (
                          <>
                            <p className="text-[16px] sm:text-[18px] font-black uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500 leading-tight mb-2 w-full break-words whitespace-normal px-1">
                              {statTab === 'expense' ? 'Total Gasto' : 'Total Recebido'}
                            </p>
                            <p className={`w-full break-words whitespace-normal px-1 font-display ${valFontClass} ${statTab === 'expense' ? 'text-[#FF6B6B]' : 'text-[#20BF55]'}`}>
                              {valStr}
                            </p>
                          </>
                        );
                      })()
                    ) : (
                      (() => {
                        const items = statTab === 'expense' ? categories : incomeCategories;
                        const activeItem = items[activeCatIndex];
                        if (!activeItem) return null;
                        
                        const colors = statTab === 'expense' ? expenseColors : incomeColors;
                        const activeColor = colors[activeCatIndex % colors.length];
                        const total = statTab === 'expense' ? monthTotal : incomeTotal;
                        const percent = total > 0 ? Math.round((activeItem.amount / total) * 100) : 0;
                        
                        const nameLen = activeItem.name.length;
                        const catFontClass = nameLen <= 8
                          ? 'text-[14px] sm:text-[16px] font-black uppercase tracking-[0.1em] mb-1.5 leading-tight'
                          : nameLen <= 14
                          ? 'text-[11px] sm:text-[13px] font-black uppercase tracking-[0.08em] mb-1.5 leading-tight'
                          : 'text-[10px] sm:text-[11px] font-black uppercase tracking-[0.05em] mb-1.5 leading-tight';

                        const valStr = activeItem.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
                        const valFontClass = valStr.length <= 8
                          ? 'text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-1'
                          : valStr.length <= 12
                          ? 'text-xl sm:text-2xl font-black tracking-tight leading-tight mb-1'
                          : 'text-lg sm:text-xl font-black tracking-tight leading-tight mb-1';

                        return (
                          <>
                            <p 
                              className={`w-full break-words whitespace-normal px-1 ${catFontClass}`}
                              style={{ color: activeColor }}
                            >
                              {activeItem.name}
                            </p>
                            <p 
                              className={`w-full break-words whitespace-normal px-1 font-display ${valFontClass}`}
                              style={{ color: activeColor }}
                            >
                              {valStr}
                            </p>
                            <p className="text-[11px] sm:text-[12px] font-bold text-gray-400 dark:text-gray-500 leading-tight w-full break-words whitespace-normal px-1">
                              {percent}% do total
                            </p>
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Divisor Visual Suave */}
            <div className="h-[1px] w-full bg-gray-200/50 dark:bg-white/5" />

            {/* Lista das Categorias com Barras de Progresso de Vidro (Glassmorphic) */}
            <div 
              className="flex flex-col gap-3 max-h-[360px] overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar select-none"
              style={{ touchAction: 'pan-y' }}
            >
              {(statTab === 'expense' ? categories : incomeCategories).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium py-8 text-center italic">
                  Nenhuma categoria registrada este mês
                </p>
              ) : (
                (statTab === 'expense' ? categories : incomeCategories).map((c, i) => {
                  const total = statTab === 'expense' ? monthTotal : incomeTotal;
                  const percent = total > 0 ? Math.round((c.amount / total) * 100) : 0;
                  const catColor = (statTab === 'expense' ? expenseColors : incomeColors)[i % (statTab === 'expense' ? expenseColors : incomeColors).length];
                  const isActive = activeCatIndex === i;

                  return (
                    <motion.div
                      key={c.name}
                      onClick={() => setActiveCatIndex(isActive ? null : i)}
                      whileTap={{ scale: 0.98 }}
                      className={`flex flex-col gap-1.5 select-none py-2 px-3 rounded-2xl transition-all cursor-pointer border ${
                        isActive 
                          ? 'bg-white/70 dark:bg-white/10 border-white/50 dark:border-white/20 shadow-glass-sm scale-[1.02] translate-x-0.5' 
                          : 'bg-transparent border-transparent hover:bg-white/30 dark:hover:bg-white/5'
                      }`}
                    >
                      {/* Texto descritivo da Categoria */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {/* Pílula de ícone redonda pequena com a cor da categoria */}
                          <div
                            className="w-3.5 h-3.5 rounded-full border shadow-sm flex-shrink-0"
                            style={{
                              backgroundColor: `${catColor}15`,
                              borderColor: `${catColor}30`,
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full m-auto" style={{ backgroundColor: catColor }} />
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            {c.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900 dark:text-white">
                            {fmtBRL(c.amount)}
                          </span>
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded-md border"
                            style={{
                              color: catColor,
                              backgroundColor: `${catColor}10`,
                              borderColor: `${catColor}20`,
                            }}
                          >
                            {percent}%
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso Fina Glassmorphic correspondente à proporção */}
                      <div className="h-1 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: catColor,
                            boxShadow: isActive ? `0 0 12px ${catColor}70` : `0 0 8px ${catColor}40`,
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

      </section>

      <section className="mt-4">
        {/* Título de Fluxo Diário simétrico com Estatísticas */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[24px] text-gray-900 dark:text-white leading-none select-none">timeline</span>
            </div>
            <h3 className="text-xl font-black uppercase text-gray-900 dark:text-white tracking-tight">Fluxo Diário</h3>
          </div>
        </div>

        {/* Toggle Premium SAÍDAS DIÁRIAS / ENTRADAS DIÁRIAS */}
        <div className="flex items-center justify-center mb-6 px-1">
          <div className="bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl flex items-center shadow-inner border border-black/5 dark:border-white/10 w-full max-w-xs">
            <button
              onClick={() => setDailyTab('expense')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${dailyTab === 'expense' ? 'bg-[#FF6B6B] text-white shadow-lg shadow-[#FF6B6B]/20 scale-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white scale-95 hover:scale-100'}`}
            >
              SAÍDAS DIÁRIAS
            </button>
            <button
              onClick={() => setDailyTab('income')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${dailyTab === 'income' ? 'bg-[#20BF55] text-white shadow-lg shadow-[#20BF55]/20 scale-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white scale-95 hover:scale-100'}`}
            >
              ENTRADAS DIÁRIAS
            </button>
          </div>
        </div>

        {/* Card do Gráfico Linear Diário com Scroll Horizontal */}
        <div className="w-full">
          <motion.div
            layout
            key={dailyTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-br from-white/70 to-white/40 dark:from-[#1C1C1E]/60 dark:to-black/60 p-4 sm:p-6 border border-white/50 dark:border-white/10 shadow-glass dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2.5rem] backdrop-blur-2xl flex flex-col gap-3 overflow-hidden"
          >
            {/* Div de Scroll Horizontal do SVG */}
            <div 
              ref={dailyScrollRef}
              className="overflow-x-auto select-none no-scrollbar flex cursor-grab active:cursor-grabbing pb-2 scroll-smooth active:scale-[0.99] transition-transform w-full"
            >
              <svg 
                width={dailyChartData.width} 
                height={dailyChartData.height} 
                className="overflow-visible"
              >
                <defs>
                  {/* Gradiente da linha principal */}
                  <linearGradient id="line-grad-expense" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF6B6B" />
                    <stop offset="100%" stopColor="#FF8E8E" />
                  </linearGradient>
                  <linearGradient id="line-grad-income" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#20BF55" />
                    <stop offset="100%" stopColor="#4CD137" />
                  </linearGradient>
                  
                  {/* Gradiente da área de preenchimento */}
                  <linearGradient id="fill-grad-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="fill-grad-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#20BF55" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#20BF55" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Linhas guia horizontais de fundo (Grid) */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = dailyChartData.paddingTop + ratio * (dailyChartData.height - dailyChartData.paddingTop - dailyChartData.paddingBottom);
                  return (
                    <line
                      key={ratio}
                      x1="0"
                      y1={y}
                      x2={dailyChartData.width}
                      y2={y}
                      stroke="currentColor"
                      className="text-gray-200/40 dark:text-white/5"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Área preenchida com gradiente translucido */}
                {dailyChartData.rawMax > 0 && (
                  <path
                    d={dailyChartData.fillPath}
                    fill={dailyTab === 'expense' ? 'url(#fill-grad-expense)' : 'url(#fill-grad-income)'}
                  />
                )}

                {/* Linha principal com gradiente neon */}
                {dailyChartData.rawMax > 0 ? (
                  <path
                    d={dailyChartData.linePath}
                    fill="none"
                    stroke={dailyTab === 'expense' ? 'url(#line-grad-expense)' : 'url(#line-grad-income)'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  // Linha reta padrão caso todos sejam zero
                  <line
                    x1="20"
                    y1={dailyChartData.height - dailyChartData.paddingBottom}
                    x2={dailyChartData.width - 20}
                    y2={dailyChartData.height - dailyChartData.paddingBottom}
                    stroke="currentColor"
                    className="text-gray-300 dark:text-white/10"
                    strokeWidth="2.5"
                  />
                )}

                {/* Pontos de destaque (círculos) nos dias com transações */}
                {dailyChartData.points.map((p) => {
                  if (p.value === 0) return null;
                  const color = dailyTab === 'expense' ? '#FF6B6B' : '#20BF55';
                  return (
                    <g key={p.day} className="cursor-pointer">
                      {/* Círculo externo de glow/sombra */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="8"
                        fill={color}
                        opacity="0.25"
                      />
                      {/* Círculo externo de borda */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill={color}
                      />
                      {/* Centro branco do ponto */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="2"
                        fill="#FFFFFF"
                      />
                    </g>
                  );
                })}

                {/* Rótulo de valores acima de cada pontinho ativo */}
                {dailyChartData.points.map((p) => {
                  if (p.value === 0) return null;
                  
                  const formatted = p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
                  const pillWidth = Math.max(48, formatted.length * 5.2);
                  const pillX = p.x - (pillWidth / 2);
                  const offsetY = p.labelOffsetY || 25;
                  
                  return (
                    <g key={`val-${p.day}`}>
                      {/* Retângulo/Pílula de fundo do texto do Valor */}
                      <rect
                        x={pillX}
                        y={p.y - offsetY}
                        width={pillWidth}
                        height="15"
                        rx="5"
                        fill={dailyTab === 'expense' ? '#FF6B6B' : '#20BF55'}
                        className="shadow-sm"
                      />
                      <text
                        x={p.x}
                        y={p.y - offsetY + 11}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        className="text-[8px] font-black tracking-tight select-none font-display"
                      >
                        {formatted}
                      </text>
                      {/* Pequena linha conectando a pílula ao circulo */}
                      <line
                        x1={p.x}
                        y1={p.y - offsetY + 15}
                        x2={p.x}
                        y2={p.y - 5}
                        stroke={dailyTab === 'expense' ? '#FF6B6B' : '#20BF55'}
                        strokeWidth="1.2"
                        opacity="0.8"
                      />
                    </g>
                  );
                })}

                {/* Eixo X: Legenda com o número de cada dia do mês */}
                {dailyChartData.points.map((p) => {
                  const hasVal = p.value > 0;
                  return (
                    <text
                      key={p.day}
                      x={p.x}
                      y={dailyChartData.height - 8}
                      textAnchor="middle"
                      className={`text-[9px] font-black select-none ${hasVal ? (dailyTab === 'expense' ? 'fill-[#FF6B6B]' : 'fill-[#20BF55]') : 'fill-gray-400 dark:fill-gray-500'}`}
                    >
                      {p.day}
                    </text>
                  );
                })}
              </svg>
            </div>

            {dailyChartData.rawMax === 0 && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold py-2 text-center italic leading-none mt-1">
                Sem movimentações diárias registradas este mês
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* AI FAB */}
      <motion.button
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/chat')}
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/40 z-40 border border-white/20 backdrop-blur-md"
      >
        <span className="material-symbols-outlined !text-2xl">auto_awesome</span>
      </motion.button>

    </motion.div>
  );
};

export default Reports;

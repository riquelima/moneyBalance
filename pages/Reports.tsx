import React, { useEffect, useMemo, useState } from 'react';
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
      let adjustmentCatId: string | null = null;
      try {
        const { data: adjCat } = await supabase
          .from('user_categories')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', 'Ajuste de Saldo')
          .abortSignal(ac.signal)
          .maybeSingle();
        if (adjCat) adjustmentCatId = adjCat.id;
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
      const incomeCurFiltered = incomeCurRaw.filter((t: any) => t.category_id !== adjustmentCatId && t.category_id !== 'd7956754-9a58-487d-9636-2cd59c2f4558');
      const incomePrevFiltered = incomePrevRaw.filter((t: any) => t.category_id !== adjustmentCatId && t.category_id !== 'd7956754-9a58-487d-9636-2cd59c2f4558');

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
        if (t.type === 'income' && (t.category_id === adjustmentCatId || t.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558')) return;

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
      </AnimatePresence>

      <section>
        <h2 className="text-xl font-bold mb-6 text-gray-900 px-2">Estatísticas</h2>
        <div className="w-full overflow-hidden">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-1 no-scrollbar">
            {/* Card Saídas */}
            <div className="min-w-full snap-center">
              <motion.div
                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-glass overflow-hidden relative"
                initial={{ x: 0 }}
                whileHover={{ y: -4 }}
              >
                <div className="flex flex-col gap-4 items-center">
                  <div className="w-full border-b border-gray-200/50 pb-4 mb-2">
                    <div className="flex items-center justify-center gap-1.5 w-full mb-1">
                      <div className="w-5 h-5 rounded-full bg-[#FF6B6B]/15 border border-[#FF6B6B]/30 text-[#FF6B6B] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined !text-[10px] leading-none">arrow_upward</span>
                      </div>
                      <p className="text-[#FF6B6B] text-xs font-black uppercase tracking-widest leading-none">Saídas</p>
                    </div>
                    <p className="text-danger text-4xl font-black text-center tracking-tight">{fmtBRL(monthTotal)}</p>
                  </div>

                  <div className="py-4">
                    <StyledPieChart
                      data={categories.map((c, i) => ({
                        name: c.name,
                        value: c.amount,
                        color: expenseColors[i % expenseColors.length]
                      }))}
                      size={200}
                      thickness={40}
                    />
                  </div>


                </div>
              </motion.div>
            </div>

            {/* Card Entradas */}
            <div className="min-w-full snap-center">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-glass transition-all hover:-translate-y-1 overflow-hidden relative">
                <div className="flex flex-col gap-4 items-center">
                  <div className="w-full border-b border-gray-200/50 pb-4 mb-2">
                    <div className="flex items-center justify-center gap-1.5 w-full mb-1">
                      <div className="w-5 h-5 rounded-full bg-[#20BF55]/15 border border-[#20BF55]/30 text-[#20BF55] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined !text-[10px] leading-none">arrow_downward</span>
                      </div>
                      <p className="text-[#20BF55] text-xs font-black uppercase tracking-widest leading-none">Entradas</p>
                    </div>
                    <p className="text-secondary text-4xl font-black text-center tracking-tight">{fmtBRL(incomeTotal)}</p>
                  </div>

                  <div className="py-4">
                    <StyledPieChart
                      data={incomeCategories.map((c, i) => ({
                        name: c.name,
                        value: c.amount,
                        color: incomeColors[i % incomeColors.length]
                      }))}
                      size={200}
                      thickness={40}
                    />
                  </div>


                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Budgets */}
      <section>
        <h2 className="text-xl font-bold mb-6 text-gray-900 px-2">Orçamentos</h2>
        <div className="flex flex-col gap-4 max-h-[340px] overflow-y-auto pr-1 p-1 custom-scrollbar">
          {budgetCats.map((c, index) => {
            const limit = Number(budgets[c.name] || 0);
            const spent = Number(c.amount || 0);
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

            // Glassy pastel colors
            const cardColors = [
              'bg-teal-500/10 border-teal-500/20',
              'bg-purple-500/10 border-purple-500/20',
              'bg-orange-500/10 border-orange-500/20',
              'bg-blue-500/10 border-blue-500/20',
              'bg-red-500/10 border-red-500/20',
              'bg-green-500/10 border-green-500/20',
            ];
            const cardStyle = cardColors[index % cardColors.length];

            const barColor = (() => {
              if (limit > 0) {
                if (spent < limit) return 'bg-accent';
                if (spent === limit) return 'bg-secondary';
                return 'bg-danger';
              }
              return 'bg-gray-200';
            })();
            const right = limit > 0 ? `${fmtBRL(spent)} / ${fmtBRL(limit)}` : `${fmtBRL(spent)} / --`;

            return (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={c.name}
                onClick={() => { setEditingCat(c.name); setTempLimit(limit ? String(limit) : ''); }}
                className={`group relative ${cardStyle} border rounded-2xl p-4 shadow-sm backdrop-blur-md transition-all shrink-0`}
              >
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <p className="font-bold text-gray-900 uppercase text-xs tracking-wider">{c.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold bg-white/50 px-2 py-1 rounded-lg backdrop-blur-md">{right}</p>
                </div>
                <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} transition-all duration-500 rounded-full`} style={{ width: `${pct}%` }}></div>
                </div>
              </motion.button>
            );
          })}
          {budgetCats.length === 0 && (
            <div className="bg-white/50 p-6 rounded-2xl border border-white/20 text-gray-500 text-center backdrop-blur-md">
              <p className="font-medium">Nenhum orçamento configurado.</p>
            </div>
          )}
        </div>
        {editingCat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-md">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="w-full max-w-md bg-white/90 backdrop-blur-xl p-6 rounded-t-3xl border-t border-white/20 shadow-glass-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold uppercase text-gray-900">Definir Limite</h3>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingCat(null)} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-black/5 transition-all">
                  <span className="material-symbols-outlined">close</span>
                </motion.button>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2 bg-accent/20 text-accent inline-block px-2 py-1 rounded-md">{editingCat}</p>
              <input
                type="text"
                value={tempLimit}
                onChange={(e) => setTempLimit(e.target.value)}
                placeholder="EX: 800"
                className="w-full rounded-xl bg-white/50 border border-gray-200 p-4 text-gray-900 font-bold placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
              />
              <div className="mt-8 flex gap-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingCat(null)} className="flex-1 rounded-xl bg-gray-100 py-3 font-bold uppercase text-gray-500 hover:bg-gray-200 transition-all">Cancelar</motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    const n = Number(String(tempLimit).replace(/[^0-9.,]/g, '').replace(',', '.'));
                    if (!Number.isNaN(n) && n >= 0 && editingCat) {
                      const { data: userData } = await supabase.auth.getUser();
                      const user = userData?.user;
                      if (user) {
                        await supabase
                          .from('user_budgets')
                          .upsert({ user_id: user.id, year: selectedYear, month: selectedMonth, category: editingCat, limit_amount: n }, { onConflict: 'user_id,year,month,category' });
                      }
                      setBudgets((b) => ({ ...b, [editingCat]: n }));
                      setEditingCat(null);
                      setTempLimit('');
                    }
                  }}
                  className="flex-1 rounded-xl bg-primary py-3 font-bold text-white uppercase shadow-lg shadow-primary/30 transition-all"
                >
                  Salvar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
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

      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-xl font-bold uppercase text-gray-900">Projeção</h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/projecao-futura')}
            className="rounded-full p-2 bg-white/50 hover:bg-white/80 border border-white/20 transition-all"
          >
            <span className="material-symbols-outlined text-gray-900">arrow_forward</span>
          </motion.button>
        </div>
        <div className="bg-white/60 rounded-3xl p-6 border border-white/40 shadow-glass backdrop-blur-xl">
          <div className="flex min-w-72 flex-1 flex-col gap-4">
            <div className="border-b border-gray-200/50 pb-4">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest text-center mb-1">Saldo Projetado</p>
              <p className="text-primary text-4xl font-black text-center tracking-tight">{fmtBRL(projection.total)}</p>
            </div>

            <div className="flex justify-center gap-2 items-center bg-white/40 border border-white/20 rounded-xl p-2 backdrop-blur-sm">
              <p className="text-gray-500 text-[10px] font-bold uppercase">Próximos 3 meses</p>
              <p className={`${projection.percent >= 0 ? 'text-secondary' : 'text-danger'} text-xs font-black bg-white/80 px-2 py-0.5 rounded-md`}>{`${projection.percent >= 0 ? '+' : ''}${projection.percent.toFixed(1)}%`}</p>
            </div>

            <div className="flex min-h-[180px] flex-1 flex-col gap-4 py-4 relative">
              <svg
                fill="none"
                height="150"
                preserveAspectRatio="none"
                viewBox="-5 0 482 150"
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-visible"
                onMouseLeave={() => !clickedPoint && setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#20BF55" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#20BF55" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area preenchida */}
                <path d={`M0 149 ${linePath.replace(/^M[^ ]+ [^ ]+/, '')} L 475 149 Z`} fill="url(#chartGradient)" />

                {/* Linha principal */}
                <path d={linePath} stroke="#20BF55" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" filter="url(#glow)" />

                {/* Pontos */}
                {projection.values.map((v, i) => {
                  if (!linePath) return null;
                  const min = Math.min(...projection.values);
                  const max = Math.max(...projection.values);
                  const rng = max - min || 1;
                  const w = 478 - 2;
                  const h = 150 - 2;
                  const x = (i / (projection.values.length - 1)) * w;
                  const y = h - ((v - min) / rng) * h;
                  const isHovered = hoveredPoint === i;
                  const isClicked = clickedPoint === i;
                  const isActive = isHovered || isClicked;
                  const isProj = projection.isProjected[i];

                  return (
                    <g
                      key={i}
                      onMouseEnter={() => setHoveredPoint(i)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedPoint(isClicked ? null : i);
                      }}
                      className="cursor-pointer transition-all duration-300"
                    >
                      {/* Hit area larger than visual point */}
                      <rect x={x - 10} y={y - 10} width="20" height="20" fill="transparent" />

                      <circle
                        cx={x}
                        cy={y}
                        r={isActive ? 6 : 4}
                        className={`${isProj ? 'fill-gray-200' : 'fill-white'} stroke-primary transition-all duration-300`}
                        strokeWidth={2}
                      />

                      {isActive && (
                        <g pointerEvents="none">
                          <foreignObject x={x - 60} y={y - 50} width="120" height="40" className="overflow-visible">
                            <div className="flex flex-col items-center justify-center">
                              <div className="bg-black/80 text-white text-[10px] font-bold uppercase py-1 px-2 rounded-lg backdrop-blur-md whitespace-nowrap z-50 shadow-lg">
                                {isProj ? 'Projeção: ' : 'Real: '}{fmtBRL(v)}
                              </div>
                              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black/80"></div>
                            </div>
                          </foreignObject>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
              <div className="flex justify-between px-2 border-t border-gray-200/50 pt-3">
                {projection.labels.map((l, i) => {
                  const isActive = hoveredPoint === i || clickedPoint === i;
                  return (
                    <p
                      key={l}
                      className={`text-[10px] font-bold uppercase cursor-pointer transition-colors ${isActive ? 'text-primary scale-110' : 'text-gray-500'}`}
                      onMouseEnter={() => setHoveredPoint(i)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedPoint(clickedPoint === i ? null : i);
                      }}
                    >
                      {l}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

    </motion.div>
  );
};

export default Reports;

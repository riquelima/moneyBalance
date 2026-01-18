import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { categories as categoryNames } from '../categories';

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
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const budgetNames = categoryNames.slice();
  const incomeNames = ['Salário','Rendimentos','Dinheiro Extra'];
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
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      const startCur = new Date(selectedYear, selectedMonth, 1);
      const endCur = new Date(selectedYear, selectedMonth + 1, 0);
      const startPrev = new Date(selectedYear, selectedMonth - 1, 1);
      const endPrev = new Date(selectedYear, selectedMonth, 0);

      const { data: curTx } = await supabase
        .from('user_transactions')
        .select('amount, type, date, category_id')
        .eq('user_id', user.id)
        .gte('date', fmt(startCur))
        .lte('date', fmt(endCur))
        .abortSignal(ac.signal);

      const { data: prevTx } = await supabase
        .from('user_transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', fmt(startPrev))
        .lte('date', fmt(endPrev))
        .abortSignal(ac.signal);

      const expCur = (curTx || []).filter((t: any) => t.type === 'expense');
      const totalCur = expCur.reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const totalPrev = (prevTx || []).filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0);
      setMonthTotal(totalCur);
      setLastMonthTotal(totalPrev);

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

      const incomeCur = (curTx || []).filter((x: any) => x.type === 'income').reduce((s: number, x: any) => s + Number(x.amount), 0);
      const expenseCur = (curTx || []).filter((x: any) => x.type === 'expense').reduce((s: number, x: any) => s + Number(x.amount), 0);
      const totalNet = incomeCur - expenseCur;
      const incomePrev = (prevTx || []).filter((x: any) => x.type === 'income').reduce((s: number, x: any) => s + Number(x.amount), 0);
      const expensePrev = (prevTx || []).filter((x: any) => x.type === 'expense').reduce((s: number, x: any) => s + Number(x.amount), 0);
      const prevNet = incomePrev - expensePrev;
      const percent = prevNet ? ((totalNet - prevNet) / prevNet) * 100 : 0;

      // Fetch Year Data for Annual Projection
      const startYear = new Date(selectedYear, 0, 1);
      const endYear = new Date(selectedYear, 11, 31);
      const { data: yearTx } = await supabase
        .from('user_transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', fmt(startYear))
        .lte('date', fmt(endYear))
        .abortSignal(ac.signal);

      // Process Year Data
      const monthlyNet = Array(12).fill(0);
      const monthlyDataExists = Array(12).fill(false);
      
      (yearTx || []).forEach((t: any) => {
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
      // If we have actual data for future months, we use it? 
      // Requirement: "dados precisos". Using actuals is most precise.
      // But for "Projection" concept, if we are in March, Apr-Dec should be projected.
      // Let's assume we project from selectedMonth + 1 onwards ONLY IF no data exists?
      // Or forcing projection from selectedMonth onwards to show the "Trend"?
      // Usually "Projection" means "What if". 
      // Let's stick to: Use Actuals where they exist (and <= selectedMonth + 1 maybe?), Project the rest.
      // Simpler: Project from selectedMonth + 1.
      
      let lastVal = monthlyNet[selectedMonth];
      // If selected month has no data (e.g. future), try to find last month with data?
      // Or just use the totalNet calculated earlier for consistency
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

      const mapInc = new Map<string, number>();
      (curTx || []).filter((t: any) => t.type === 'income').forEach((t: any) => {
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
    tid = window.setTimeout(() => { load().catch(() => {}); }, 250);
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
        const palette = ['#20BF55', '#4ECDC4', '#3867D6', '#FFE66D']; // Green, Teal, Blue, Yellow
        return palette[i % palette.length];
    });
  };
  const makeExpenseColors = (data: Array<{ name: string; amount: number }>) => {
    return data.map((_, i) => {
        const palette = ['#2D9CDB', '#FF6B6B', '#FD9644', '#000000'];
        return palette[i % palette.length];
    });
  };
  const incomeColors = useMemo(() => makeIncomeColors(incomeCategories), [incomeCategories]);
  const expenseColors = useMemo(() => makeExpenseColors(categories), [categories]);
  
  const Pie: React.FC<{ data: { name: string; amount: number }[]; colors: string[]; size?: number; thickness?: number; denominator?: number }> = ({ data, colors, size = 200, thickness = 30, denominator }) => {
    const [opened, setOpened] = useState<Record<number, boolean>>({});
    const totalData = data.reduce((a, d) => a + Number(d.amount || 0), 0);
    const denom = typeof denominator === 'number' && denominator > 0 ? denominator : totalData;
    const R = size / 2; // raio total para pizza preenchida
    let start = -Math.PI / 2; // começa no topo
    const slices = data.map((d, i) => {
      const p = denom ? Number(d.amount || 0) / denom : 0;
      const ang = p * 2 * Math.PI;
      const end = start + ang;
      const x0 = Math.cos(start) * R, y0 = Math.sin(start) * R;
      const x1 = Math.cos(end) * R, y1 = Math.sin(end) * R;
      const large = ang > Math.PI ? 1 : 0;
      const path = `M 0 0 L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
      const mid = start + ang / 2;
      const rx = Math.cos(mid) * (R * 0.7); // Rótulo mais externo
      const ry = Math.sin(mid) * (R * 0.7);
      start = end;
      return { p, path, color: colors[i % colors.length], rx, ry, name: d.name };
    });
    
    // Fill remaining space with pattern or solid color if needed
    const sumP = slices.reduce((a, s) => a + s.p, 0);
    const rest = Math.max(0, 1 - sumP);
    if (rest > 0.01) {
      const ang = rest * 2 * Math.PI;
      const end = start + ang;
      const x0 = Math.cos(start) * R, y0 = Math.sin(start) * R;
      const x1 = Math.cos(end) * R, y1 = Math.sin(end) * R;
      const large = ang > Math.PI ? 1 : 0;
      const path = `M 0 0 L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
      slices.push({ p: rest, path, color: '#F7F7F7', rx: 0, ry: 0 }); // Background color for empty space
    }

    return (
      <svg width={size + 20} height={size + 20} viewBox={`-10 -10 ${size + 20} ${size + 20}`} className="mx-auto overflow-visible">
        <g transform={`translate(${size / 2},${size / 2})`}>
          {/* Sombra dura deslocada para o gráfico inteiro */}
          <circle cx="4" cy="4" r={R} className="fill-black dark:fill-white/20" />
          
          {slices.map((s, i) => (
            <g key={i} onClick={() => setOpened(prev => ({ ...prev, [i]: !prev[i] }))} style={{ cursor: 'pointer' }}>
              <path d={s.path} fill={s.color} className="stroke-dark dark:stroke-white" strokeWidth="3" />
              {s.p > 0.05 && (
                <g>
                    <rect x={s.rx - 18} y={s.ry - 8} width="36" height="16" className="fill-white dark:fill-surface-dark stroke-dark dark:stroke-white" strokeWidth="2" />
                    <text x={s.rx} y={s.ry} className="fill-dark dark:fill-white" fontSize={10} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
                    {(s.p * 100).toFixed(0)}%
                    </text>
                    {opened[i] && (
                      <text x={s.rx} y={s.ry + 12} className="fill-dark dark:fill-white" fontSize={9} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
                        {s.name}
                      </text>
                    )}
                </g>
              )}
            </g>
          ))}
          <circle cx="0" cy="0" r={R} fill="none" className="stroke-dark dark:stroke-white" strokeWidth="3" />
        </g>
      </svg>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col min-h-screen p-4 pb-28 gap-8 bg-background-light dark:bg-background-dark font-display text-text-primary dark:text-white"
    >
      <header className="flex items-center justify-between sticky top-0 bg-white/80 dark:bg-black/60 z-50 py-3 px-4 border-b border-white/20 dark:border-white/10 backdrop-blur-xl shadow-glass-sm -mx-4 transition-all duration-300">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border border-white/20 transition-all">
            <span className="material-symbols-outlined text-text-primary dark:text-white">arrow_back</span>
        </motion.button>
        <h1 className="text-lg font-bold text-text-primary dark:text-white">Relatórios</h1>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowMonthPicker(true)} className="text-text-primary dark:text-white font-bold text-xs bg-white/50 dark:bg-white/10 border border-white/20 px-4 py-2 rounded-full backdrop-blur-md uppercase">
          {(() => {
            const d = new Date();
            return (selectedYear === d.getFullYear() && selectedMonth === d.getMonth())
              ? 'Mês Atual'
              : `${monthNames[selectedMonth]} ${selectedYear}`;
          })()}
        </motion.button>
      </header>

      {showMonthPicker && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-md">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="w-full max-w-md bg-white/90 dark:bg-surface-dark/90 backdrop-blur-xl p-6 rounded-t-3xl border-t border-white/20 shadow-glass-lg">
            <div className="flex items-center justify-between mb-6 border-b border-gray-200/50 dark:border-white/10 pb-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSelectedYear(y => y - 1)} className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined text-text-primary dark:text-white">chevron_left</span>
              </motion.button>
              <div className="px-6 py-2">
                <p className="text-2xl font-bold text-text-primary dark:text-white">{selectedYear}</p>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSelectedYear(y => y + 1)} className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined text-text-primary dark:text-white">chevron_right</span>
              </motion.button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {monthNames.map((m, i) => (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={m}
                  onClick={() => { setSelectedMonth(i); setShowMonthPicker(false); }}
                  className={`px-2 py-3 rounded-xl text-sm font-bold uppercase transition-all ${i === selectedMonth ? 'bg-primary text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 text-text-secondary dark:text-gray-300 hover:bg-black/10'}`}
                >
                  {m}
                </motion.button>
              ))}
            </div>
            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { const d = new Date(); setSelectedYear(d.getFullYear()); setSelectedMonth(d.getMonth()); setShowMonthPicker(false); }} className="flex-1 rounded-xl bg-black/5 dark:bg-white/5 py-3 font-bold uppercase text-text-primary dark:text-white hover:bg-black/10 transition-all">Mês atual</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowMonthPicker(false)} className="flex-1 rounded-xl bg-secondary py-3 font-bold uppercase text-white shadow-lg shadow-secondary/30 transition-all">Fechar</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <section>
        <h2 className="text-xl font-bold mb-6 text-text-primary dark:text-white px-2">Estatísticas</h2>
        <div className="w-full overflow-hidden">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-1 no-scrollbar">
            {/* Card Saídas */}
            <div className="min-w-full snap-center">
              <motion.div
                className="bg-white/60 dark:bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-glass"
                initial={{ x: 0 }}
                whileHover={{ y: -4 }}
              >
                <div className="flex flex-col gap-4 items-center">
                    <div className="w-full border-b border-gray-200/50 dark:border-white/10 pb-4 mb-2">
                      <p className="text-text-secondary dark:text-gray-400 text-xs font-bold text-center uppercase tracking-widest mb-1">Saídas</p>
                      <p className="text-danger text-4xl font-black text-center tracking-tight">{fmtBRL(monthTotal)}</p>
                    </div>
                    
                    <div className="py-4">
                      <Pie data={categories} colors={expenseColors} denominator={monthTotal} />
                    </div>
                    
                    <div className="mt-2 w-full max-h-60 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
                      {categories.length === 0 ? (
                        <div className="h-20 flex items-center justify-center">
                          <p className="text-center text-text-secondary dark:text-gray-400 font-medium text-sm">Sem despesas.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {categories.map((d, i) => (
                            <div key={`${d.name}-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/5">
                              <div className="flex items-center gap-3">
                                  <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: expenseColors[i % expenseColors.length] }}></div>
                                  <p className="text-xs text-text-primary dark:text-white font-bold uppercase truncate max-w-[140px]">{d.name}</p>
                              </div>
                              <p className="text-danger text-xs font-black">- {fmtBRL(d.amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
            </div>
            
            {/* Card Entradas */}
            <div className="min-w-full snap-center">
              <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-glass transition-all hover:-translate-y-1">
                <div className="flex flex-col gap-4 items-center">
                  <div className="w-full border-b border-gray-200/50 dark:border-white/10 pb-4 mb-2">
                    <p className="text-text-secondary dark:text-gray-400 text-xs font-bold text-center uppercase tracking-widest mb-1">Entradas</p>
                    <p className="text-secondary text-4xl font-black text-center tracking-tight">{fmtBRL(incomeTotal)}</p>
                  </div>

                  <div className="py-4">
                    <Pie data={incomeCategories} colors={incomeColors} />
                  </div>

                  <div className="mt-2 w-full max-h-60 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
                    {incomeCategories.length === 0 ? (
                      <div className="h-20 flex items-center justify-center">
                        <p className="text-center text-text-secondary dark:text-gray-400 font-medium text-sm">Sem receitas.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {incomeCategories.map((d, i) => (
                          <div key={`${d.name}-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: incomeColors[i % incomeColors.length] }}></div>
                                <p className="text-xs text-text-primary dark:text-white font-bold uppercase truncate max-w-[140px]">{d.name}</p>
                            </div>
                            <p className="text-secondary text-xs font-black">+ {fmtBRL(d.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budgets */}
      <section>
        <h2 className="text-xl font-bold mb-6 text-text-primary dark:text-white px-2">Orçamentos</h2>
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
              return 'bg-gray-200 dark:bg-gray-700';
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
                  <p className="font-bold text-text-primary dark:text-white uppercase text-xs tracking-wider">{c.name}</p>
                  <p className="text-[10px] text-text-secondary dark:text-white font-bold bg-white/50 dark:bg-black/20 px-2 py-1 rounded-lg backdrop-blur-md">{right}</p>
                </div>
                <div className="h-2 w-full bg-white/30 dark:bg-black/20 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} transition-all duration-500 rounded-full`} style={{ width: `${pct}%` }}></div>
                </div>
              </motion.button>
            );
          })}
          {budgetCats.length === 0 && (
            <div className="bg-white/50 dark:bg-white/5 p-6 rounded-2xl border border-white/20 text-text-secondary dark:text-gray-400 text-center backdrop-blur-md">
              <p className="font-medium">Nenhum orçamento configurado.</p>
            </div>
          )}
        </div>
        {editingCat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-md">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="w-full max-w-md bg-white/90 dark:bg-surface-dark/90 backdrop-blur-xl p-6 rounded-t-3xl border-t border-white/20 shadow-glass-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold uppercase text-text-primary dark:text-white">Definir Limite</h3>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingCat(null)} className="text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all">
                  <span className="material-symbols-outlined">close</span>
                </motion.button>
              </div>
              <p className="text-xs font-bold text-text-secondary uppercase mb-2 bg-accent/20 text-accent inline-block px-2 py-1 rounded-md">{editingCat}</p>
              <input
                type="text"
                value={tempLimit}
                onChange={(e) => setTempLimit(e.target.value)}
                placeholder="EX: 800"
                className="w-full rounded-xl bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 p-4 text-text-primary dark:text-white font-bold placeholder:text-gray-400 focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
              />
              <div className="mt-8 flex gap-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingCat(null)} className="flex-1 rounded-xl bg-gray-100 dark:bg-white/5 py-3 font-bold uppercase text-text-secondary dark:text-white hover:bg-gray-200 transition-all">Cancelar</motion.button>
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
          <h2 className="text-xl font-bold uppercase text-text-primary dark:text-white">Projeção</h2>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/projecao-futura')}
            className="rounded-full p-2 bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border border-white/20 transition-all"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-white">arrow_forward</span>
          </motion.button>
        </div>
        <div className="bg-white/60 dark:bg-black/40 rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-glass backdrop-blur-xl">
          <div className="flex min-w-72 flex-1 flex-col gap-4">
            <div className="border-b border-gray-200/50 dark:border-white/10 pb-4">
                <p className="text-text-secondary dark:text-gray-400 text-xs font-bold uppercase tracking-widest text-center mb-1">Saldo Projetado</p>
                <p className="text-primary text-4xl font-black text-center tracking-tight">{fmtBRL(projection.total)}</p>
            </div>
            
            <div className="flex justify-center gap-2 items-center bg-white/40 dark:bg-white/5 border border-white/20 rounded-xl p-2 backdrop-blur-sm">
              <p className="text-text-secondary dark:text-gray-300 text-[10px] font-bold uppercase">Próximos 3 meses</p>
              <p className={`${projection.percent >= 0 ? 'text-secondary' : 'text-danger'} text-xs font-black bg-white/80 dark:bg-black/40 px-2 py-0.5 rounded-md`}>{`${projection.percent >= 0 ? '+' : ''}${projection.percent.toFixed(1)}%`}</p>
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
                    <stop offset="0%" stopColor="#20BF55" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#20BF55" stopOpacity="0"/>
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
                            <rect x={x-10} y={y-10} width="20" height="20" fill="transparent" />
                            
                            <circle 
                              cx={x} 
                              cy={y} 
                              r={isActive ? 6 : 4} 
                              className={`${isProj ? 'fill-gray-200 dark:fill-gray-700' : 'fill-white dark:fill-surface-dark'} stroke-primary transition-all duration-300`} 
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
              <div className="flex justify-between px-2 border-t border-gray-200/50 dark:border-white/10 pt-3">
                {projection.labels.map((l, i) => {
                  const isActive = hoveredPoint === i || clickedPoint === i;
                  return (
                    <p 
                      key={l} 
                      className={`text-[10px] font-bold uppercase cursor-pointer transition-colors ${isActive ? 'text-primary scale-110' : 'text-text-secondary dark:text-gray-400'}`}
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

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
  const [projection, setProjection] = useState<{ labels: string[]; values: number[]; total: number; percent: number }>({ labels: [], values: [], total: 0, percent: 0 });
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

      const labels = [
        monthNames[(selectedMonth + 0) % 12],
        monthNames[(selectedMonth + 1) % 12],
        monthNames[(selectedMonth + 2) % 12]
      ];
      const proj1 = totalNet * (1 + percent / 100);
      const proj2 = proj1 * (1 + percent / 100);
      const values = [totalNet, proj1, proj2];
      setProjection({ labels, values, total: totalNet, percent });

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
        const palette = ['#8854D0', '#FF6B6B', '#FD9644', '#000000']; // Purple, Red, Orange, Black
        return palette[i % palette.length];
    });
  };
  const incomeColors = useMemo(() => makeIncomeColors(incomeCategories), [incomeCategories]);
  const expenseColors = useMemo(() => makeExpenseColors(categories), [categories]);
  
  const Pie: React.FC<{ data: { name: string; amount: number }[]; colors: string[]; size?: number; thickness?: number; denominator?: number }> = ({ data, colors, size = 200, thickness = 30, denominator }) => {
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
      return { p, path, color: colors[i % colors.length], rx, ry };
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
          <circle cx="4" cy="4" r={R} fill="black" />
          
          {slices.map((s, i) => (
            <g key={i}>
              <path d={s.path} fill={s.color} stroke="black" strokeWidth="3" />
              {s.p > 0.05 && (
                <g>
                    <rect x={s.rx - 18} y={s.ry - 8} width="36" height="16" fill="white" stroke="black" strokeWidth="2" />
                    <text x={s.rx} y={s.ry} fill="#000" fontSize={10} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
                    {(s.p * 100).toFixed(0)}%
                    </text>
                </g>
              )}
            </g>
          ))}
          <circle cx="0" cy="0" r={R} fill="none" stroke="black" strokeWidth="3" />
        </g>
      </svg>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col min-h-screen p-4 pb-28 gap-8 bg-background-dark font-display"
    >
      <header className="flex items-center justify-between sticky top-0 bg-white z-10 py-3 px-4 border-b-3 border-dark shadow-sm -mx-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-dark hover:bg-surface-light shadow-neo-sm active:shadow-none active:translate-y-[2px] transition-all">
            <span className="material-symbols-outlined text-dark">arrow_back</span>
        </button>
        <h1 className="text-xl font-black uppercase text-dark">Relatórios</h1>
        <button onClick={() => setShowMonthPicker(true)} className="text-dark font-bold text-xs bg-accent border-2 border-dark px-3 py-2 rounded-sm shadow-neo-sm uppercase active:shadow-none active:translate-y-[2px] transition-all">
          {(() => {
            const d = new Date();
            return (selectedYear === d.getFullYear() && selectedMonth === d.getMonth())
              ? 'Mês Atual'
              : `${monthNames[selectedMonth]} ${selectedYear}`;
          })()}
        </button>
      </header>

      {showMonthPicker && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="w-full max-w-md bg-white p-6 border-t-4 border-x-4 border-dark shadow-[0_-4px_0px_0px_#000000]">
            <div className="flex items-center justify-between mb-6 border-b-2 border-dark pb-2">
              <button onClick={() => setSelectedYear(y => y - 1)} className="rounded-sm p-1 border-2 border-dark hover:bg-surface-light shadow-neo-sm active:shadow-none transition-all">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <p className="text-xl font-black text-dark">{selectedYear}</p>
              <button onClick={() => setSelectedYear(y => y + 1)} className="rounded-sm p-1 border-2 border-dark hover:bg-surface-light shadow-neo-sm active:shadow-none transition-all">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {monthNames.map((m, i) => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(i); setShowMonthPicker(false); }}
                  className={`px-2 py-3 rounded-sm text-sm font-black uppercase border-2 border-dark shadow-neo-sm active:shadow-none active:translate-y-[2px] transition-all ${i === selectedMonth ? 'bg-primary text-white' : 'bg-white text-dark hover:bg-surface-light'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { const d = new Date(); setSelectedYear(d.getFullYear()); setSelectedMonth(d.getMonth()); setShowMonthPicker(false); }} className="flex-1 rounded-sm bg-white border-2 border-dark py-3 font-black uppercase shadow-neo hover:bg-surface-light active:shadow-none active:translate-y-[2px] transition-all">Mês atual</button>
              <button onClick={() => setShowMonthPicker(false)} className="flex-1 rounded-sm bg-secondary border-2 border-dark py-3 font-black uppercase text-white shadow-neo active:shadow-none active:translate-y-[2px] transition-all">Fechar</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <section>
        <h2 className="text-2xl font-black mb-6 text-center uppercase text-dark bg-white border-2 border-dark p-2 shadow-neo inline-block mx-auto transform -rotate-1">Estatísticas</h2>
        <div className="w-full">
        <div className="flex flex-col gap-8">
          <div className="w-full">
            <motion.div
              className="bg-white rounded-lg p-6 border-3 border-dark shadow-neo"
              initial={{ x: 0 }}
              whileHover={{ translate: "2px 2px", boxShadow: "0px 0px 0px 0px #000" }}
            >
              <div className="flex flex-col gap-4 items-center">
                  <div className="w-full border-b-3 border-dark pb-2 mb-2">
                    <p className="text-dark text-sm font-black text-center uppercase tracking-widest">Saídas</p>
                    <p className="text-danger text-4xl font-black text-center mt-1">{fmtBRL(monthTotal)}</p>
                  </div>
                  
                  <div className="py-4">
                    <Pie data={categories} colors={expenseColors} denominator={monthTotal} />
                  </div>
                  
                  <div className="mt-2 w-full max-h-60 overflow-y-auto overscroll-contain pr-1 border-2 border-dark bg-surface-light p-2 shadow-inner">
                    {categories.length === 0 ? (
                      <div className="h-20 flex items-center justify-center">
                        <p className="text-center text-dark font-bold uppercase text-xs">Sem despesas.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {categories.map((d, i) => (
                          <div key={`${d.name}-${i}`} className="flex items-center justify-between bg-white border-2 border-dark p-2 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-6 border-2 border-dark" style={{ backgroundColor: expenseColors[i % expenseColors.length] }}></div>
                                <p className="text-xs text-dark font-bold uppercase truncate max-w-[120px]">{d.name}</p>
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
            
            <div className="w-full">
              <div className="bg-white rounded-lg p-6 border-3 border-dark shadow-neo hover:shadow-none hover:translate-y-[2px] transition-all">
                <div className="flex flex-col gap-4 items-center">
                  <div className="w-full border-b-3 border-dark pb-2 mb-2">
                    <p className="text-dark text-sm font-black text-center uppercase tracking-widest">Entradas</p>
                    <p className="text-secondary text-4xl font-black text-center mt-1">{fmtBRL(incomeTotal)}</p>
                  </div>

                  <div className="py-4">
                    <Pie data={incomeCategories} colors={incomeColors} />
                  </div>

                  <div className="mt-2 w-full max-h-60 overflow-y-auto overscroll-contain pr-1 border-2 border-dark bg-surface-light p-2 shadow-inner">
                    {incomeCategories.length === 0 ? (
                      <div className="h-20 flex items-center justify-center">
                        <p className="text-center text-dark font-bold uppercase text-xs">Sem receitas.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {incomeCategories.map((d, i) => (
                          <div key={`${d.name}-${i}`} className="flex items-center justify-between bg-white border-2 border-dark p-2 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-6 border-2 border-dark" style={{ backgroundColor: incomeColors[i % incomeColors.length] }}></div>
                                <p className="text-xs text-dark font-bold uppercase truncate max-w-[120px]">{d.name}</p>
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
        <h2 className="text-2xl font-black mb-6 text-center uppercase text-dark bg-white border-2 border-dark p-2 shadow-neo inline-block mx-auto transform rotate-1">Orçamentos</h2>
        <div className="flex flex-col gap-4">
          {budgetCats.map((c) => {
            const limit = Number(budgets[c.name] || 0);
            const spent = Number(c.amount || 0);
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            const barColor = (() => {
              if (limit > 0) {
                if (spent < limit) return 'bg-accent';
                if (spent === limit) return 'bg-secondary';
                return 'bg-danger';
              }
              return 'bg-surface-light';
            })();
            const right = limit > 0 ? `${fmtBRL(spent)} / ${fmtBRL(limit)}` : `${fmtBRL(spent)} / --`;
            
            return (
              <button
                key={c.name}
                onClick={() => { setEditingCat(c.name); setTempLimit(limit ? String(limit) : ''); }}
                className="group relative bg-white border-2 border-dark p-4 shadow-neo active:shadow-none active:translate-y-[2px] transition-all"
              >
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <p className="font-black text-dark uppercase text-sm">{c.name}</p>
                  <p className="text-xs text-dark font-bold bg-white border-2 border-dark px-2 py-1">{right}</p>
                </div>
                <div className="h-4 w-full border-2 border-dark bg-white relative">
                  <div className={`h-full border-r-2 border-dark ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                </div>
              </button>
            );
          })}
          {budgetCats.length === 0 && (
            <div className="bg-white p-6 border-2 border-dark shadow-neo text-dark">
              <p className="text-center font-bold uppercase">Nenhum orçamento.</p>
            </div>
          )}
        </div>
        {editingCat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="w-full max-w-md bg-white p-6 border-t-4 border-x-4 border-dark shadow-[0_-4px_0px_0px_#000000]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black uppercase">Definir Limite</h3>
                <button onClick={() => setEditingCat(null)} className="text-dark hover:bg-surface-light p-1 border-2 border-transparent hover:border-dark transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-sm font-bold text-dark uppercase mb-2 bg-accent inline-block px-2 border-2 border-dark">{editingCat}</p>
              <input
                type="text"
                value={tempLimit}
                onChange={(e) => setTempLimit(e.target.value)}
                placeholder="EX: 800"
                className="w-full rounded-none bg-white border-2 border-dark p-4 text-dark font-bold placeholder:text-text-secondary/50 focus:shadow-neo-sm focus:outline-none transition-all"
              />
              <div className="mt-8 flex gap-3">
                <button onClick={() => setEditingCat(null)} className="flex-1 rounded-sm bg-white border-2 border-dark py-3 font-black uppercase shadow-neo hover:bg-surface-light active:shadow-none active:translate-y-[2px] transition-all">Cancelar</button>
                <button
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
                  className="flex-1 rounded-sm bg-primary border-2 border-dark py-3 font-black text-white uppercase shadow-neo active:shadow-none active:translate-y-[2px] transition-all"
                >
                  Salvar
                </button>
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
        className="fixed bottom-24 right-4 h-16 w-16 rounded-sm bg-primary text-white flex items-center justify-center border-3 border-dark shadow-neo z-40 active:shadow-none active:translate-y-[4px] transition-all"
      >
        <span className="material-symbols-outlined !text-3xl">auto_awesome</span>
      </motion.button>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black uppercase text-dark bg-white border-2 border-dark p-2 shadow-neo flex-1 text-center mr-4">Projeção</h2>
          <button 
            onClick={() => navigate('/projecao-futura')}
            className="rounded-sm p-2 bg-white border-2 border-dark shadow-neo active:shadow-none active:translate-y-[2px] transition-all"
          >
            <span className="material-symbols-outlined text-dark">arrow_forward</span>
          </button>
        </div>
        <div className="bg-white rounded-lg p-6 border-3 border-dark shadow-neo">
          <div className="flex min-w-72 flex-1 flex-col gap-4">
            <div className="border-b-3 border-dark pb-4">
                <p className="text-dark text-sm font-black uppercase tracking-widest text-center mb-1">Saldo Projetado</p>
                <p className="text-primary text-4xl font-black text-center">{fmtBRL(projection.total)}</p>
            </div>
            
            <div className="flex justify-center gap-2 items-center bg-surface-light border-2 border-dark p-2">
              <p className="text-dark text-xs font-bold uppercase">Próximos 3 meses</p>
              <p className={`${projection.percent >= 0 ? 'text-secondary' : 'text-danger'} text-sm font-black bg-white border-2 border-dark px-1`}>{`${projection.percent >= 0 ? '+' : ''}${projection.percent.toFixed(1)}%`}</p>
            </div>

            <div className="flex min-h-[180px] flex-1 flex-col gap-4 py-4 relative">
              <svg fill="none" height="150" preserveAspectRatio="none" viewBox="-5 0 482 150" width="100%" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
                <defs>
                  <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="10" style={{stroke: '#20BF55', strokeWidth: 2}} />
                  </pattern>
                </defs>
                {/* Area preenchida com hachura */}
                <path d={`M0 149 ${linePath.replace(/^M[^ ]+ [^ ]+/, '')} L 475 149 Z`} fill="url(#diagonalHatch)" opacity="0.2" />
                
                {/* Linha principal grossa e preta */}
                <path d={linePath} stroke="black" strokeLinecap="square" strokeWidth="6" />
                <path d={linePath} stroke="#20BF55" strokeLinecap="square" strokeWidth="3" />
                
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
                    return (
                        <g key={i}>
                            <rect x={x-6} y={y-6} width="12" height="12" fill="white" stroke="black" strokeWidth="2" />
                        </g>
                    );
                })}
              </svg>
              <div className="flex justify-between px-2 border-t-3 border-dark pt-2">
                {projection.labels.map((l) => (
                  <p key={l} className="text-dark text-xs font-black uppercase">{l}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

    </motion.div>
  );
};

export default Reports;

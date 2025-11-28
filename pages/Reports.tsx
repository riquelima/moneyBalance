import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

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
  const budgetNames = ['Moradia','Contas da casa','Alimentação','Transporte','Saúde','Educação e desenvolvimento','Lazer e social','Imprevistos','Investimentos / economias','Salário','Rendimentos','Dinheiro Extra'];
  const budgetCats = useMemo(() => budgetNames.map(n => ({ name: n, amount: (categories.find(c => c.name === n)?.amount || 0) })), [categories]);

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

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col min-h-screen p-4 pb-28 gap-8"
    >
      <header className="flex items-center justify-between sticky top-0 bg-background-dark z-10 py-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold">Relatórios</h1>
        <button onClick={() => setShowMonthPicker(true)} className="text-primary-green font-bold text-sm bg-primary-green/10 px-3 py-1 rounded-full">
          {(() => {
            const d = new Date();
            return (selectedYear === d.getFullYear() && selectedMonth === d.getMonth())
              ? 'Este Mês'
              : `${monthNames[selectedMonth]} ${selectedYear}`;
          })()}
        </button>
      </header>

      {showMonthPicker && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60">
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="w-full max-w-md rounded-2xl bg-background-dark p-6 border border-surface-light">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSelectedYear(y => y - 1)} className="rounded-full p-2 hover:bg-surface-light">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <p className="text-sm font-bold">{selectedYear}</p>
              <button onClick={() => setSelectedYear(y => y + 1)} className="rounded-full p-2 hover:bg-surface-light">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {monthNames.map((m, i) => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(i); setShowMonthPicker(false); }}
                  className={`px-3 py-2 rounded-lg text-sm border ${i === selectedMonth ? 'bg-primary-green text-background-dark border-primary-green' : 'border-surface-light text-text-secondary hover:text-white'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => { const d = new Date(); setSelectedYear(d.getFullYear()); setSelectedMonth(d.getMonth()); setShowMonthPicker(false); }} className="flex-1 rounded-xl bg-surface-light py-3 font-bold">Mês atual</button>
              <button onClick={() => setShowMonthPicker(false)} className="flex-1 rounded-xl bg-primary-green py-3 font-bold text-background-dark">Fechar</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <section>
        <h2 className="text-2xl font-bold mb-4 text-center">Visão Geral das Receitas</h2>
        <div className="bg-surface-dark rounded-2xl p-6 border border-surface-light shadow-lg shadow-primary-green/5">
          <div className="flex flex-col gap-2 items-center">
            <p className="text-text-secondary text-base font-medium text-center">Receitas por Categoria</p>
            <p className="text-white text-3xl font-bold text-center">{fmtBRL(incomeTotal)}</p>
            <div className="flex gap-1 justify-center">
              <p className="text-text-secondary text-base">Mês Atual</p>
              <p className={`${incomeChangePct >= 0 ? 'text-primary-green' : 'text-danger'} text-base font-medium`}>{`${incomeChangePct >= 0 ? '+' : ''}${incomeChangePct.toFixed(1)}%`}</p>
            </div>
            <div className="grid min-h-[180px] grid-flow-col gap-4 grid-rows-[1fr_auto] items-end justify-items-center px-1 pt-4">
              {topIncomeCats.map((c) => {
                const max = topIncomeCats.length ? Math.max(...topIncomeCats.map(x => x.amount)) : 1;
                const pct = Math.round((c.amount / (max || 1)) * 100);
                const h = Math.max(10, Math.min(100, pct));
                return (
                  <div key={c.name} className="w-full flex flex-col items-center justify-end gap-2">
                    <div className="bg-primary-green/30 w-full rounded-t-md" style={{ height: `${h}%` }}></div>
                    <p className="text-text-secondary text-[13px] font-bold tracking-[0.015em]">{c.name}</p>
                    <p className="text-success text-[13px] font-bold">+ {fmtBRL(c.amount)}</p>
                  </div>
                );
              })}
              {topIncomeCats.length === 0 && (
                <p className="col-span-4 text-text-secondary text-sm">Sem receitas neste mês.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-center">Visão Geral das Despesas</h2>
        <div className="bg-surface-dark rounded-2xl p-6 border border-surface-light shadow-lg shadow-primary-green/5">
          {hasData ? (
            <div className="flex flex-col gap-2 items-center">
              <p className="text-text-secondary text-base font-medium text-center">Despesas por Categoria</p>
              <p className="text-white text-3xl font-bold text-center">{fmtBRL(monthTotal)}</p>
              <div className="flex gap-1 justify-center">
                <p className="text-text-secondary text-base">Mês Atual</p>
                <p className={`${changePct >= 0 ? 'text-primary-green' : 'text-danger'} text-base font-medium`}>{`${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`}</p>
              </div>
              <div className="grid min-h-[180px] grid-flow-col gap-4 grid-rows-[1fr_auto] items-end justify-items-center px-1 pt-4">
                {topCats.map((c) => {
                  const max = topCats.length ? Math.max(...topCats.map(x => x.amount)) : 1;
                  const pct = Math.round((c.amount / (max || 1)) * 100);
                  const h = Math.max(10, Math.min(100, pct));
                  return (
                    <div key={c.name} className="w-full flex flex-col items-center justify-end gap-2">
                      <div className="bg-primary-green/30 w-full rounded-t-md" style={{ height: `${h}%` }}></div>
                      <p className="text-text-secondary text-[13px] font-bold tracking-[0.015em]">{c.name}</p>
                      <p className="text-danger text-[13px] font-bold">- {fmtBRL(c.amount)}</p>
                    </div>
                  );
                })}
                {topCats.length === 0 && (
                  <p className="col-span-4 text-text-secondary text-sm">Sem despesas neste mês.</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-text-secondary font-medium">Sem dados</p>
              <p className="text-3xl font-bold mt-1 text-white">R$ 0,00</p>
              <p className="mt-2 text-text-secondary">Adicione transações para visualizar seus relatórios.</p>
            </>
          )}
        </div>
      </section>

      {/* Budgets */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-center">Orçamentos</h2>
        <div className="flex flex-col gap-4 max-h-72 overflow-y-auto no-scrollbar pr-1">
          {budgetCats.map((c) => {
            const limit = Number(budgets[c.name] || 0);
            const spent = Number(c.amount || 0);
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            const bar = pct >= 90 ? 'bg-warning' : 'bg-primary-green';
            const right = limit > 0 ? `${fmtBRL(spent)} / ${fmtBRL(limit)}` : `${fmtBRL(spent)} / Definir`;
            return (
              <button
                key={c.name}
                onClick={() => { setEditingCat(c.name); setTempLimit(limit ? String(limit) : ''); }}
                className="rounded-xl bg-surface-dark p-4 border border-surface-light text-text-primary text-left hover:border-text-secondary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-sm text-text-secondary font-medium">{right}</p>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-surface-light">
                  <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }}></div>
                </div>
              </button>
            );
          })}
          {budgetCats.length === 0 && (
            <div className="rounded-xl bg-surface-dark p-4 border border-surface-light text-text-secondary">
              <p className="text-center">Nenhum orçamento cadastrado.</p>
            </div>
          )}
        </div>
        {editingCat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60">
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="w-full max-w-md rounded-2xl bg-background-dark p-6 border border-surface-light">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Definir limite</h3>
                <button onClick={() => setEditingCat(null)} className="text-text-secondary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-sm text-text-secondary mb-3">{editingCat}</p>
              <input
                type="text"
                value={tempLimit}
                onChange={(e) => setTempLimit(e.target.value)}
                placeholder="Ex: 800"
                className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="mt-6 mb-1 flex gap-3">
                <button onClick={() => setEditingCat(null)} className="flex-1 rounded-xl bg-surface-light py-3 font-bold">Cancelar</button>
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
                  className="flex-1 rounded-xl bg-primary-green py-3 font-bold text-background-dark"
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
        whileHover={{ scale: 1.1, rotate: 10 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/chat')}
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-primary-green text-background-dark flex items-center justify-center shadow-lg shadow-primary-green/40 z-40"
      >
        <span className="material-symbols-outlined !text-2xl">auto_awesome</span>
      </motion.button>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-center">Projeções Futuras</h2>
        <div className="bg-surface-dark rounded-2xl p-6 border border-surface-light shadow-lg shadow-primary-green/5">
          <div className="flex min-w-72 flex-1 flex-col gap-2">
            <p className="text-text-secondary text-base font-medium">Projeção de Saldo</p>
            <p className="text-white text-3xl font-bold truncate">{fmtBRL(projection.total)}</p>
            <div className="flex gap-1">
              <p className="text-text-secondary text-base">Próximos 3 meses</p>
              <p className={`${projection.percent >= 0 ? 'text-primary-green' : 'text-danger'} text-base font-medium`}>{`${projection.percent >= 0 ? '+' : ''}${projection.percent.toFixed(1)}%`}</p>
            </div>
            <div className="flex min-h-[180px] flex-1 flex-col gap-8 py-4">
              <svg fill="none" height="148" preserveAspectRatio="none" viewBox="-3 0 478 150" width="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#13ec5b" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#13ec5b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`M0 149 ${linePath.replace(/^M[^ ]+ [^ ]+/, '')} L 475 149 Z`} fill="url(#lineFill)" />
                <path d={linePath} stroke="#13ec5b" strokeLinecap="round" strokeWidth="3" />
              </svg>
              <div className="flex justify-around">
                {projection.labels.map((l) => (
                  <p key={l} className="text-text-secondary text-[13px] font-bold tracking-[0.015em]">{l}</p>
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

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

  useEffect(() => {
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
      const now = new Date();
      const startCur = new Date(now.getFullYear(), now.getMonth(), 1);
      const endCur = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrev = new Date(now.getFullYear(), now.getMonth(), 0);

      const { data: curTx } = await supabase
        .from('user_transactions')
        .select('amount, type, date, category_id')
        .eq('user_id', user.id)
        .gte('date', fmt(startCur))
        .lte('date', fmt(endCur));

      const { data: prevTx } = await supabase
        .from('user_transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', fmt(startPrev))
        .lte('date', fmt(endPrev));

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

      const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const labels = [
        monthNames[now.getMonth()],
        monthNames[(now.getMonth() + 1) % 12],
        monthNames[(now.getMonth() + 2) % 12]
      ];
      const proj1 = totalNet * (1 + percent / 100);
      const proj2 = proj1 * (1 + percent / 100);
      const values = [totalNet, proj1, proj2];
      setProjection({ labels, values, total: totalNet, percent });

      setHasData(((curTx || []).length + (prevTx || []).length) > 0);
    };
    load();
  }, []);

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const changePct = useMemo(() => {
    if (!lastMonthTotal) return 0;
    return ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  }, [monthTotal, lastMonthTotal]);
  const topCats = useMemo(() => categories.slice(0, 4), [categories]);
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
        <button className="text-primary-green font-bold text-sm bg-primary-green/10 px-3 py-1 rounded-full">Este Mês</button>
      </header>

      <section>
        <h2 className="text-2xl font-bold mb-4">Visão Geral das Despesas</h2>
        <div className="bg-surface-dark rounded-2xl p-6 border border-surface-light shadow-lg shadow-primary-green/5">
          {hasData ? (
            <div className="flex flex-col gap-2">
              <p className="text-text-secondary text-base font-medium">Despesas por Categoria</p>
              <p className="text-white text-3xl font-bold">{fmtBRL(monthTotal)}</p>
              <div className="flex gap-1">
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
        <h2 className="text-2xl font-bold mb-4">Orçamentos</h2>
        <div className="rounded-xl bg-surface-dark p-4 border border-surface-light text-text-secondary">
          <p className="text-center">Nenhum orçamento cadastrado.</p>
        </div>
      </section>

      {/* AI FAB */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 10 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/chat')}
        className="fixed bottom-24 right-4 h-16 w-16 rounded-full bg-primary-green text-background-dark flex items-center justify-center shadow-lg shadow-primary-green/40 z-40"
      >
        <span className="material-symbols-outlined !text-3xl">auto_awesome</span>
      </motion.button>

      <section>
        <h2 className="text-2xl font-bold mb-4">Projeções Futuras</h2>
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

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [summary, setSummary] = useState({ income: 0, expense: 0, pending: 0, balance: 0, paid: 0 });
  const [displayName, setDisplayName] = useState<string>('Usuário');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const [chart, setChart] = useState<{ values: number[]; labels: string[]; raw?: number[] }>({ values: [], labels: [] });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [incomeItems, setIncomeItems] = useState<any[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [entriesCollapsed, setEntriesCollapsed] = useState<boolean>(false);
  const [expensesCollapsed, setExpensesCollapsed] = useState<boolean>(false);
  const labelForDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const ytd = new Date(); ytd.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Hoje';
    if (sameDay(d, ytd)) return 'Ontem';
    return d.toLocaleDateString('pt-BR');
  };

  const dataMap: Record<'day' | 'month', { values: number[]; labels: string[]; raw?: number[] }> = {
    day: {
      values: Array(7).fill(6),
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      raw: Array(7).fill(0)
    },
    month: {
      values: Array(12).fill(6),
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      raw: Array(12).fill(0)
    }
  };

  const getWeeksOfMonth = (year: number, month: number): { values: number[]; labels: string[]; raw: number[] } => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDowMonday = (first.getDay() + 6) % 7;
    const daysInMonth = last.getDate();
    const weeks = Math.ceil((startDowMonday + daysInMonth) / 7);
    const labels = Array.from({ length: weeks }, (_, i) => `Sem${i + 1}`);
    const values = Array.from({ length: weeks }, () => 6);
    const raw = Array(weeks).fill(0);
    return { values, labels, raw };
  };

  const last12MonthsLabels = (): string[] => monthNames.slice();

  const current = chart.labels.length ? chart : (
    period === 'week'
      ? getWeeksOfMonth(selectedYear, selectedMonth)
      : (period === 'month'
          ? { labels: last12MonthsLabels(), values: Array(12).fill(6), raw: Array(12).fill(0) }
          : dataMap.day)
  );
  const now = new Date();
  const highlightIndex = period === 'month' ? selectedMonth : 3;

  useEffect(() => {
    const loadSummary = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      const startCur = new Date(selectedYear, selectedMonth, 1);
      const endCur = new Date(selectedYear, selectedMonth + 1, 0);
      const { data: tx } = await supabase
        .from('user_transactions')
        .select('amount, type, is_paid, date')
        .eq('user_id', user.id)
        .gte('date', fmt(startCur))
        .lte('date', fmt(endCur));
      const income = (tx || []).filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0);
      const expense = (tx || []).filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0);
      const pending = (tx || []).filter((t: any) => t.type === 'expense' && !t.is_paid).reduce((a: number, t: any) => a + Number(t.amount), 0);
      const paid = (tx || []).filter((t: any) => t.type === 'expense' && t.is_paid).reduce((a: number, t: any) => a + Number(t.amount), 0);
      const balance = income - expense;
      setSummary({ income, expense, pending, balance, paid });
    };

    const loadProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const metaName = (user.user_metadata?.name as string) || '';
        const metaLast = (user.user_metadata?.lastName as string) || '';
        const metaUsername = (user.user_metadata?.username as string) || '';
        const candidate = metaName || metaUsername || user.email || 'Usuário';
        // Try user_profiles if available
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        setDisplayName((prof?.display_name as string) || (metaName && metaLast ? `${metaName} ${metaLast}` : candidate));
        if (prof?.avatar_url) setAvatarUrl(prof.avatar_url as string);
      }
    };

    loadSummary();
    loadProfile();
  }, [location.key, selectedYear, selectedMonth]);

  useEffect(() => {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const parseLocal = (s: string) => {
      const [y, m, dd] = String(s).split('-').map(Number);
      return new Date(y, m - 1, dd);
    };
    const normalize = (vals: number[]) => {
      const max = Math.max(0, ...vals);
      if (max === 0) return vals.map(() => 0);
      return vals.map(v => (v === 0 ? 0 : Math.max(6, Math.round((v / max) * 100))));
    };
    const buildChart = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (period === 'month') setChart({ labels: last12MonthsLabels(), values: Array(12).fill(6) });
        else if (period === 'week') setChart(getWeeksOfMonth(selectedYear, selectedMonth));
        else setChart(dataMap.day);
        return;
      }
      if (period === 'day') {
        const today = new Date();
        const mondayOffset = (today.getDay() + 6) % 7;
        const start = new Date(today);
        start.setDate(today.getDate() - mondayOffset);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const { data } = await supabase
          .from('user_transactions')
          .select('amount, date, type')
          .eq('user_id', user.id)
          .eq('type', chartType)
          .gte('date', fmt(start))
          .lte('date', fmt(end));
        const vals = Array(7).fill(0);
        (data || []).forEach((t: any) => {
          const d = parseLocal(t.date);
          const idx = (d.getDay() + 6) % 7; // Mon=0
          vals[idx] += Number(t.amount || 0);
        });
        setChart({ labels: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'], values: normalize(vals), raw: vals });
      } else if (period === 'week') {
        const first = new Date(selectedYear, selectedMonth, 1);
        const last = new Date(selectedYear, selectedMonth + 1, 0);
        const startDowMonday = (first.getDay() + 6) % 7;
        const daysInMonth = last.getDate();
        const weeks = Math.ceil((startDowMonday + daysInMonth) / 7);
        const labels = Array.from({ length: weeks }, (_, i) => `Sem${i + 1}`);
        const { data } = await supabase
          .from('user_transactions')
          .select('amount, date, type')
          .eq('user_id', user.id)
          .eq('type', chartType)
          .gte('date', fmt(first))
          .lte('date', fmt(last));
        const vals = Array(weeks).fill(0);
        (data || []).forEach((t: any) => {
          const d = parseLocal(t.date);
          // week index within month
          const dayIndex = d.getDate();
          const totalOffset = startDowMonday + dayIndex - 1;
          const w = Math.floor(totalOffset / 7);
          vals[w] += Number(t.amount || 0);
        });
        setChart({ labels, values: normalize(vals), raw: vals });
      } else {
        const from = new Date(selectedYear, 0, 1);
        const to = new Date(selectedYear, 11, 31);
        const { data } = await supabase
          .from('user_transactions')
          .select('amount, date, type')
          .eq('user_id', user.id)
          .eq('type', chartType)
          .gte('date', fmt(from))
          .lte('date', fmt(to));
        const labels = last12MonthsLabels();
        const vals = Array(12).fill(0);
        (data || []).forEach((t: any) => {
          const d = parseLocal(t.date);
          const idx = d.getMonth();
          vals[idx] += Number(t.amount || 0);
        });
        setChart({ labels, values: normalize(vals), raw: vals });
      }
    };
    buildChart();
  }, [period, selectedYear, selectedMonth, chartType]);

  useEffect(() => {
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    const loadMonthLists = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { setIncomeItems([]); setExpenseItems([]); return; }
      const startCur = new Date(selectedYear, selectedMonth, 1);
      const endCur = new Date(selectedYear, selectedMonth + 1, 0);
      const { data } = await supabase
        .from('user_transactions')
        .select('id, description, amount, type, date, is_paid')
        .eq('user_id', user.id)
        .gte('date', fmt(startCur))
        .lte('date', fmt(endCur))
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });
      const arr = (data || []) as any[];
      setIncomeItems(arr.filter(t => t.type === 'income'));
      setExpenseItems(arr.filter(t => t.type === 'expense'));
    };
    loadMonthLists();
  }, [location.key, selectedYear, selectedMonth]);


  

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const entriesRef = useRef<HTMLDivElement | null>(null);
  const expensesRef = useRef<HTMLDivElement | null>(null);
  const scrollTo = (ref: React.MutableRefObject<HTMLDivElement | null>) => {
    const el = ref.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col p-4 pt-6 gap-4"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            {avatarUrl && (
              <img 
                src={avatarUrl}
                alt="Profile" 
                className="h-12 w-12 rounded-full border-2 border-primary object-cover"
                onClick={() => navigate('/settings')}
              />
            )}
            <div>
                <p className="text-sm font-medium text-text-secondary">Bem-vindo(a),</p>
                <h1 className="text-xl font-bold text-text-primary">{displayName}</h1>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-surface-light transition-colors">
                <span className="material-symbols-outlined text-text-secondary">notifications</span>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-background-dark"></span>
            </button>
            <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-surface-light transition-colors">
                <span className="material-symbols-outlined text-text-secondary">settings</span>
            </button>
        </div>
      </header>

      <div className="flex items-center justify-end mt-2">
        <button
          onClick={() => setShowMonthPicker(s => !s)}
          className="text-primary-green font-bold text-sm bg-primary-green/10 px-3 py-1 rounded-full"
        >{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</button>
      </div>
      {showMonthPicker && (
        <div className="flex justify-center">
          <div className="mt-2 w-full max-w-[680px] mx-2 rounded-xl bg-surface-dark p-3 border border-surface-light">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 rounded-full hover:bg-surface-light"><span className="material-symbols-outlined">chevron_left</span></button>
              <span className="text-sm font-bold">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 rounded-full hover:bg-surface-light"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {monthNames.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(idx); setShowMonthPicker(false); }}
                  className={idx === selectedMonth ? 'px-3 py-2 rounded-lg bg-primary text-background-dark text-xs font-bold' : 'px-3 py-2 rounded-lg bg-surface-light text-xs font-medium hover:bg-surface-light/80'}
                >{m}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <motion.section 
        variants={itemVariants}
        className="rounded-lg bg-white p-6 border-3 border-dark shadow-neo"
      >
        <p className="text-sm font-bold text-dark mb-1 text-center uppercase tracking-widest">Total de Saldo</p>
        <h2 className="text-4xl font-black tracking-tight text-dark text-center">{formatBRL(summary.balance)}</h2>
      </motion.section>

      <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
        {[
          { label: 'Entradas', value: formatBRL(summary.income), icon: 'arrow_downward', color: 'text-dark' },
          { label: 'Saídas', value: formatBRL(summary.expense), icon: 'arrow_upward', color: 'text-dark' },
          { label: 'Não Pagos', value: formatBRL(summary.pending), icon: 'hourglass_empty', color: 'text-dark' },
          { label: 'Já pagos', value: formatBRL(summary.paid), icon: 'account_balance_wallet', color: 'text-dark' },
        ].map((item, idx) => (
          <motion.div 
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (item.label === 'Entradas') scrollTo(entriesRef);
                else if (item.label === 'Saídas') scrollTo(expensesRef);
                else if (item.label === 'Não Pagos') navigate(`/transactions?status=pending&type=expense&month=${selectedMonth}`);
                else if (item.label === 'Já pagos') navigate(`/transactions?status=paid&type=expense&month=${selectedMonth}`);
                else navigate('/reports');
              }}
              className="rounded-lg bg-white p-4 border-2 border-dark shadow-neo hover:shadow-none hover:translate-y-[2px] transition-all cursor-pointer"
          >
              <div className={`flex items-center gap-2 ${item.color} mb-2`}>
                  {item.label === 'Já pagos' ? (
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                  ) : item.label === 'Não Pagos' ? (
                    <span className="material-symbols-outlined text-xl">pending</span>
                  ) : (
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  )}
                  <p className="text-xs font-black uppercase tracking-wider text-dark">{item.label}</p>
              </div>
              <p className="text-lg font-black text-dark">{item.value}</p>
          </motion.div>
        ))}
      </motion.section>

      <motion.section variants={itemVariants}>
        <div className="mb-4 px-4">
            <h3 className="text-lg font-black uppercase text-dark">Gráficos</h3>
            <div className="mt-2 flex items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-1 rounded-lg bg-white p-1 border-2 border-dark shadow-neo-sm">
                <button
                  onClick={() => setPeriod('day')}
                  className={period === 'day' ? 'rounded-sm border-2 border-dark px-3 py-1 text-xs font-bold text-white bg-dark shadow-none' : 'rounded-sm px-3 py-1 text-xs font-bold text-dark hover:bg-surface-light'}
                >DIA</button>
                <button
                  onClick={() => setPeriod('week')}
                  className={period === 'week' ? 'rounded-sm border-2 border-dark px-3 py-1 text-xs font-bold text-white bg-dark shadow-none' : 'rounded-sm px-3 py-1 text-xs font-bold text-dark hover:bg-surface-light'}
                >SEM</button>
                <button
                  onClick={() => setPeriod('month')}
                  className={period === 'month' ? 'rounded-sm border-2 border-dark px-3 py-1 text-xs font-bold text-white bg-dark shadow-none' : 'rounded-sm px-3 py-1 text-xs font-bold text-dark hover:bg-surface-light'}
                >MÊS</button>
              </div>
              <button
                onClick={() => setChartType(t => (t === 'expense' ? 'income' : 'expense'))}
                className={chartType === 'expense' ? 'rounded-sm border-2 border-dark px-3 py-1 text-xs font-bold text-white bg-primary shadow-neo-sm active:shadow-none active:translate-y-[2px] transition-all' : 'rounded-sm border-2 border-dark px-3 py-1 text-xs font-bold text-white bg-secondary shadow-neo-sm active:shadow-none active:translate-y-[2px] transition-all'}
              >{chartType === 'expense' ? 'SAÍDAS' : 'ENTRADAS'}</button>
            </div>
        </div>
        
        <div className="flex h-56 w-full flex-col justify-end rounded-lg bg-white p-4 border-2 border-dark shadow-neo relative overflow-visible">
            <div className="grid h-full w-full items-end gap-1" style={{ gridTemplateColumns: `repeat(${current.labels.length}, minmax(0, 1fr))` }}>
              {current.values.map((h, i) => {
                const rawVal = (chart.raw || current.raw || [])[i] || 0;
                const labelText = formatBRL(rawVal);
                const charCount = labelText.replace(/\s/g, '').length;
                const minPx = Math.min(180, Math.max(36, Math.ceil(charCount * 8) + 20));
                const showLabel = rawVal > 0 && (period === 'month' || h >= 12);
                return (
                  <div key={i} className="relative flex flex-col justify-end items-center h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: i * 0.05 }}
                      className={`${chartType === 'expense' ? 'bg-primary' : 'bg-secondary'} border-2 border-dark relative flex items-center justify-center ${period === 'month' ? 'w-[14px] sm:w-[16px]' : 'w-full'}`}
                      style={{ backgroundColor: chartType === 'expense' ? '#8854D0' : '#20BF55', opacity: 1, minHeight: showLabel ? `${minPx}px` : undefined }}
                    >
                      {showLabel && (
                        <span className={`rotate-90 text-[10px] font-bold text-white whitespace-nowrap leading-none pointer-events-none drop-shadow-md`}>
                          {labelText}
                        </span>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid w-full border-t-2 border-dark pt-2 text-xs text-dark font-bold uppercase" style={{ gridTemplateColumns: `repeat(${current.labels.length}, minmax(0, 1fr))` }}>
                {current.labels.map((l, idx) => (
                  <span key={idx} className="text-center">{l}</span>
                ))}
            </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="rounded-lg bg-white p-4 border-2 border-dark shadow-neo" ref={entriesRef}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-dark">
            <span className="material-symbols-outlined text-xl border-2 border-dark rounded-full p-1 bg-secondary text-white">arrow_downward</span>
            <p className="text-lg font-black text-dark cursor-pointer uppercase" onClick={() => setEntriesCollapsed(v => !v)}>Entradas</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-dark bg-accent px-2 py-1 border-2 border-dark shadow-neo-sm">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
            {entriesCollapsed && (
              <button onClick={() => setEntriesCollapsed(false)} className="p-1 rounded-sm border-2 border-dark hover:bg-surface-light">
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
            )}
          </div>
        </div>
        {!entriesCollapsed && (
          <div className="divide-y-2 divide-dark max-h-64 overflow-y-auto overscroll-contain pr-1">
            {incomeItems.length === 0 && (
              <p className="text-sm text-dark font-bold py-4 text-center">NENHUMA ENTRADA</p>
            )}
            {incomeItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-dark bg-surface-light px-1 border border-dark w-fit mb-1">{labelForDate(it.date)}</span>
                  <span className={`text-sm font-bold text-dark uppercase ${it.is_paid ? 'line-through opacity-60' : ''}`}>{it.description || 'SEM DESCRIÇÃO'}</span>
                </div>
                <span className={`text-sm font-black text-dark bg-secondary/20 px-2 py-1 border border-dark shadow-neo-sm ${it.is_paid ? 'line-through opacity-60' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <motion.section variants={itemVariants} className="rounded-lg bg-white p-4 border-2 border-dark shadow-neo" ref={expensesRef}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-dark">
            <span className="material-symbols-outlined text-xl border-2 border-dark rounded-full p-1 bg-primary text-white">arrow_upward</span>
            <p className="text-lg font-black text-dark cursor-pointer uppercase" onClick={() => setExpensesCollapsed(v => !v)}>Saídas</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-dark bg-accent px-2 py-1 border-2 border-dark shadow-neo-sm">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
            {expensesCollapsed && (
              <button onClick={() => setExpensesCollapsed(false)} className="p-1 rounded-sm border-2 border-dark hover:bg-surface-light">
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
            )}
          </div>
        </div>
        {!expensesCollapsed && (
          <div className="divide-y-2 divide-dark max-h-64 overflow-y-auto overscroll-contain pr-1">
            {expenseItems.length === 0 && (
              <p className="text-sm text-dark font-bold py-4 text-center">NENHUMA SAÍDA</p>
            )}
            {expenseItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-dark bg-surface-light px-1 border border-dark w-fit mb-1">{labelForDate(it.date)}</span>
                  <span className={`text-sm font-bold text-dark uppercase ${it.is_paid ? 'line-through opacity-60' : ''}`}>{it.description || 'SEM DESCRIÇÃO'}</span>
                </div>
                <span className={`text-sm font-black text-dark bg-primary/20 px-2 py-1 border border-dark shadow-neo-sm ${it.is_paid ? 'line-through opacity-60' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

    </motion.div>
  );
};

export default Dashboard;

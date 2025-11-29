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
        .select('id, description, amount, type, date')
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
        className="rounded-2xl bg-surface-dark/40 p-6 border border-surface-light"
      >
        <p className="text-sm font-medium text-text-secondary mb-1 text-center">Total de Saldo</p>
        <h2 className="text-4xl font-extrabold tracking-tight text-primary-green text-center">{formatBRL(summary.balance)}</h2>
      </motion.section>

      <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
        {[
          { label: 'Entradas', value: formatBRL(summary.income), icon: 'arrow_downward', color: 'text-success' },
          { label: 'Saídas', value: formatBRL(summary.expense), icon: 'arrow_upward', color: 'text-danger' },
          { label: 'Pendentes', value: formatBRL(summary.pending), icon: 'hourglass_empty', color: 'text-warning' },
          { label: 'Já pagos', value: formatBRL(summary.paid), icon: 'account_balance_wallet', color: 'text-primary' },
        ].map((item, idx) => (
          <motion.div 
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (item.label === 'Entradas') scrollTo(entriesRef);
                else if (item.label === 'Saídas') scrollTo(expensesRef);
                else if (item.label === 'Pendentes') navigate(`/transactions?status=pending&type=expense&month=${selectedMonth}`);
                else navigate('/reports');
              }}
              className="rounded-xl bg-surface-dark/50 p-4 border border-surface-light hover:border-text-secondary/30 transition-colors cursor-pointer"
          >
              <div className={`flex items-center gap-2 ${item.color} mb-2`}>
                  {item.label === 'Já pagos' ? (
                    <img src="https://cdn-icons-png.flaticon.com/512/5709/5709755.png" alt="Feito" className="h-5 w-5" />
                  ) : (
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  )}
                  <p className="text-sm font-semibold text-text-secondary">{item.label}</p>
              </div>
              <p className="text-lg font-bold text-text-primary">{item.value}</p>
          </motion.div>
        ))}
      </motion.section>

      <motion.section variants={itemVariants}>
        <div className="mb-4 px-4">
            <h3 className="text-lg font-bold text-text-primary">Gráficos</h3>
            <div className="mt-2 flex items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-1 rounded-lg bg-surface-dark p-1 border border-surface-light">
                <button
                  onClick={() => setPeriod('day')}
                  className={period === 'day' ? 'rounded px-3 py-1 text-xs font-bold text-background-dark bg-primary shadow-sm' : 'rounded px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary'}
                >Dia</button>
                <button
                  onClick={() => setPeriod('week')}
                  className={period === 'week' ? 'rounded px-3 py-1 text-xs font-bold text-background-dark bg-primary shadow-sm' : 'rounded px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary'}
                >Semana</button>
                <button
                  onClick={() => setPeriod('month')}
                  className={period === 'month' ? 'rounded px-3 py-1 text-xs font-bold text-background-dark bg-primary shadow-sm' : 'rounded px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary'}
                >Mês</button>
              </div>
              <button
                onClick={() => setChartType(t => (t === 'expense' ? 'income' : 'expense'))}
                className={chartType === 'expense' ? 'rounded px-3 py-1 text-xs font-bold text-white bg-danger shadow-sm' : 'rounded px-3 py-1 text-xs font-bold text-background-dark bg-success shadow-sm'}
              >{chartType === 'expense' ? 'Saídas' : 'Entradas'}</button>
            </div>
        </div>
        
        <div className="flex h-56 w-full flex-col justify-end rounded-xl bg-surface-dark/30 p-4 border border-surface-light relative overflow-visible">
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
                      className={`${chartType === 'expense' ? 'bg-danger' : 'bg-primary-green'} rounded-t-sm relative flex items-center justify-center ${period === 'month' ? 'w-[14px] sm:w-[16px]' : 'w-full'}`}
                      style={{ backgroundColor: chartType === 'expense' ? '#EF4444' : '#13ec5b', opacity: 1, minHeight: showLabel ? `${minPx}px` : undefined }}
                    >
                      {showLabel && (
                        <span className={`rotate-90 text-[10px] font-bold ${chartType === 'income' ? 'text-black' : 'text-white'} whitespace-nowrap leading-none pointer-events-none`}>
                          {labelText}
                        </span>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid w-full border-t border-surface-light pt-2 text-xs text-white font-medium" style={{ gridTemplateColumns: `repeat(${current.labels.length}, minmax(0, 1fr))` }}>
                {current.labels.map((l, idx) => (
                  <span key={idx} className="text-center">{l}</span>
                ))}
            </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="rounded-2xl bg-surface-dark/40 p-4 border border-surface-light" ref={entriesRef}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-text-primary">Entradas</h3>
          <span className="text-xs font-medium text-text-secondary">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
        </div>
        <div className="divide-y divide-surface-light/60 max-h-64 overflow-y-auto overscroll-contain pr-1">
          {incomeItems.length === 0 && (
            <p className="text-sm text-text-secondary">Nenhuma entrada neste mês</p>
          )}
          {incomeItems.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">{labelForDate(it.date)}</span>
                <span className="text-sm font-medium text-text-primary">{it.description || 'Sem descrição'}</span>
              </div>
              <span className="text-sm font-bold text-success">{formatBRL(Number(it.amount || 0))}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="rounded-2xl bg-surface-dark/40 p-4 border border-surface-light" ref={expensesRef}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-text-primary">Saídas</h3>
          <span className="text-xs font-medium text-text-secondary">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
        </div>
        <div className="divide-y divide-surface-light/60 max-h-64 overflow-y-auto overscroll-contain pr-1">
          {expenseItems.length === 0 && (
            <p className="text-sm text-text-secondary">Nenhuma saída neste mês</p>
          )}
          {expenseItems.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">{labelForDate(it.date)}</span>
                <span className="text-sm font-medium text-text-primary">{it.description || 'Sem descrição'}</span>
              </div>
              <span className="text-sm font-bold text-danger">{formatBRL(Number(it.amount || 0))}</span>
            </div>
          ))}
        </div>
      </motion.section>

    </motion.div>
  );
};

export default Dashboard;

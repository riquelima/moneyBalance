import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [summary, setSummary] = useState({ income: 0, expense: 0, pending: 0, balance: 0 });
  const [displayName, setDisplayName] = useState<string>('Usuário');
  const [avatarUrl, setAvatarUrl] = useState<string>('https://picsum.photos/100/100');
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const [chart, setChart] = useState<{ values: number[]; labels: string[] }>({ values: [], labels: [] });
  const [monthViewportStart, setMonthViewportStart] = useState(0);

  const dataMap: Record<'day' | 'month', { values: number[]; labels: string[] }> = {
    day: {
      values: [35, 48, 52, 68, 75, 60, 40],
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    },
    month: {
      values: [45, 52, 60, 58, 66, 72, 64],
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']
    }
  };

  const getWeeksOfCurrentMonth = (): { values: number[]; labels: string[] } => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDowMonday = (first.getDay() + 6) % 7;
    const daysInMonth = last.getDate();
    const weeks = Math.ceil((startDowMonday + daysInMonth) / 7);
    const labels = Array.from({ length: weeks }, (_, i) => `Sem${i + 1}`);
    const values = Array.from({ length: weeks }, (_, i) => 50 + ((i * 8 + month * 3) % 30));
    return { values, labels };
  };

  const last12MonthsLabels = (): string[] => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return monthNames[d.getMonth()];
    });
  };

  const current = chart.labels.length ? chart : (period === 'week' ? getWeeksOfCurrentMonth() : (period === 'month' ? { labels: last12MonthsLabels(), values: Array(12).fill(6) } : dataMap.day));
  const now = new Date();
  const highlightIndex = period === 'month' ? Math.max(0, current.labels.length - 1) : 3;

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
      const now = new Date();
      const startCur = new Date(now.getFullYear(), now.getMonth(), 1);
      const endCur = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const { data: tx } = await supabase
        .from('user_transactions')
        .select('amount, type, is_paid, date')
        .eq('user_id', user.id)
        .gte('date', fmt(startCur))
        .lte('date', fmt(endCur));
      const income = (tx || []).filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0);
      const expense = (tx || []).filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0);
      const pending = (tx || []).filter((t: any) => t.type === 'expense' && !t.is_paid).reduce((a: number, t: any) => a + Number(t.amount), 0);
      const balance = income - expense;
      setSummary({ income, expense, pending, balance });
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
  }, [location.key]);

  useEffect(() => {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const normalize = (vals: number[]) => {
      const max = Math.max(0, ...vals);
      if (max === 0) return vals.map(() => 6);
      return vals.map(v => Math.max(6, Math.round((v / max) * 90)));
    };
    const buildChart = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (period === 'month') setChart({ labels: last12MonthsLabels(), values: Array(12).fill(6) });
        else if (period === 'week') setChart(getWeeksOfCurrentMonth());
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
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', fmt(start))
          .lte('date', fmt(end));
        const vals = Array(7).fill(0);
        (data || []).forEach((t: any) => {
          const d = new Date(t.date);
          const idx = (d.getDay() + 6) % 7; // Mon=0
          vals[idx] += Number(t.amount || 0);
        });
        setChart({ labels: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'], values: normalize(vals) });
      } else if (period === 'week') {
        const nowD = new Date();
        const year = nowD.getFullYear();
        const month = nowD.getMonth();
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const startDowMonday = (first.getDay() + 6) % 7;
        const daysInMonth = last.getDate();
        const weeks = Math.ceil((startDowMonday + daysInMonth) / 7);
        const labels = Array.from({ length: weeks }, (_, i) => `Sem${i + 1}`);
        const { data } = await supabase
          .from('user_transactions')
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', fmt(first))
          .lte('date', fmt(last));
        const vals = Array(weeks).fill(0);
        (data || []).forEach((t: any) => {
          const d = new Date(t.date);
          // week index within month
          const dayIndex = d.getDate();
          const totalOffset = startDowMonday + dayIndex - 1;
          const w = Math.floor(totalOffset / 7);
          vals[w] += Number(t.amount || 0);
        });
        setChart({ labels, values: normalize(vals) });
      } else {
        const nowD = new Date();
        const from = new Date(nowD.getFullYear(), nowD.getMonth() - 11, 1);
        const to = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0);
        const { data } = await supabase
          .from('user_transactions')
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', fmt(from))
          .lte('date', fmt(to));
        const labels = last12MonthsLabels();
        const vals = Array(12).fill(0);
        (data || []).forEach((t: any) => {
          const d = new Date(t.date);
          const offset = (nowD.getFullYear() - d.getFullYear()) * 12 + (nowD.getMonth() - d.getMonth());
          const idx = 11 - Math.max(0, Math.min(11, offset));
          vals[idx] += Number(t.amount || 0);
        });
        setChart({ labels, values: normalize(vals) });
      }
    };
    buildChart();
  }, [period]);

  useEffect(() => {
    if (period === 'month') {
      const start = Math.max(0, (chart.labels.length || 0) - 4);
      setMonthViewportStart(start);
    }
  }, [period, chart.labels]);

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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col p-4 pt-8 gap-6"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <motion.img 
                whileHover={{ scale: 1.1 }}
                src={avatarUrl}
                alt="Profile" 
                className="h-12 w-12 rounded-full border-2 border-primary object-cover"
                onClick={() => navigate('/settings')}
            />
            <div>
                <p className="text-sm font-medium text-text-secondary">Bem-vindo(a),</p>
                <h1 className="text-xl font-bold text-text-primary">{displayName}</h1>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-surface-light transition-colors">
                <span className="material-symbols-outlined text-text-secondary">notifications</span>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-background-dark"></span>
            </button>
            <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-surface-light transition-colors">
                <span className="material-symbols-outlined text-text-secondary">settings</span>
            </button>
        </div>
      </header>

      <motion.section 
        variants={itemVariants}
        className="rounded-2xl bg-surface-dark/40 p-6 border border-surface-light"
      >
        <p className="text-sm font-medium text-text-secondary mb-1">Total de Saldo</p>
        <h2 className="text-4xl font-extrabold tracking-tight text-text-primary">{formatBRL(summary.balance)}</h2>
      </motion.section>

      <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
        {[
            { label: 'Entradas', value: formatBRL(summary.income), icon: 'arrow_downward', color: 'text-success' },
            { label: 'Saídas', value: formatBRL(summary.expense), icon: 'arrow_upward', color: 'text-danger' },
            { label: 'Pendentes', value: formatBRL(summary.pending), icon: 'hourglass_empty', color: 'text-warning' },
            { label: 'Saldo', value: formatBRL(summary.balance), icon: 'account_balance_wallet', color: 'text-primary' },
        ].map((item, idx) => (
            <motion.div 
                key={idx}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/reports')}
                className="rounded-xl bg-surface-dark/50 p-4 border border-surface-light hover:border-text-secondary/30 transition-colors cursor-pointer"
            >
                <div className={`flex items-center gap-2 ${item.color} mb-2`}>
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <p className="text-sm font-semibold text-text-secondary">{item.label}</p>
                </div>
                <p className="text-lg font-bold text-text-primary">{item.value}</p>
            </motion.div>
        ))}
      </motion.section>

      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary">Tendências Financeiras</h3>
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
        </div>
        
        {/* Custom CSS Bar Chart simulation */}
        <div className="flex h-56 w-full flex-col justify-end rounded-xl bg-surface-dark/30 p-4 border border-surface-light relative overflow-hidden">
            <div className="flex h-full w-full flex-col">
              {period === 'month' ? (
                <motion.div
                  key={`month-viewport-${monthViewportStart}`}
                  className="overflow-hidden"
                  drag="x"
                  dragConstraints={{ left: -80, right: 80 }}
                  dragElastic={0.05}
                  dragMomentum={false}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -40 && monthViewportStart < Math.max(0, current.values.length - 4)) {
                      setMonthViewportStart(s => Math.min(s + 1, Math.max(0, current.values.length - 4)));
                    } else if (info.offset.x > 40 && monthViewportStart > 0) {
                      setMonthViewportStart(s => Math.max(s - 1, 0));
                    }
                  }}
                >
                  <div className="flex h-56 items-end justify-between px-2 gap-2">
                    {current.values.slice(monthViewportStart, monthViewportStart + 4).map((h, i) => {
                      const globalIndex = monthViewportStart + i;
                      const isHighlight = globalIndex === current.labels.length - 1;
                      return (
                        <motion.div
                          key={globalIndex}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                          className={`w-full rounded-t-sm ${isHighlight ? 'bg-primary shadow-metallic' : 'bg-primary/30'}`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-3 flex w-full justify-between border-t border-surface-light pt-2 text-xs text-text-secondary font-medium">
                    {current.labels.slice(monthViewportStart, monthViewportStart + 4).map((l, idx) => (
                      <span key={`${monthViewportStart}-${idx}`}>{l}</span>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div key={period} className="flex h-full w-full items-end justify-between px-2 gap-2">
                  {current.values.map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: i * 0.05 }}
                        className={`w-full rounded-t-sm ${i === highlightIndex ? 'bg-primary shadow-metallic' : 'bg-primary/30'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            {period !== 'month' && (
              <div className="mt-3 flex w-full justify-between border-t border-surface-light pt-2 text-xs text-text-secondary font-medium">
                  {current.labels.map((l, idx) => (
                    <span key={idx}>{l}</span>
                  ))}
              </div>
            )}
        </div>
      </motion.section>
    </motion.div>
  );
};

export default Dashboard;

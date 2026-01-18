import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, labelForDate } from '../utils/date';

import PastSelfWidget from '../components/dashboard/PastSelfWidget';

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
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [incomeItems, setIncomeItems] = useState<any[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [entriesCollapsed, setEntriesCollapsed] = useState<boolean>(false);
  const [expensesCollapsed, setExpensesCollapsed] = useState<boolean>(false);
  const [isChartsOpen, setIsChartsOpen] = useState<boolean>(true);
  const [hideValues, setHideValues] = useState<boolean>(false);
  
  const [todayExpense, setTodayExpense] = useState(0);
  const [yesterdayExpense, setYesterdayExpense] = useState(0);

  const getSPDateISO = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date).split('/').reverse().join('-');
  };

  useEffect(() => {
    const persisted = localStorage.getItem('hideValues');
    if (persisted === 'true' || persisted === 'false') {
      setHideValues(persisted === 'true');
    }
  }, []);

  useEffect(() => {
    const fetchDailyData = async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

        const now = new Date();
        const todayISO = getSPDateISO(now);
        
        const [y, m, d] = todayISO.split('-').map(Number);
        const todayDateObj = new Date(y, m-1, d);
        const yesterdayDateObj = new Date(todayDateObj);
        yesterdayDateObj.setDate(todayDateObj.getDate() - 1);
        
        const yStr = yesterdayDateObj.getFullYear();
        const mStr = String(yesterdayDateObj.getMonth() + 1).padStart(2, '0');
        const dStr = String(yesterdayDateObj.getDate()).padStart(2, '0');
        const yesterdayISO = `${yStr}-${mStr}-${dStr}`;

        const { data: todayData } = await supabase
            .from('user_transactions')
            .select('amount')
            .eq('user_id', userData.user.id)
            .eq('type', 'expense')
            .eq('date', todayISO);

        const { data: yesterdayData } = await supabase
            .from('user_transactions')
            .select('amount')
            .eq('user_id', userData.user.id)
            .eq('type', 'expense')
            .eq('date', yesterdayISO);

        const tTotal = todayData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        const yTotal = yesterdayData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

        setTodayExpense(tTotal);
        setYesterdayExpense(yTotal);
    };
    fetchDailyData();
  }, [location.key]);


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

  const [direction, setDirection] = useState(0);

  // Swipe handlers
  const handleChartSwipe = (event: any, info: any) => {
    if (period !== 'month') return;
    if (info.offset.x > 50) {
      setDirection(-1);
      setChartYear(y => y - 1);
    } else if (info.offset.x < -50) {
      setDirection(1);
      setChartYear(y => y + 1);
    }
  };

  const chartVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? 300 : -300,
      opacity: 0
    })
  };

  useEffect(() => {
    let mounted = true;
    const loadSummary = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!mounted) return;
      if (!user) return;
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      const startCur = new Date(selectedYear, selectedMonth, 1);
      const endCur = new Date(selectedYear, selectedMonth + 1, 0);
      const { data: tx, error } = await supabase
        .from('user_transactions')
        .select('amount, type, is_paid, date')
        .eq('user_id', user.id)
        .gte('date', fmt(startCur))
        .lte('date', fmt(endCur));
        
      if (!mounted) return;
      
      if (!error && tx) {
        const income = (tx || []).filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0);
        const expense = (tx || []).filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0);
        const pending = (tx || []).filter((t: any) => t.type === 'expense' && !t.is_paid).reduce((a: number, t: any) => a + Number(t.amount), 0);
        const paid = (tx || []).filter((t: any) => t.type === 'expense' && t.is_paid).reduce((a: number, t: any) => a + Number(t.amount), 0);
        const balance = income - expense;
        setSummary({ income, expense, pending, balance, paid });
      }
    };

    const loadProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!mounted) return;
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
          
        if (!mounted) return;
        
        setDisplayName((prof?.display_name as string) || (metaName && metaLast ? `${metaName} ${metaLast}` : candidate));
        if (prof?.avatar_url) setAvatarUrl(prof.avatar_url as string);
      }
    };

    loadSummary();
    loadProfile();
    
    return () => { mounted = false; };
  }, [location.key, selectedYear, selectedMonth]);

  useEffect(() => {
    let mounted = true;
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const normalize = (vals: number[]) => {
      const max = Math.max(0, ...vals);
      if (max === 0) return vals.map(() => 0);
      return vals.map(v => (v === 0 ? 0 : Math.max(6, Math.round((v / max) * 100))));
    };
    const buildChart = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (!mounted) return;
      
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
        const { data, error } = await supabase
          .from('user_transactions')
          .select('amount, date, type')
          .eq('user_id', user.id)
          .eq('type', chartType)
          .gte('date', fmt(start))
          .lte('date', fmt(end));
          
        if (!mounted) return;
        if (!error && data) {
            const vals = Array(7).fill(0);
            (data || []).forEach((t: any) => {
              const d = parseLocalISODate(t.date);
              const idx = (d.getDay() + 6) % 7; // Mon=0
              vals[idx] += Number(t.amount || 0);
            });
            setChart({ labels: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'], values: normalize(vals), raw: vals });
        }
      } else if (period === 'week') {
        const first = new Date(selectedYear, selectedMonth, 1);
        const last = new Date(selectedYear, selectedMonth + 1, 0);
        const startDowMonday = (first.getDay() + 6) % 7;
        const daysInMonth = last.getDate();
        const weeks = Math.ceil((startDowMonday + daysInMonth) / 7);
        const labels = Array.from({ length: weeks }, (_, i) => `Sem${i + 1}`);
        const { data, error } = await supabase
          .from('user_transactions')
          .select('amount, date, type')
          .eq('user_id', user.id)
          .eq('type', chartType)
          .gte('date', fmt(first))
          .lte('date', fmt(last));
          
        if (!mounted) return;
        if (!error && data) {
            const vals = Array(weeks).fill(0);
            (data || []).forEach((t: any) => {
              const d = parseLocalISODate(t.date);
              // week index within month
              const dayIndex = d.getDate();
              const totalOffset = startDowMonday + dayIndex - 1;
              const w = Math.floor(totalOffset / 7);
              if (w >= 0 && w < weeks) vals[w] += Number(t.amount || 0);
            });
            setChart({ labels, values: normalize(vals), raw: vals });
        }
      } else {
        // Month view: show all months for chartYear
        const from = new Date(chartYear, 0, 1);
        const to = new Date(chartYear, 11, 31);
        const { data, error } = await supabase
          .from('user_transactions')
          .select('amount, date, type')
          .eq('user_id', user.id)
          .eq('type', chartType)
          .gte('date', fmt(from))
          .lte('date', fmt(to));
          
        if (!mounted) return;
        if (!error && data) {
            const labels = last12MonthsLabels();
            const vals = Array(12).fill(0);
            (data || []).forEach((t: any) => {
              const d = parseLocalISODate(t.date);
              const idx = d.getMonth();
              vals[idx] += Number(t.amount || 0);
            });
            setChart({ labels, values: normalize(vals), raw: vals });
        }
      }
    };
    buildChart();
    return () => { mounted = false; };
  }, [period, selectedYear, selectedMonth, chartType, chartYear]);

  useEffect(() => {
    let mounted = true;
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    const loadMonthLists = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (!mounted) return;
      if (!user) { setIncomeItems([]); setExpenseItems([]); return; }
      
      const startCur = new Date(selectedYear, selectedMonth, 1);
      const endCur = new Date(selectedYear, selectedMonth + 1, 0);
      const { data, error } = await supabase
        .from('user_transactions')
        .select('id, description, amount, type, date, is_paid')
        .eq('user_id', user.id)
        .gte('date', fmt(startCur))
        .lte('date', fmt(endCur))
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });
        
      if (!mounted) return;
      
      if (!error && data) {
        const arr = (data || []) as any[];
        setIncomeItems(arr.filter(t => t.type === 'income'));
        setExpenseItems(arr.filter(t => t.type === 'expense'));
      }
    };
    loadMonthLists();
    return () => { mounted = false; };
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
      className="flex flex-col p-4 pt-6 gap-4 bg-background-light dark:bg-background-dark text-dark dark:text-white transition-colors duration-300"
    >
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white dark:bg-surface-dark p-4 -mx-4 border-b-3 border-dark dark:border-white shadow-sm">
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
                <p className="text-sm font-medium text-text-secondary dark:text-text-secondary/80">Bem-vindo(a),</p>
                <h1 className="text-xl font-bold text-text-primary dark:text-white">{displayName}</h1>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-surface-light dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-text-secondary dark:text-white">notifications</span>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-background-dark"></span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-surface-light dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-text-secondary dark:text-white">settings</span>
            </motion.button>
        </div>
      </header>

      <div className="flex items-center justify-between mt-2">
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => setHideValues(v => { const next = !v; localStorage.setItem('hideValues', next ? 'true' : 'false'); return next; })}
          aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          className="h-8 w-8 flex items-center justify-center rounded-sm border-2 border-dark dark:border-white bg-white dark:bg-surface-dark shadow-neo-sm dark:shadow-none"
        >
          <img src="https://cdn-icons-png.flaticon.com/512/6423/6423885.png" alt="Ocultar valores" className="h-4 w-4" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => setShowMonthPicker(s => !s)}
          className="text-primary-green font-bold text-sm bg-primary-green/10 px-3 py-1 rounded-full border border-transparent dark:border-primary-green"
        >{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</motion.button>
      </div>
      {showMonthPicker && (
        <div className="flex justify-center">
          <div className="mt-2 w-full max-w-[680px] mx-2 rounded-xl bg-white dark:bg-surface-dark p-4 border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_#ffffff]">
            <div className="flex items-center justify-between mb-3">
              <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => setSelectedYear(y => y - 1)} className="p-2 rounded-full hover:bg-surface-light dark:hover:bg-white/10 text-dark dark:text-white"><span className="material-symbols-outlined">chevron_left</span></motion.button>
              <span className="text-sm font-bold text-dark dark:text-white">{selectedYear}</span>
              <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => setSelectedYear(y => y + 1)} className="p-2 rounded-full hover:bg-surface-light dark:hover:bg-white/10 text-dark dark:text-white"><span className="material-symbols-outlined">chevron_right</span></motion.button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[selectedYear - 2, selectedYear - 1, selectedYear].map((y) => (
                <motion.button
                  whileTap={{ scale: 0.95, y: 2 }}
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={y === selectedYear ? 'px-3 py-2 rounded-lg bg-primary text-background-dark text-xs font-bold' : 'px-3 py-2 rounded-lg bg-surface-light dark:bg:white/10 text-xs font-medium hover:bg-surface-light/80 text-dark dark:text-white'}
                >{y}</motion.button>
              ))}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {monthNames.map((m, idx) => (
                <motion.button
                  whileTap={{ scale: 0.95, y: 2 }}
                  key={m}
                  onClick={() => { setSelectedMonth(idx); setShowMonthPicker(false); }}
                  className={idx === selectedMonth ? 'px-3 py-2 rounded-lg bg-primary text-background-dark text-xs font-bold' : 'px-3 py-2 rounded-lg bg-surface-light dark:bg:white/10 text-xs font-medium hover:bg-surface-light/80 text-dark dark:text-white'}
                >{m}</motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      <motion.section 
        variants={itemVariants}
        className="rounded-lg bg-white dark:bg-surface-dark p-6 border-3 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        data-onboarding="saldo-total"
      >
        <p className="text-sm font-bold text-dark dark:text-white mb-1 text-center uppercase tracking-widest">Total de Saldo</p>
        <h2 className={`text-4xl font-black tracking-tight text-dark dark:text-white text-center ${hideValues ? 'filter blur-[12px] opacity-60 select-none' : ''}`}>{formatBRL(summary.balance)}</h2>
      </motion.section>

      <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
        {[
          { label: 'Entradas', value: formatBRL(summary.income), icon: 'arrow_downward', color: 'text-secondary', bg: 'bg-[#F1F8E9] dark:bg-[#1B3320]' },
          { label: 'Saídas', value: formatBRL(summary.expense), icon: 'arrow_upward', color: 'text-danger', bg: 'bg-[#FFEBEE] dark:bg-[#3D1A1A]' },
          { label: 'Já pagos', value: formatBRL(summary.paid), icon: 'check_circle', color: 'text-secondary', bg: 'bg-[#F1F8E9] dark:bg-[#1B3320]' },
          { label: 'Não Pagos', value: formatBRL(summary.pending), icon: 'hourglass_empty', color: 'text-danger', bg: 'bg-[#FFEBEE] dark:bg-[#3D1A1A]' },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            className={`rounded-lg ${item.bg} p-4 border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-y-[2px] transition-all cursor-pointer`}
            whileHover={{ y: -2 }}
            data-onboarding={item.label === 'Entradas' ? 'card-entradas' : (item.label === 'Já pagos' ? 'card-ja-pagos' : (item.label === 'Não Pagos' ? 'card-nao-pagos' : undefined))}
            onClick={() => {
              if (item.label === 'Entradas') navigate('/transactions?type=income');
              if (item.label === 'Saídas') navigate('/transactions?type=expense');
              if (item.label === 'Não Pagos') navigate('/transactions?status=pending&type=expense');
              if (item.label === 'Já pagos') navigate('/transactions?status=paid&type=expense');
            }}
          >
            <div className={`flex items-center gap-2 ${item.color} mb-2`}>
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <p className="text-xs font-black uppercase tracking-wider text-dark dark:text-white">{item.label}</p>
            </div>
            <p className={`text-lg font-black text-dark dark:text-white ${hideValues ? 'filter blur-[12px] opacity-60 select-none' : ''}`}>{item.value}</p>
          </motion.div>
        ))}

        {/* Card Hoje */}
        <motion.div
          className="rounded-lg bg-[#E3F2FD] dark:bg-[#0D47A1] p-4 border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-y-[2px] transition-all cursor-pointer relative group"
          whileHover={{ y: -2 }}
          onClick={() => {
            const now = new Date();
            const todayISO = getSPDateISO(now);
            navigate(`/transactions?type=expense&date=${todayISO}`);
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-xl">today</span>
              <p className="text-xs font-black uppercase tracking-wider text-dark dark:text-white">Hoje</p>
            </div>
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-dark text-white text-[10px] p-1 rounded pointer-events-none z-10">
                Comparação com ontem
             </div>
          </div>
          <p className={`text-lg font-black text-dark dark:text-white ${hideValues ? 'blur-sm' : ''}`}>
             {formatBRL(todayExpense)}
          </p>
          
          <div className="flex items-center gap-1 mt-1">
             {(() => {
                const diff = todayExpense - yesterdayExpense;
                if (yesterdayExpense === 0 && todayExpense === 0) return <span className="material-symbols-outlined text-sm text-gray-500 font-bold">drag_handle</span>;
                if (yesterdayExpense === 0 && todayExpense > 0) return (
                    <>
                        <span className="material-symbols-outlined text-sm text-[#4CAF50] font-bold">arrow_upward</span>
                        <span className="text-xs font-bold text-[#4CAF50]">100%</span>
                    </>
                );
                
                const pct = (diff / yesterdayExpense) * 100;
                if (diff > 0) return (
                     <>
                        <span className="material-symbols-outlined text-sm text-[#4CAF50] font-bold">arrow_upward</span>
                        <span className="text-xs font-bold text-[#4CAF50]">{pct.toFixed(1)}%</span>
                     </>
                );
                if (diff < 0) return (
                     <>
                        <span className="material-symbols-outlined text-sm text-[#F44336] font-bold">arrow_downward</span>
                        <span className="text-xs font-bold text-[#F44336]">{Math.abs(pct).toFixed(1)}%</span>
                     </>
                );
                return <span className="material-symbols-outlined text-sm text-gray-500 font-bold">drag_handle</span>;
             })()}
          </div>
        </motion.div>

        {/* Card Ontem */}
        <motion.div
          className="rounded-lg bg-[#F3E5F5] dark:bg-[#4A148C] p-4 border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-y-[2px] transition-all cursor-pointer group relative"
          whileHover={{ y: -2 }}
          onClick={() => {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayISO = getSPDateISO(yesterday);
            navigate(`/transactions?type=expense&date=${yesterdayISO}`);
          }}
        >
            <div className="flex items-center gap-2 text-secondary mb-2">
              <span className="material-symbols-outlined text-xl">calendar_today</span>
              <p className="text-xs font-black uppercase tracking-wider text-dark dark:text-white">Ontem</p>
            </div>
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-dark text-white text-[10px] p-1 rounded pointer-events-none z-10">
                Total de saídas de ontem
             </div>
          <p className={`text-lg font-black text-dark dark:text-white ${hideValues ? 'blur-sm' : ''}`}>
             {formatBRL(yesterdayExpense)}
          </p>
        </motion.div>
      </motion.section>

      <PastSelfWidget />

      <motion.section variants={itemVariants}>
        <button 
          onClick={() => setIsChartsOpen(!isChartsOpen)}
          className="w-full flex items-center justify-between group focus:outline-none mb-4"
          aria-expanded={isChartsOpen}
        >
          <h3 className="text-lg font-black uppercase text-dark dark:text-white flex items-center gap-2">
            <img src="https://cdn-icons-png.flaticon.com/512/1011/1011528.png" alt="Ícone gráficos" className="w-6 h-6" />
            Gráficos
          </h3>
          <span 
            className={`material-symbols-outlined text-dark dark:text-white transition-transform duration-300 ${isChartsOpen ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </button>

        <AnimatePresence>
          {isChartsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
            <div className="mb-4 px-4">
            <div className="mt-2 flex items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-1 rounded-lg bg-white dark:bg-surface-dark p-1 border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                <motion.button
                  whileTap={{ scale: 0.95, y: 2 }}
                  onClick={() => setPeriod('day')}
                  className={period === 'day' ? 'rounded-sm border-2 border-dark dark:border-white px-3 py-1 text-xs font-bold text-white bg-dark dark:bg-white dark:text-dark shadow-none' : 'rounded-sm px-3 py-1 text-xs font-bold text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10'}
                >DIA</motion.button>
                <motion.button
                  whileTap={{ scale: 0.95, y: 2 }}
                  onClick={() => setPeriod('month')}
                  className={period === 'month' ? 'rounded-sm border-2 border-dark dark:border-white px-3 py-1 text-xs font-bold text-white bg-dark dark:bg-white dark:text-dark shadow-none' : 'rounded-sm px-3 py-1 text-xs font-bold text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10'}
                >MÊS</motion.button>
              </div>
              <motion.button
                whileTap={{ scale: 0.95, y: 2 }}
                onClick={() => setChartType(t => (t === 'expense' ? 'income' : 'expense'))}
                className={chartType === 'expense' ? 'rounded-sm border-2 border-dark dark:border-white px-3 py-1 text-xs font-bold text-white bg-danger shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-y-[2px] transition-all' : 'rounded-sm border-2 border-dark dark:border-white px-3 py-1 text-xs font-bold text-white bg-secondary shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-y-[2px] transition-all'}
              >{chartType === 'expense' ? 'SAÍDAS' : 'ENTRADAS'}</motion.button>
            </div>
        </div>
        
        <div className="flex h-56 w-full flex-col justify-end rounded-lg bg-white dark:bg-surface-dark p-4 border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={`${period}-${chartYear}-${chartType}`}
              custom={direction}
              variants={chartVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              className="w-full h-full flex flex-col justify-end"
              drag={period === 'month' ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleChartSwipe}
            >
              <div className="grid h-full w-full items-end gap-1" style={{ gridTemplateColumns: `repeat(${current.labels.length}, minmax(0, 1fr))` }}>
                {current.values.map((h, i) => {
                  const rawVal = (chart.raw || current.raw || [])[i] || 0;
                  const labelText = formatBRL(rawVal);
                  const charCount = labelText.replace(/\s/g, '').length;
                  const minPx = Math.min(180, Math.max(36, Math.ceil(charCount * 8) + 20));
                  const showLabel = rawVal > 0 && (period === 'month' || h >= 12);
                  const isHighlighted = period === 'month' && i === selectedMonth && chartYear === selectedYear;

                  return (
                    <div key={i} className="relative flex flex-col justify-end items-center h-full">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: i * 0.05 }}
                        className={`${chartType === 'expense' ? 'bg-danger' : 'bg-secondary'} border-2 border-dark dark:border-white relative flex items-center justify-center ${period === 'month' ? 'w-[14px] sm:w-[16px]' : 'w-full'}`}
                        style={{ 
                          backgroundColor: chartType === 'expense' ? '#FF6B6B' : '#20BF55', 
                          opacity: (period === 'month' && !isHighlighted && chartYear === selectedYear) ? 0.6 : 1, 
                          minHeight: showLabel ? `${minPx}px` : undefined 
                        }}
                      >
                        {showLabel && (
                          <span className={`rotate-90 text-[10px] font-bold text-white whitespace-nowrap leading-none pointer-events-none drop-shadow-md`}>
                            <span className={`${hideValues ? 'filter blur-[12px] opacity-60 select-none' : ''}`}>{labelText}</span>
                          </span>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid w-full border-t-2 border-dark dark:border-white pt-2 text-xs text-dark dark:text-white font-bold uppercase" style={{ gridTemplateColumns: `repeat(${current.labels.length}, minmax(0, 1fr))` }}>
                  {current.labels.map((l, idx) => (
                    <span key={idx} className={`text-center ${period === 'month' && idx === selectedMonth && chartYear === selectedYear ? 'text-primary' : ''}`}>{l}</span>
                  ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <motion.section variants={itemVariants} className="rounded-lg bg-white dark:bg-surface-dark p-4 border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]" ref={entriesRef}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-dark dark:text-white">
            <span className="material-symbols-outlined text-xl border-2 border-dark dark:border-white rounded-full p-1 bg-secondary text-white">arrow_downward</span>
            <p className="text-lg font-black text-dark dark:text-white cursor-pointer uppercase" onClick={() => setEntriesCollapsed(v => !v)}>Entradas</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-dark dark:text-white bg-accent px-2 py-1 border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
            {entriesCollapsed && (
              <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => setEntriesCollapsed(false)} className="p-1 rounded-sm border-2 border-dark dark:border-white hover:bg-surface-light dark:hover:bg-white/10">
                <span className="material-symbols-outlined text-sm text-dark dark:text-white">expand_more</span>
              </motion.button>
            )}
          </div>
        </div>
        {!entriesCollapsed && (
          <div className="divide-y-2 divide-dark dark:divide-white max-h-64 overflow-y-auto overscroll-contain pr-1">
            {incomeItems.length === 0 && (
              <p className="text-sm text-dark dark:text-white font-bold py-4 text-center">NENHUMA ENTRADA</p>
            )}
            {incomeItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-dark dark:text-white bg-surface-light dark:bg-white/10 px-1 border border-dark dark:border-white w-fit mb-1">{labelForDate(it.date)}</span>
                  <span className={`text-sm font-bold text-dark dark:text-white uppercase ${it.is_paid ? 'line-through opacity-60' : ''}`}>{it.description || 'SEM DESCRIÇÃO'}</span>
                </div>
                <span className={`text-sm font-black text-dark dark:text-white bg-secondary/20 px-2 py-1 border border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${it.is_paid ? 'line-through opacity-60' : ''} ${hideValues ? 'filter blur-[12px] opacity-60 select-none' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <motion.section variants={itemVariants} className="rounded-lg bg-white dark:bg-surface-dark p-4 border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]" ref={expensesRef}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-dark dark:text-white">
            <span className="material-symbols-outlined text-xl border-2 border-dark dark:border-white rounded-full p-1 bg-danger text-white">arrow_upward</span>
            <p className="text-lg font-black text-dark dark:text-white cursor-pointer uppercase" onClick={() => setExpensesCollapsed(v => !v)}>Saídas</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-dark dark:text-white bg-accent px-2 py-1 border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
            {expensesCollapsed && (
              <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => setExpensesCollapsed(false)} className="p-1 rounded-sm border-2 border-dark dark:border-white hover:bg-surface-light dark:hover:bg-white/10">
                <span className="material-symbols-outlined text-sm text-dark dark:text-white">expand_more</span>
              </motion.button>
            )}
          </div>
        </div>
        {!expensesCollapsed && (
          <div className="divide-y-2 divide-dark dark:divide-white max-h-64 overflow-y-auto overscroll-contain pr-1">
            {expenseItems.length === 0 && (
              <p className="text-sm text-dark dark:text-white font-bold py-4 text-center">NENHUMA SAÍDA</p>
            )}
            {expenseItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-dark dark:text-white bg-surface-light dark:bg-white/10 px-1 border border-dark dark:border-white w-fit mb-1">{labelForDate(it.date)}</span>
                  <span className={`text-sm font-bold text-dark dark:text-white uppercase ${it.is_paid ? 'line-through opacity-60' : ''}`}>{it.description || 'SEM DESCRIÇÃO'}</span>
                </div>
                <span className={`text-sm font-black text-dark dark:text-white bg-danger/20 px-2 py-1 border border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${it.is_paid ? 'line-through opacity-60' : ''} ${hideValues ? 'filter blur-[12px] opacity-60 select-none' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

    </motion.div>
  );
};

export default Dashboard;

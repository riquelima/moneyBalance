import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, labelForDate } from '../utils/date';
import { usePrivacy } from '../src/context/PrivacyContext';
import Skeleton from '../components/ui/Skeleton';
import Header from '../components/common/Header';


const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
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
  const [isReportOpen, setIsReportOpen] = useState<boolean>(true);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const { isPrivacyEnabled, togglePrivacy } = usePrivacy();

  const [todayExpense, setTodayExpense] = useState(0);
  const [yesterdayExpense, setYesterdayExpense] = useState(0);
  const [saldoAtual, setSaldoAtual] = useState(0);

  const getSPDateISO = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date).split('/').reverse().join('-');
  };

  const getCacheKey = (key: string) => `dashboard_cache_${key}`;

  const saveToCache = (key: string, data: any) => {
    try {
      localStorage.setItem(getCacheKey(key), JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch (e) {
      console.warn('Failed to save to cache', e);
    }
  };

  const getFromCache = (key: string) => {
    try {
      const cached = localStorage.getItem(getCacheKey(key));
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const fetchAllData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    const user = userData.user;

    const promises = [];

    // 1. Daily Data (Today/Yesterday)
    promises.push((async () => {
      const now = new Date();
      const todayISO = getSPDateISO(now);
      const [y, m, d] = todayISO.split('-').map(Number);
      const todayDateObj = new Date(y, m - 1, d);
      const yesterdayDateObj = new Date(todayDateObj);
      yesterdayDateObj.setDate(todayDateObj.getDate() - 1);

      const yStr = yesterdayDateObj.getFullYear();
      const mStr = String(yesterdayDateObj.getMonth() + 1).padStart(2, '0');
      const dStr = String(yesterdayDateObj.getDate()).padStart(2, '0');
      const yesterdayISO = `${yStr}-${mStr}-${dStr}`;

      const [todayRes, yesterdayRes] = await Promise.all([
        supabase.from('user_transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').eq('date', todayISO),
        supabase.from('user_transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').eq('date', yesterdayISO)
      ]);

      const tTotal = todayRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const yTotal = yesterdayRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setTodayExpense(tTotal);
      setYesterdayExpense(yTotal);
    })());

    // 1.5 Saldo Atual (Current Month Paid Income)
    promises.push((async () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${y}-${m}-01`;
      const endDay = new Date(y, now.getMonth() + 1, 0).getDate();
      const end = `${y}-${m}-${endDay}`;

      const { data: incomeData } = await supabase
        .from('user_transactions')
        .select('amount, category_id')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .eq('is_paid', true)
        .gte('date', start)
        .lte('date', end);

      // Fetch "Ajuste de Saldo" category ID to exclude it
      let adjustmentCatId: string | null = null;
      try {
        const { data: adjCat } = await supabase
          .from('user_categories')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', 'Ajuste de Saldo')
          .maybeSingle();
        if (adjCat) adjustmentCatId = adjCat.id;
      } catch (e) { /* ignore */ }

      const totalPaidIncome = incomeData
        ?.filter(t => t.category_id !== adjustmentCatId && t.category_id !== 'd7956754-9a58-487d-9636-2cd59c2f4558')
        ?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      setSaldoAtual(totalPaidIncome);
    })());

    // 2. Profile
    const profileCache = getFromCache(`profile_${user.id}`);
    if (profileCache) {
      setDisplayName(profileCache.displayName);
      setAvatarUrl(profileCache.avatarUrl);
    } else {
      promises.push((async () => {
        const metaName = (user.user_metadata?.name as string) || '';
        const metaLast = (user.user_metadata?.lastName as string) || '';
        const metaUsername = (user.user_metadata?.username as string) || '';
        const candidate = metaName || metaUsername || user.email || 'Usuário';

        const { data: prof } = await supabase.from('user_profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();

        const dName = (prof?.display_name as string) || (metaName && metaLast ? `${metaName} ${metaLast}` : candidate);
        const aUrl = (prof?.avatar_url as string) || '';

        setDisplayName(dName);
        setAvatarUrl(aUrl);
        saveToCache(`profile_${user.id}`, { displayName: dName, avatarUrl: aUrl });
      })());
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    setLoading(false);

  }, []);

  useEffect(() => {
    fetchAllData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_transactions' }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);



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

    const normalize = (vals: number[]) => {
      const max = Math.max(0, ...vals);
      if (max === 0) return vals.map(() => 0);
      
      const positiveVals = vals.filter(v => v > 0);
      const min = positiveVals.length > 0 ? Math.min(...positiveVals) : 0;
      
      return vals.map(v => {
        if (v === 0) return 0;
        if (max === min) return 54; // Altura padrão se todos os valores forem iguais
        
        // Mapeamento dinâmico otimizado (20% a 90%) para acomodar com folga os rótulos compactos
        const ratio = (v - min) / (max - min);
        return 20 + ratio * 70;
      });
    };

    const processMonthData = async (data: any[]) => {
      // 1. Fetch "Ajuste de Saldo" category ID
      let adjustmentCatId: string | null = null;
      try {
        const { data: adjCat } = await supabase
          .from('user_categories')
          .select('id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .ilike('name', 'Ajuste de Saldo')
          .maybeSingle();
        if (adjCat) adjustmentCatId = adjCat.id;
      } catch (e) {
        console.error('Error fetching adjustment category:', e);
      }

      // Summary
      // BALANCE: Includes everything (Adjustment included)
      const totalIncome = data.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
      const totalExpense = data.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);

      // DISPLAY INCOME: Excludes 'Ajuste de Saldo' and 'transferencia propria'
      // We check if category_id matches adjustmentCatId or 'd7956754-9a58-487d-9636-2cd59c2f4558'.
      const displayIncome = data
        .filter(t => t.type === 'income' && t.category_id !== adjustmentCatId && t.category_id !== 'd7956754-9a58-487d-9636-2cd59c2f4558')
        .reduce((a, t) => a + Number(t.amount), 0);

      const pending = data.filter(t => t.type === 'expense' && !t.is_paid).reduce((a, t) => a + Number(t.amount), 0);
      const paid = data.filter(t => t.type === 'expense' && t.is_paid).reduce((a, t) => a + Number(t.amount), 0);

      if (mounted) {
        setSummary({
          income: displayIncome, // UI shows filtered income
          expense: totalExpense,
          pending,
          balance: totalIncome - totalExpense, // Balance uses REAL total
          paid
        });

        // Lists
        // Filter out adjustments and transfer from the visible income list
        setIncomeItems(data.filter(t => t.type === 'income' && t.category_id !== adjustmentCatId && t.category_id !== 'd7956754-9a58-487d-9636-2cd59c2f4558'));
        setExpenseItems(data.filter(t => t.type === 'expense'));
      }

      // Week Chart
      if (period === 'week' && mounted) {
        const first = new Date(selectedYear, selectedMonth, 1);
        const last = new Date(selectedYear, selectedMonth + 1, 0);
        const startDowMonday = (first.getDay() + 6) % 7;
        const daysInMonth = last.getDate();
        const weeks = Math.ceil((startDowMonday + daysInMonth) / 7);
        const labels = Array.from({ length: weeks }, (_, i) => `Sem${i + 1}`);
        const vals = Array(weeks).fill(0);

        data.filter(t => {
          if (t.type !== chartType) return false;
          // If chart is Income, exclude Adjustment and transfer
          if (chartType === 'income' && (t.category_id === adjustmentCatId || t.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558')) return false;
          return true;
        }).forEach((t: any) => {
          const d = parseLocalISODate(t.date);
          const dayIndex = d.getDate();
          const totalOffset = startDowMonday + dayIndex - 1;
          const w = Math.floor(totalOffset / 7);
          if (w >= 0 && w < weeks) vals[w] += Number(t.amount || 0);
        });
        setChart({ labels, values: normalize(vals), raw: vals });
      }
    };

    const fetchDashboardData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user || !mounted) return;

      setSummaryLoading(true);

      // We need adjustment ID for charts too, so fetch it once here or inside sub-functions?
      // Better to fetch it once.
      let adjustmentCatId: string | null = null;
      try {
        const { data: adjCat } = await supabase
          .from('user_categories')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', 'Ajuste de Saldo') // Case-insensitive check
          .maybeSingle();
        if (adjCat) adjustmentCatId = adjCat.id;
      } catch (e) { /* ignore */ }


      const promises = [];

      // 1. Month Data (Summary + Lists + Week Chart)
      // This covers the most common view

      promises.push((async () => {
        try {
          const y = selectedYear;
          const m = String(selectedMonth + 1).padStart(2, '0');
          const endDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
          const dStart = `${y}-${m}-01`;
          const dEnd = `${y}-${m}-${endDay}`;

          const { data, error } = await supabase
            .from('user_transactions')
            .select('id, description, amount, type, date, is_paid, category_id') // Added category_id
            .eq('user_id', user.id)
            .gte('date', dStart)
            .lte('date', dEnd)
            .order('date', { ascending: true })
            .order('created_at', { ascending: true });

          if (error) throw error;

          if (data && mounted) {
            await processMonthData(data); // Made async to re-fetch ID if needed, or pass it? passing would be cleaner but processMonthData is defined above.
            // Actually processMonthData fetches ID itself now.
          }
        } catch (err) {
          console.error('Error fetching month data:', err);
        } finally {
          if (mounted) setSummaryLoading(false);
        }
      })());

      // 2. Day Chart (Current Week)
      if (period === 'day') {
        promises.push((async () => {
          const now = new Date();
          const todayISO = getSPDateISO(now);
          const today = parseLocalISODate(todayISO);
          const mondayOffset = (today.getDay() + 6) % 7;
          const start = new Date(today);
          start.setDate(today.getDate() - mondayOffset);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);

          const fmt = (d: Date) => {
            const Y = d.getFullYear();
            const M = String(d.getMonth() + 1).padStart(2, '0');
            const D = String(d.getDate()).padStart(2, '0');
            return `${Y}-${M}-${D}`;
          };

          const { data } = await supabase
            .from('user_transactions')
            .select('amount, date, category_id')
            .eq('user_id', user.id)
            .eq('type', chartType)
            .gte('date', fmt(start))
            .lte('date', fmt(end));

          if (data && mounted) {
            const vals = Array(7).fill(0);
            data.forEach((t: any) => {
              // Filter out Adjustment and transfer if chart type is Income
              if (chartType === 'income' && (t.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558' || (adjustmentCatId && t.category_id === adjustmentCatId))) return;

              const d = parseLocalISODate(t.date);
              const idx = (d.getDay() + 6) % 7;
              vals[idx] += Number(t.amount || 0);
            });
            const c = { labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], values: normalize(vals), raw: vals };
            setChart(c);
          }
        })());
      }

      // 3. Month Chart (Year View)
      if (period === 'month') {
        promises.push((async () => {
          const start = `${chartYear}-01-01`;
          const end = `${chartYear}-12-31`;
          const { data } = await supabase
            .from('user_transactions')
            .select('amount, date, category_id')
            .eq('user_id', user.id)
            .eq('type', chartType)
            .gte('date', start)
            .lte('date', end);

          if (data && mounted) {
            const vals = Array(12).fill(0);
            data.forEach((t: any) => {
              // Filter out Adjustment and transfer if chart type is Income
              if (chartType === 'income' && (t.category_id === 'd7956754-9a58-487d-9636-2cd59c2f4558' || (adjustmentCatId && t.category_id === adjustmentCatId))) return;

              const d = parseLocalISODate(t.date);
              const idx = d.getMonth();
              vals[idx] += Number(t.amount || 0);
            });
            const c = { labels: last12MonthsLabels(), values: normalize(vals), raw: vals };
            setChart(c);
          }
        })());
      }

      if (promises.length > 0) await Promise.all(promises);
    };

    fetchDashboardData();


    const channel = supabase
      .channel('dashboard_charts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_transactions' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedYear, selectedMonth, period, chartType, chartYear]);




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
      className="flex flex-col p-4 pt-6 gap-6 min-h-screen text-gray-900 dark:text-gray-100 pb-32 bg-transparent"
    >
      <Header
        title={
          <div className="flex flex-col items-center gap-1 py-0.5 w-full">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none select-none">Visão Geral</h1>
            
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

      <div className="flex w-full overflow-x-auto snap-x snap-mandatory gap-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] pb-2">
        {/* Saldo Total Card */}
        {/* Altura reduzida para min-h-[120px] e padding reduzido para p-4 para um design super compacto */}
        <motion.section
          variants={itemVariants}
          className="w-full min-w-full flex-shrink-0 snap-center rounded-3xl bg-gradient-to-br from-white/90 to-white/60 dark:from-[#8854D0]/10 dark:via-black/40 dark:to-black/60 backdrop-blur-2xl p-4 border border-white/50 dark:border-white/10 shadow-glass dark:shadow-[0_8px_32px_0_rgba(136,84,208,0.12)] relative overflow-hidden transition-all duration-300 min-h-[120px] flex flex-col justify-between"
          data-onboarding="saldo-total"
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-secondary to-primary opacity-80"></div>

          {/* Top Bar Actions with Perfect Alignment */}
          <div className="flex items-center justify-between w-full relative z-10">
            {/* Hide Values Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={togglePrivacy}
              aria-label={isPrivacyEnabled ? 'Mostrar valores' : 'Ocultar valores'}
              className="w-9 h-9 border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 transition-all flex items-center justify-center"
            >
              <img src="https://cdn-icons-png.flaticon.com/512/6423/6423885.png" alt="Ocultar valores" className="h-4 w-4 opacity-75 dark:opacity-90 dark:invert" />
            </motion.button>

            {/* Title Centered dynamically */}
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em] select-none leading-none">Saldo Total</p>

            {/* Div invisível de w-9 para manter simetria perfeita com o botão de ocultar valor da esquerda */}
            <div className="w-9 h-9" />
          </div>

          {/* Margens e tamanho de fonte otimizados (text-3xl e mt-3) para encaixe e alinhamento milimétrico */}
          {summaryLoading ? (
            <div className="flex justify-center mt-3">
              <Skeleton width={200} height={32} />
            </div>
          ) : (
            <h2 className={`text-3xl font-black font-display tracking-tight text-gray-900 dark:text-white text-center mt-3 mb-0.5 ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{formatBRL(summary.balance)}</h2>
          )}
        </motion.section>

        {/* Saldo Já Recebido Card */}
        {/* Altura reduzida para min-h-[120px] e padding reduzido para p-4 para um design super compacto */}
        <motion.section
          variants={itemVariants}
          className="w-full min-w-full flex-shrink-0 snap-center rounded-3xl bg-gradient-to-br from-white/90 to-white/60 dark:from-[#20BF55]/10 dark:via-black/40 dark:to-black/60 backdrop-blur-2xl p-4 border border-white/50 dark:border-white/10 shadow-glass dark:shadow-[0_8px_32px_0_rgba(32,199,89,0.1)] relative overflow-hidden transition-all duration-300 min-h-[120px] flex flex-col justify-between"
          data-onboarding="saldo-atual"
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-secondary via-primary to-secondary opacity-80"></div>

          <div className="flex items-center justify-between w-full relative z-10">
            <div className="w-9" /> {/* Visual Balance Spacing */}
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em] select-none leading-none">Já Recebido</p>
            <div className="w-9" />
          </div>

          {/* Margens e tamanho de fonte otimizados (text-3xl e mt-3) para encaixe e alinhamento milimétrico */}
          {summaryLoading ? (
            <div className="flex justify-center mt-3">
              <Skeleton width={200} height={32} />
            </div>
          ) : (
            <h2 className={`text-3xl font-black font-display tracking-tight text-gray-900 dark:text-white text-center mt-3 mb-0.5 ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{formatBRL(saldoAtual)}</h2>
          )}
        </motion.section>
      </div>

      <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
        {[
          { label: 'Entradas', value: formatBRL(summary.income), icon: 'arrow_downward', color: 'text-[#20BF55]', bg: 'bg-[#20BF55]/15 dark:bg-[#20BF55]/15', border: 'border-[#20BF55]/30 dark:border-[#20BF55]/30', glow: 'hover:shadow-[0_0_25px_rgba(32,191,85,0.25)] hover:border-[#20BF55]/40' },
          { label: 'Saídas', value: formatBRL(summary.expense), icon: 'arrow_upward', color: 'text-[#FF6B6B]', bg: 'bg-[#FF6B6B]/15 dark:bg-[#FF6B6B]/15', border: 'border-[#FF6B6B]/30 dark:border-[#FF6B6B]/30', glow: 'hover:shadow-[0_0_25px_rgba(255,107,107,0.25)] hover:border-[#FF6B6B]/40' },
          { label: 'Já pagos', value: formatBRL(summary.paid), icon: 'check_circle', color: 'text-[#20BF55]', bg: 'bg-[#20BF55]/15 dark:bg-[#20BF55]/15', border: 'border-[#20BF55]/30 dark:border-[#20BF55]/30', glow: 'hover:shadow-[0_0_25px_rgba(32,191,85,0.25)] hover:border-[#20BF55]/40' },
          { label: 'Não Pagos', value: formatBRL(summary.pending), icon: 'hourglass_empty', color: 'text-[#FF6B6B]', bg: 'bg-[#FF6B6B]/15 dark:bg-[#FF6B6B]/15', border: 'border-[#FF6B6B]/30 dark:border-[#FF6B6B]/30', glow: 'hover:shadow-[0_0_25px_rgba(255,107,107,0.25)] hover:border-[#FF6B6B]/40' },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            className={`rounded-3xl ${item.bg} p-3 border ${item.border} shadow-glass-sm backdrop-blur-md transition-all duration-300 cursor-pointer ${item.glow} flex flex-col items-center justify-center gap-2.5 h-[92px]`}
            whileHover={{ y: -4 }}
            data-onboarding={item.label === 'Entradas' ? 'card-entradas' : (item.label === 'Já pagos' ? 'card-ja-pagos' : (item.label === 'Não Pagos' ? 'card-nao-pagos' : undefined))}
            onClick={() => {
              if (item.label === 'Entradas') navigate('/transactions?type=income');
              if (item.label === 'Saídas') navigate('/transactions?type=expense');
              if (item.label === 'Não Pagos') navigate('/transactions?status=pending&type=expense');
              if (item.label === 'Já pagos') navigate('/transactions?status=paid&type=expense');
            }}
          >
            <div className="flex items-center justify-center gap-1.5 w-full">
              <div className={`w-5 h-5 rounded-full bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 ${item.color} flex items-center justify-center flex-shrink-0`}>
                <span className="material-symbols-outlined !text-[10px] leading-none">{item.icon}</span>
              </div>
              <p className={`text-[9px] font-black uppercase tracking-[0.15em] ${item.color} leading-none`}>{item.label}</p>
            </div>
            {summaryLoading ? (
              <Skeleton width={100} height={20} className="mx-auto" />
            ) : (
              <p className={`text-xl font-black ${item.color} font-display tracking-tight leading-none text-center w-full ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{item.value}</p>
            )}
          </motion.div>
        ))}

        {/* Card Hoje */}
        <motion.div
          className="rounded-3xl bg-[#007AFF]/10 dark:bg-[#007AFF]/10 p-3 border border-[#007AFF]/20 dark:border-[#007AFF]/20 shadow-glass-sm backdrop-blur-md hover:shadow-glass hover:shadow-[0_0_25px_rgba(0,122,255,0.25)] hover:border-[#007AFF]/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group flex flex-col items-center justify-center gap-2.5 h-[92px]"
          whileHover={{ y: -4 }}
          onClick={() => {
            const now = new Date();
            const todayISO = getSPDateISO(now);
            navigate(`/transactions?type=expense&date=${todayISO}`);
          }}
        >
          <div className="flex items-center justify-center w-full relative">
            {/* Indicador de porcentagem premium alinhado à esquerda de forma absoluta e discreta */}
            <div className="absolute left-0 flex items-center">
              {!loading && (
                (() => {
                  const diff = todayExpense - yesterdayExpense;
                  if (yesterdayExpense === 0 && todayExpense === 0) return <span className="material-symbols-outlined text-[10px] text-gray-400 font-bold leading-none">drag_handle</span>;
                  if (yesterdayExpense === 0 && todayExpense > 0) return (
                    <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#20BF55]/10 border border-[#20BF55]/20 text-[#20BF55] text-[7.5px] font-black leading-none uppercase tracking-wider scale-95 select-none">
                      <span className="material-symbols-outlined !text-[8px] font-bold">arrow_upward</span>
                      <span>100%</span>
                    </div>
                  );

                  const pct = (diff / yesterdayExpense) * 100;
                  if (diff > 0) return (
                    <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#20BF55]/10 border border-[#20BF55]/20 text-[#20BF55] text-[7.5px] font-black leading-none uppercase tracking-wider scale-95 select-none">
                      <span className="material-symbols-outlined !text-[8px] font-bold">arrow_upward</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                  );
                  if (diff < 0) return (
                    <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-[7.5px] font-black leading-none uppercase tracking-wider scale-95 select-none">
                      <span className="material-symbols-outlined !text-[8px] font-bold">arrow_downward</span>
                      <span>{Math.abs(pct).toFixed(0)}%</span>
                    </div>
                  );
                  return <span className="material-symbols-outlined text-[10px] text-gray-400 font-bold leading-none">drag_handle</span>;
                })()
              )}
            </div>

            {/* Ícone e título perfeitamente centralizados sem interferência */}
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 text-[#007AFF] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined !text-[10px] leading-none">today</span>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#007AFF] leading-none">Hoje</p>
            </div>
          </div>
          
          {loading ? (
            <Skeleton width={120} height={20} className="mx-auto" />
          ) : (
            <p className={`text-xl font-black text-[#FF6B6B] tracking-tight text-center w-full leading-none ${isPrivacyEnabled ? 'blur-sm' : ''}`}>
              {formatBRL(todayExpense)}
            </p>
          )}
        </motion.div>

        {/* Card Ontem */}
        <motion.div
          className="rounded-3xl bg-[#8854D0]/10 dark:bg-[#8854D0]/10 p-3 border border-[#8854D0]/20 dark:border-[#8854D0]/20 shadow-glass-sm backdrop-blur-md hover:shadow-glass hover:shadow-[0_0_25px_rgba(136,84,208,0.25)] hover:border-[#8854D0]/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative flex flex-col items-center justify-center gap-2.5 h-[92px]"
          whileHover={{ y: -4 }}
          onClick={() => {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayISO = getSPDateISO(yesterday);
            navigate(`/transactions?type=expense&date=${yesterdayISO}`);
          }}
        >
          <div className="flex items-center justify-center gap-1.5 w-full">
            <div className="w-5 h-5 rounded-full bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 text-[#8854D0] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined !text-[10px] leading-none">calendar_today</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#8854D0] leading-none">Ontem</p>
          </div>
          
          {loading ? (
            <Skeleton width={120} height={20} className="mx-auto" />
          ) : (
            <p className={`text-xl font-black text-[#FF6B6B] tracking-tight text-center w-full leading-none ${isPrivacyEnabled ? 'blur-sm' : ''}`}>
              {formatBRL(yesterdayExpense)}
            </p>
          )}
        </motion.div>
      </motion.section>

      <motion.section variants={itemVariants} className="mt-8">
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsChartsOpen(!isChartsOpen)}>
            <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-center justify-center shadow-sm">
              <img src="https://cdn-icons-png.flaticon.com/512/1011/1011528.png" alt="Ícone gráficos" className="w-6 h-6 dark:invert" />
            </div>
            <h3 className="text-xl font-black uppercase text-gray-900 dark:text-white tracking-tight">Gráficos</h3>
          </div>

          <button
            onClick={() => setIsChartsOpen(!isChartsOpen)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none text-gray-400 dark:text-gray-300"
          >
            <span
              className={`material-symbols-outlined transition-transform duration-300 ${isChartsOpen ? 'rotate-180' : ''}`}
            >
              expand_more
            </span>
          </button>
        </div>

        <AnimatePresence>
          {isChartsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-1">
                {/* Period Toggle */}
                <div className="bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl flex items-center shadow-inner border border-black/5 dark:border-white/10">
                  <button
                    onClick={() => setPeriod('day')}
                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${period === 'day' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg shadow-gray-900/20 dark:shadow-white/10 scale-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white scale-95 hover:scale-100'}`}
                  >
                    DIA
                  </button>
                  <button
                    onClick={() => setPeriod('month')}
                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${period === 'month' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg shadow-gray-900/20 dark:shadow-white/10 scale-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white scale-95 hover:scale-100'}`}
                  >
                    MÊS
                  </button>
                </div>

                {/* Type Toggle */}
                <button
                  onClick={() => setChartType(prev => prev === 'expense' ? 'income' : 'expense')}
                  className={`px-6 py-3 rounded-2xl text-xs font-black text-white shadow-lg transition-all active:scale-95 ${chartType === 'expense' ? 'bg-[#FF6B6B] shadow-[#FF6B6B]/30' : 'bg-[#20BF55] shadow-[#20BF55]/30'}`}
                >
                  {chartType === 'expense' ? 'SAÍDAS' : 'ENTRADAS'}
                </button>
              </div>

              {/* Chart Container */}
              {/* Padding horizontal reduzido em mobile (px-3.5) para maximizar área disponível para as 12 barras */}
              <div className="w-full bg-white dark:bg-gradient-to-br dark:from-[#1C1C1E] dark:to-black rounded-[2rem] px-3.5 py-6 sm:p-6 sm:pb-8 shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-gray-100/50 dark:border-white/10 relative overflow-hidden min-h-[360px] flex flex-col justify-end">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={`${period}-${chartYear}-${chartType}`}
                    custom={direction}
                    variants={chartVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="w-full h-full flex flex-col justify-end"
                    drag={period === 'month' ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={handleChartSwipe}
                  >
                    {/* Bars visualization */}
                    {/* Gaps e padding redimensionados para celular (gap-1) garantindo que Dezembro caiba perfeitamente no card */}
                    <div className="flex items-end justify-between gap-1 sm:gap-3.5 h-[280px] w-full px-1">
                      {current.values.map((h, i) => {
                        const rawVal = (chart.raw || current.raw || [])[i] || 0;
                        
                        // Formatação localizada compacta em BRL omitindo os centavos para maximizar espaço no gráfico
                        const labelText = new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(rawVal);
                        
                        const isHighlighted = period === 'month' && i === selectedMonth && chartYear === selectedYear;
                        
                        // O valor rotacionado passa a ser exibido em todas as barras maiores que zero de forma garantida e limpa
                        const showInsideLabel = rawVal > 0;
                        
                        // Premium holographic gradients for chart bars
                        // Expense (Saídas) agora usa um vermelho puro neon intenso e elegante
                        const barGradientClass = chartType === 'expense'
                          ? 'bg-gradient-to-t from-[#E02020] via-[#FF3B30] to-[#FF5252] dark:from-[#C01010]/90 dark:via-[#FF3B30]/90 dark:to-[#FF5252]/90 shadow-[0_4px_16px_rgba(255,59,48,0.25)] hover:shadow-[0_4px_24px_rgba(255,59,48,0.45)]'
                          : 'bg-gradient-to-t from-[#20BF55] via-[#24B47E] to-[#10B981] dark:from-[#159A3E]/90 dark:via-[#24B47E]/90 dark:to-[#10B981]/90 shadow-[0_4px_16px_rgba(32,199,89,0.25)] hover:shadow-[0_4px_24px_rgba(32,199,89,0.45)]';

                        return (
                          <div key={i} className="flex flex-col items-center justify-end h-full w-full gap-2 sm:gap-3 group relative cursor-pointer" onClick={() => {
                            if (period === 'month') {
                              setSelectedMonth(i);
                            }
                          }}>
                            {/* Visual Bar with Elastic spring animation and Glow */}
                            {/* Largura da barra otimizada (max-w-[20px]) para não espremer em telas estreitas */}
                            <motion.div
                              layout
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(4, h)}%` }}
                              transition={{ duration: 0.8, delay: i * 0.04, type: "spring", bounce: 0.1 }}
                              className={`w-full max-w-[20px] sm:max-w-[32px] rounded-t-2xl rounded-b-md relative overflow-hidden transition-all duration-300 border border-white/5 ${isHighlighted || period === 'day' ? 'opacity-100 scale-105 shadow-xl ring-2 ring-white/30 dark:ring-white/10' : 'opacity-40 hover:opacity-90'} ${barGradientClass}`}
                            >
                              {/* Rotated Label Inside Only with Perfect Centering */}
                              {showInsideLabel && (
                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                                  <span
                                    className={`rotate-[-90deg] text-[9px] font-semibold text-white whitespace-nowrap tracking-wide select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${isPrivacyEnabled ? 'filter blur-sm select-none' : ''}`}
                                    style={{ fontFamily: "'Manrope', sans-serif" }}
                                  >
                                    {labelText}
                                  </span>
                                </div>
                              )}
                            </motion.div>

                            {/* X-Axis Label */}
                            {/* Fonte compacta e espaçamento super slim em mobile (text-[8.5px] tracking-tighter) para alinhamento impecável */}
                            <span className={`text-[8.5px] sm:text-[10px] font-bold uppercase tracking-tighter sm:tracking-wider transition-colors ${isHighlighted ? 'text-gray-900 dark:text-white scale-105 font-black' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                              {current.labels[i]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsReportOpen(!isReportOpen)}>
            <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-center justify-center shadow-sm">
              <img src="https://cdn-icons-png.flaticon.com/512/6811/6811275.png" alt="Ícone relatório" className="w-6 h-6 dark:invert" />
            </div>
            <h3 className="text-xl font-black uppercase text-gray-900 dark:text-white tracking-tight">Relatório</h3>
          </div>

          <button
            onClick={() => setIsReportOpen(!isReportOpen)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none text-gray-400 dark:text-gray-300"
          >
            <span
              className={`material-symbols-outlined transition-transform duration-300 ${isReportOpen ? 'rotate-180' : ''}`}
            >
              expand_more
            </span>
          </button>
        </div>
        <AnimatePresence>
          {isReportOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden flex flex-col gap-4"
            >
              <motion.section variants={itemVariants} className="rounded-3xl bg-gradient-to-br from-white/70 to-white/40 dark:from-[#1C1C1E]/60 dark:to-black/60 p-6 border border-white/50 dark:border-white/10 shadow-glass dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl" ref={entriesRef}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <span className="material-symbols-outlined text-xl rounded-full p-2 bg-success/20 text-success">arrow_downward</span>
                    <p className="text-lg font-black text-gray-900 dark:text-white cursor-pointer uppercase tracking-tight" onClick={() => setEntriesCollapsed(v => !v)}>Entradas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-white/20 dark:border-white/10 backdrop-blur-md">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
                    {entriesCollapsed && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEntriesCollapsed(false)} className="p-1.5 rounded-full bg-white/50 dark:bg-white/5 hover:bg-white/80 border border-white/20 dark:border-white/10">
                        <span className="material-symbols-outlined text-sm text-gray-900 dark:text-white">expand_more</span>
                      </motion.button>
                    )}
                  </div>
                </div>
                {!entriesCollapsed && (
                  <div className="divide-y divide-gray-200/50 dark:divide-white/5 max-h-[295px] overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
                    {incomeItems.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium py-8 text-center italic">Nenhuma entrada registrada</p>
                    )}
                    {incomeItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between py-3 hover:bg-white/30 dark:hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{labelForDate(it.date)}</span>
                          <span className={`text-sm font-bold text-gray-900 dark:text-gray-100 ${it.is_paid ? 'line-through opacity-60' : ''}`}>{it.description || 'Sem descrição'}</span>
                        </div>
                        <span className={`text-sm font-black text-success bg-success/10 px-3 py-1 rounded-lg border border-success/20 ${it.is_paid ? 'line-through opacity-60' : ''} ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              <motion.section variants={itemVariants} className="rounded-3xl bg-gradient-to-br from-white/70 to-white/40 dark:from-[#1C1C1E]/60 dark:to-black/60 p-6 border border-white/50 dark:border-white/10 shadow-glass dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl" ref={expensesRef}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <span className="material-symbols-outlined text-xl rounded-full p-2 bg-danger/20 text-danger">arrow_upward</span>
                    <p className="text-lg font-black text-gray-900 dark:text-white cursor-pointer uppercase tracking-tight" onClick={() => setExpensesCollapsed(v => !v)}>Saídas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-white/20 dark:border-white/10 backdrop-blur-md">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
                    {expensesCollapsed && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setExpensesCollapsed(false)} className="p-1.5 rounded-full bg-white/50 dark:bg-white/5 hover:bg-white/80 border border-white/20 dark:border-white/10 text-gray-900 dark:text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm text-gray-900 dark:text-white">expand_more</span>
                      </motion.button>
                    )}
                  </div>
                </div>
                {!expensesCollapsed && (
                  <div className="divide-y divide-gray-200/50 dark:divide-white/5 max-h-[295px] overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
                    {expenseItems.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium py-8 text-center italic">Nenhuma saída registrada</p>
                    )}
                    {expenseItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between py-3 hover:bg-white/30 dark:hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{labelForDate(it.date)}</span>
                          <span className={`text-sm font-bold text-gray-900 dark:text-gray-100 ${it.is_paid ? 'line-through opacity-60' : ''}`}>{it.description || 'Sem descrição'}</span>
                        </div>
                        <span className={`text-sm font-black text-danger bg-danger/10 px-3 py-1 rounded-lg border border-danger/20 ${it.is_paid ? 'line-through opacity-60' : ''} ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>


    </motion.div>
  );
};

export default Dashboard;

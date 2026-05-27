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
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .eq('is_paid', true)
        .gte('date', start)
        .lte('date', end);

      const totalPaidIncome = incomeData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
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
      return vals.map(v => (v === 0 ? 0 : Math.max(6, Math.round((v / max) * 100))));
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

      // DISPLAY INCOME: Excludes 'Ajuste de Saldo'
      // We check if category_id matches adjustmentCatId.
      const displayIncome = data
        .filter(t => t.type === 'income' && t.category_id !== adjustmentCatId)
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
        // Filter out adjustments from the visible income list
        setIncomeItems(data.filter(t => t.type === 'income' && t.category_id !== adjustmentCatId));
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
          // If chart is Income, exclude Adjustment
          if (chartType === 'income' && t.category_id === adjustmentCatId) return false;
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
              // Filter out Adjustment if chart type is Income
              if (chartType === 'income' && adjustmentCatId && t.category_id === adjustmentCatId) return;

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
              // Filter out Adjustment if chart type is Income
              if (chartType === 'income' && adjustmentCatId && t.category_id === adjustmentCatId) return;

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
      className="flex flex-col p-4 pt-6 gap-6 min-h-screen text-gray-900 pb-32"
    >
      <Header
        title="Visão Geral"
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
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/notifications')}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-white/40 shadow-sm backdrop-blur-md transition-all text-gray-700"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-white"></span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/settings')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-white/40 shadow-sm backdrop-blur-md transition-all text-gray-700"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </motion.button>
          </div>
        }
      />

      {showMonthPicker && (
        <div className="flex justify-center relative z-40 mb-4">
          <div className="w-full max-w-[340px] rounded-3xl bg-white/90 backdrop-blur-xl p-5 border border-white/40 shadow-glass-lg">
            <div className="flex items-center justify-between mb-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSelectedYear(y => y - 1)} className="p-2 rounded-full hover:bg-black/5 text-gray-900"><span className="material-symbols-outlined">chevron_left</span></motion.button>
              <span className="text-lg font-bold text-gray-900">{selectedYear}</span>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSelectedYear(y => y + 1)} className="p-2 rounded-full hover:bg-black/5 text-gray-900"><span className="material-symbols-outlined">chevron_right</span></motion.button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[selectedYear - 2, selectedYear - 1, selectedYear].map((y) => (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={y === selectedYear ? 'px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/30' : 'px-3 py-2 rounded-xl bg-black/5 text-xs font-medium hover:bg-black/10 text-gray-500'}
                >{y}</motion.button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {monthNames.map((m, idx) => (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={m}
                  onClick={() => { setSelectedMonth(idx); setShowMonthPicker(false); }}
                  className={idx === selectedMonth ? 'px-2 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/30' : 'px-2 py-2.5 rounded-xl bg-black/5 text-xs font-medium hover:bg-black/10 text-gray-500'}
                >{m}</motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex w-full overflow-x-auto snap-x snap-mandatory gap-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] -mx-4 px-4 pb-2">
        {/* Saldo Total Card */}
        <motion.section
          variants={itemVariants}
          className="min-w-full snap-center rounded-3xl bg-white/60 backdrop-blur-xl p-6 border border-white/40 shadow-glass relative overflow-hidden"
          data-onboarding="saldo-total"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>

          {/* Hide Values Button - Top Left */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={togglePrivacy}
            aria-label={isPrivacyEnabled ? 'Mostrar valores' : 'Ocultar valores'}
            className="absolute top-6 left-6 p-0 border-0 bg-transparent cursor-pointer hover:opacity-70 transition-opacity"
          >
            <img src="https://cdn-icons-png.flaticon.com/512/6423/6423885.png" alt="Ocultar valores" className="h-5 w-5 opacity-70" />
          </motion.button>

          {/* 'Este Mês' Button - Top Right */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMonthPicker(s => !s)}
            className="absolute top-6 right-6 p-0 border-0 bg-transparent text-gray-500 hover:text-gray-900 font-bold text-sm transition-colors"
          >
            {selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}
          </motion.button>

          <p className="text-xs font-bold text-gray-500 mb-2 text-center uppercase tracking-widest">Saldo Total</p>
          {summaryLoading ? (
            <div className="flex justify-center">
              <Skeleton width={200} height={48} />
            </div>
          ) : (
            <h2 className={`text-5xl font-black tracking-tighter text-gray-900 text-center ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{formatBRL(summary.balance)}</h2>
          )}
        </motion.section>

        {/* Saldo Atual Card (Já Recebido) */}
        <motion.section
          variants={itemVariants}
          className="min-w-full snap-center rounded-3xl bg-white/60 backdrop-blur-xl p-6 border border-white/40 shadow-glass relative overflow-hidden"
          data-onboarding="saldo-atual"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>

          <p className="text-xs font-bold text-gray-500 mb-2 text-center uppercase tracking-widest">Já Recebido</p>
          {summaryLoading ? (
            <div className="flex justify-center">
              <Skeleton width={200} height={48} />
            </div>
          ) : (
            <h2 className={`text-5xl font-black tracking-tighter text-gray-900 text-center ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{formatBRL(saldoAtual)}</h2>
          )}
        </motion.section>
      </div>

      <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
        {[
          { label: 'Entradas', value: formatBRL(summary.income), icon: 'arrow_downward', color: 'text-secondary', bg: 'bg-secondary/10 dark:bg-secondary/20' },
          { label: 'Saídas', value: formatBRL(summary.expense), icon: 'arrow_upward', color: 'text-danger', bg: 'bg-danger/10 dark:bg-danger/20' },
          { label: 'Já pagos', value: formatBRL(summary.paid), icon: 'check_circle', color: 'text-secondary', bg: 'bg-secondary/10 dark:bg-secondary/20' },
          { label: 'Não Pagos', value: formatBRL(summary.pending), icon: 'hourglass_empty', color: 'text-danger', bg: 'bg-danger/10 dark:bg-danger/20' },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            className={`rounded-2xl ${item.bg} p-4 border border-white/20 dark:border-white/10 shadow-glass-sm backdrop-blur-md hover:shadow-glass hover:-translate-y-1 transition-all cursor-pointer`}
            whileHover={{ y: -4 }}
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary dark:text-white opacity-80">{item.label}</p>
            </div>
            {summaryLoading ? (
              <Skeleton width={100} height={28} />
            ) : (
              <p className={`text-lg font-black text-text-primary dark:text-white tracking-tight ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{item.value}</p>
            )}
          </motion.div>
        ))}

        {/* Card Hoje */}
        <motion.div
          className="rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 p-4 border border-blue-500/20 shadow-glass-sm backdrop-blur-md hover:shadow-glass hover:-translate-y-1 transition-all cursor-pointer relative group"
          whileHover={{ y: -4 }}
          onClick={() => {
            const now = new Date();
            const todayISO = getSPDateISO(now);
            navigate(`/transactions?type=expense&date=${todayISO}`);
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-primary-blue">
              <span className="material-symbols-outlined text-xl">today</span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary dark:text-white opacity-80">Hoje</p>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] p-1.5 rounded-lg pointer-events-none z-10 backdrop-blur-md">
              Comparação com ontem
            </div>
          </div>
          {loading ? (
            <Skeleton width={120} height={28} />
          ) : (
            <p className={`text-lg font-black text-text-primary dark:text-white tracking-tight ${isPrivacyEnabled ? 'blur-sm' : ''}`}>
              {formatBRL(todayExpense)}
            </p>
          )}

          <div className="flex items-center gap-1 mt-1">
            {loading ? (
              <Skeleton width={60} height={20} />
            ) : (
              (() => {
                const diff = todayExpense - yesterdayExpense;
                if (yesterdayExpense === 0 && todayExpense === 0) return <span className="material-symbols-outlined text-sm text-gray-400 font-bold">drag_handle</span>;
                if (yesterdayExpense === 0 && todayExpense > 0) return (
                  <>
                    <span className="material-symbols-outlined text-sm text-success font-bold">arrow_upward</span>
                    <span className="text-xs font-bold text-success">100%</span>
                  </>
                );

                const pct = (diff / yesterdayExpense) * 100;
                if (diff > 0) return (
                  <>
                    <span className="material-symbols-outlined text-sm text-success font-bold">arrow_upward</span>
                    <span className="text-xs font-bold text-success">{pct.toFixed(1)}%</span>
                  </>
                );
                if (diff < 0) return (
                  <>
                    <span className="material-symbols-outlined text-sm text-danger font-bold">arrow_downward</span>
                    <span className="text-xs font-bold text-danger">{Math.abs(pct).toFixed(1)}%</span>
                  </>
                );
                return <span className="material-symbols-outlined text-sm text-gray-400 font-bold">drag_handle</span>;
              })()
            )}
          </div>
        </motion.div>

        {/* Card Ontem */}
        <motion.div
          className="rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 p-4 border border-purple-500/20 shadow-glass-sm backdrop-blur-md hover:shadow-glass hover:-translate-y-1 transition-all cursor-pointer group relative"
          whileHover={{ y: -4 }}
          onClick={() => {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayISO = getSPDateISO(yesterday);
            navigate(`/transactions?type=expense&date=${yesterdayISO}`);
          }}
        >
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary dark:text-white opacity-80">Ontem</p>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] p-1.5 rounded-lg pointer-events-none z-10 backdrop-blur-md">
            Total de saídas de ontem
          </div>
          {loading ? (
            <Skeleton width={120} height={28} />
          ) : (
            <p className={`text-lg font-black text-text-primary dark:text-white tracking-tight ${isPrivacyEnabled ? 'blur-sm' : ''}`}>
              {formatBRL(yesterdayExpense)}
            </p>
          )}
        </motion.div>
      </motion.section>



      <motion.section variants={itemVariants} className="mt-8">
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white shadow-sm border border-gray-100">
              <img src="https://cdn-icons-png.flaticon.com/512/1011/1011528.png" alt="Ícone gráficos" className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase text-gray-900 tracking-tight">Gráficos</h3>
          </div>

          <button
            onClick={() => setIsChartsOpen(!isChartsOpen)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
          >
            <span
              className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isChartsOpen ? 'rotate-180' : ''}`}
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
                <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center shadow-inner">
                  <button
                    onClick={() => setPeriod('day')}
                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${period === 'day' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20 scale-100' : 'text-gray-500 hover:text-gray-900 scale-95 hover:scale-100'}`}
                  >
                    DIA
                  </button>
                  <button
                    onClick={() => setPeriod('month')}
                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${period === 'month' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20 scale-100' : 'text-gray-500 hover:text-gray-900 scale-95 hover:scale-100'}`}
                  >
                    MÊS
                  </button>
                </div>

                {/* Type Toggle */}
                <button
                  onClick={() => setChartType(prev => prev === 'expense' ? 'income' : 'expense')}
                  className={`px-6 py-3 rounded-2xl text-xs font-black text-white shadow-lg transition-all active:scale-95 ${chartType === 'expense' ? 'bg-[#FF6B6B] shadow-[#FF6B6B]/30' : 'bg-[#34C759] shadow-[#34C759]/30'}`}
                >
                  {chartType === 'expense' ? 'SAÍDAS' : 'ENTRADAS'}
                </button>
              </div>

              {/* Chart Container */}
              <div className="w-full bg-white rounded-[2rem] p-6 pb-8 shadow-xl shadow-gray-200/50 border border-gray-100/50 relative overflow-hidden min-h-[360px] flex flex-col justify-end">
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
                    <div className="flex items-end justify-between gap-2 sm:gap-4 h-[280px] w-full px-2">
                      {current.values.map((h, i) => {
                        const rawVal = (chart.raw || current.raw || [])[i] || 0;
                        const labelText = formatBRL(rawVal);
                        const isHighlighted = period === 'month' && i === selectedMonth && chartYear === selectedYear;
                        const showInsideLabel = h > 20 && rawVal > 0;

                        return (
                          <div key={i} className="flex flex-col items-center justify-end h-full w-full gap-3 group relative cursor-pointer" onClick={() => {
                            if (period === 'month') {
                              setSelectedMonth(i);
                            }
                          }}>
                            {/* Tooltip/Value (Hover) */}
                            {rawVal > 0 && !showInsideLabel && (
                              <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20">
                                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900 absolute -bottom-1"></div>
                                <div className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-white whitespace-nowrap shadow-lg bg-gray-900 ${isPrivacyEnabled ? 'blur-sm' : ''}`}>
                                  {labelText}
                                </div>
                              </div>
                            )}

                            <motion.div
                              layout
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(4, h)}%` }}
                              transition={{ duration: 0.8, delay: i * 0.04, type: "spring", bounce: 0.2 }}
                              className={`w-full max-w-[48px] rounded-t-xl relative transition-all duration-300 ${isHighlighted || period === 'day' ? 'opacity-100 shadow-md' : 'opacity-40 hover:opacity-80'}`}
                              style={{
                                backgroundColor: chartType === 'expense' ? '#FF6B6B' : '#34C759',
                              }}
                            >
                              {/* Rotated Label Inside */}
                              {showInsideLabel && (
                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                                  <span
                                    className={`rotate-[-90deg] text-[10px] font-bold text-white/90 whitespace-nowrap drop-shadow-sm ${isPrivacyEnabled ? 'blur-sm' : ''}`}
                                  >
                                    {labelText}
                                  </span>
                                </div>
                              )}
                            </motion.div>

                            {/* X-Axis Label */}
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isHighlighted ? 'text-gray-900 scale-110' : 'text-gray-400 group-hover:text-gray-600'}`}>
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
        <button
          onClick={() => setIsReportOpen(!isReportOpen)}
          className="w-full flex items-center justify-between group focus:outline-none mb-4"
          aria-expanded={isReportOpen}
        >
          <h3 className="text-lg font-black uppercase text-gray-900 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20">
              <img src="https://cdn-icons-png.flaticon.com/512/6811/6811275.png" alt="Ícone relatório" className="w-5 h-5" />
            </div>
            RELATÓRIO
          </h3>
          <span
            className={`material-symbols-outlined text-gray-500 transition-transform duration-300 ${isReportOpen ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </button>
        <AnimatePresence>
          {isReportOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden flex flex-col gap-4"
            >
              <motion.section variants={itemVariants} className="rounded-3xl bg-white/60 p-6 border border-white/40 shadow-glass backdrop-blur-xl" ref={entriesRef}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-gray-900">
                    <span className="material-symbols-outlined text-xl rounded-full p-2 bg-success/20 text-success">arrow_downward</span>
                    <p className="text-lg font-black text-gray-900 cursor-pointer uppercase tracking-tight" onClick={() => setEntriesCollapsed(v => !v)}>Entradas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-600 bg-white/50 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
                    {entriesCollapsed && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEntriesCollapsed(false)} className="p-1.5 rounded-full bg-white/50 hover:bg-white/80">
                        <span className="material-symbols-outlined text-sm text-gray-900">expand_more</span>
                      </motion.button>
                    )}
                  </div>
                </div>
                {!entriesCollapsed && (
                  <div className="divide-y divide-gray-200/50 max-h-64 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
                    {incomeItems.length === 0 && (
                      <p className="text-sm text-gray-500 font-medium py-8 text-center italic">Nenhuma entrada registrada</p>
                    )}
                    {incomeItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between py-3 hover:bg-white/30 px-2 -mx-2 rounded-lg transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{labelForDate(it.date)}</span>
                          <span className={`text-sm font-bold text-gray-900 ${it.is_paid ? 'line-through opacity-60' : ''}`}>{it.description || 'Sem descrição'}</span>
                        </div>
                        <span className={`text-sm font-black text-success bg-success/10 px-3 py-1 rounded-lg border border-success/20 ${it.is_paid ? 'line-through opacity-60' : ''} ${isPrivacyEnabled ? 'filter blur-md opacity-60 select-none' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              <motion.section variants={itemVariants} className="rounded-3xl bg-white/60 p-6 border border-white/40 shadow-glass backdrop-blur-xl" ref={expensesRef}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-gray-900">
                    <span className="material-symbols-outlined text-xl rounded-full p-2 bg-danger/20 text-danger">arrow_upward</span>
                    <p className="text-lg font-black text-gray-900 cursor-pointer uppercase tracking-tight" onClick={() => setExpensesCollapsed(v => !v)}>Saídas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-600 bg-white/50 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">{selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() ? 'Este Mês' : `${monthNames[selectedMonth]} ${selectedYear}`}</span>
                    {expensesCollapsed && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setExpensesCollapsed(false)} className="p-1.5 rounded-full bg-white/50 hover:bg-white/80">
                        <span className="material-symbols-outlined text-sm text-gray-900">expand_more</span>
                      </motion.button>
                    )}
                  </div>
                </div>
                {!expensesCollapsed && (
                  <div className="divide-y divide-gray-200/50 max-h-64 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
                    {expenseItems.length === 0 && (
                      <p className="text-sm text-gray-500 font-medium py-8 text-center italic">Nenhuma saída registrada</p>
                    )}
                    {expenseItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between py-3 hover:bg-white/30 px-2 -mx-2 rounded-lg transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{labelForDate(it.date)}</span>
                          <span className={`text-sm font-bold text-gray-900 ${it.is_paid ? 'line-through opacity-60' : ''}`}>{it.description || 'Sem descrição'}</span>
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

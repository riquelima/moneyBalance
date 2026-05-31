import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [saldoAnual, setSaldoAnual] = useState(0);

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

    // 1.6 Saldo Anual (Current Year Paid Income)
    promises.push((async () => {
      const now = new Date();
      const y = now.getFullYear();
      const startYear = `${y}-01-01`;
      const endYear = `${y}-12-31`;

      const { data: incomeYearData } = await supabase
        .from('user_transactions')
        .select('amount, category_id')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .eq('is_paid', true)
        .gte('date', startYear)
        .lte('date', endYear);

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

      const totalPaidYearIncome = incomeYearData
        ?.filter(t => t.category_id !== adjustmentCatId && t.category_id !== 'd7956754-9a58-487d-9636-2cd59c2f4558')
        ?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      setSaldoAnual(totalPaidYearIncome);
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

  const getDueLabel = (dateStr: string) => {
    const today = new Date();
    const due = parseLocalISODate(dateStr);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `Atrasada há ${Math.abs(diffDays)} dias`;
    if (diffDays === 0) return `Vence hoje`;
    if (diffDays === 1) return `Vence amanhã`;
    return `Faltam ${diffDays} dias`;
  };

  const getExpenseDelta = () => {
    if (yesterdayExpense === 0 && todayExpense === 0) return { text: '↘ 0%', class: 'down' };
    if (yesterdayExpense === 0 && todayExpense > 0) return { text: '↗ 100%', class: 'up' };
    const diff = todayExpense - yesterdayExpense;
    const pct = (diff / yesterdayExpense) * 100;
    if (diff > 0) return { text: `↗ ${pct.toFixed(0)}%`, class: 'up' };
    return { text: `↘ ${Math.abs(pct).toFixed(0)}%`, class: 'down' };
  };

  const getSavingsDelta = () => {
    const savingsRatio = summary.income > 0 ? (summary.balance / summary.income) * 100 : 0;
    if (savingsRatio >= 0) return { text: `↗ ${savingsRatio.toFixed(0)}%`, class: 'up' };
    return { text: `↘ ${Math.abs(savingsRatio).toFixed(0)}%`, class: 'down' };
  };

  const renderLogoBubble = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('apple') || t.includes('icloud')) {
      return (
        <div className="logo-bubble" aria-hidden="true">
          <svg width="20" height="22" viewBox="0 0 24 26" fill="currentColor"><path d="M16.7 1.6c.1 1.7-.6 3.1-1.6 4.1-1.1 1.1-2.6 1.9-4.1 1.8-.2-1.6.5-3.1 1.5-4.1 1.1-1.2 2.9-2 4.2-1.8ZM21.5 18.8c-.6 1.4-.9 2-1.7 3.3-1.1 1.7-2.7 3.9-4.7 3.9-1.8 0-2.2-1.2-4.6-1.1-2.4 0-2.9 1.1-4.7 1.1-2 0-3.5-2-4.6-3.7-3.2-5-3.5-10.9-1.5-14 1.4-2.2 3.7-3.5 5.8-3.5 2.2 0 3.5 1.2 5.3 1.2 1.7 0 2.8-1.2 5.3-1.2 1.9 0 3.9 1 5.3 2.8-4.6 2.5-3.8 9 .1 11.2Z"/></svg>
        </div>
      );
    }
    if (t.includes('youtube') || t.includes('premium')) {
      return (
        <div className="logo-bubble youtube" aria-hidden="true">
          <span className="yt-mark"></span>
        </div>
      );
    }
    if (t.includes('spotify')) {
      return (
        <div className="logo-bubble spotify" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6.4 9.5c4.2-1.2 7.7-.8 11 1.1M7.2 13c3.3-.9 6.2-.6 8.8.9M8 16.3c2.3-.6 4.3-.4 6.2.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
      );
    }
    if (t.includes('paypal')) {
      return (
        <div className="logo-bubble paypal" aria-hidden="true">P</div>
      );
    }
    if (t.includes('notion')) {
      return (
        <div className="logo-bubble notion" aria-hidden="true">N</div>
      );
    }
    return (
      <div className="logo-bubble" aria-hidden="true">
        {title.charAt(0).toUpperCase()}
      </div>
    );
  };

  const formatTxDate = (dateStr: string) => {
    const d = parseLocalISODate(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const pendingBills = expenseItems.filter(t => !t.is_paid);

  const displayBills = pendingBills.length > 0
    ? pendingBills.slice(0, 2).map(b => ({
        id: b.id,
        title: b.description || 'Fatura Pendente',
        amount: Number(b.amount),
        due: getDueLabel(b.date),
        isReal: true
      }))
    : [
        { id: 'f1', title: 'Fatura da Apple #1234', amount: 20.00, due: 'Faltam 2 dias', isReal: false },
        { id: 'f2', title: 'Youtube Premium', amount: 20.00, due: 'Faltam 2 dias', isReal: false }
      ];

  const allTransactions = [...incomeItems, ...expenseItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayTransactions = allTransactions.length > 0
    ? allTransactions.slice(0, 4)
    : [
        { id: 't1', description: 'Fatura da Apple #1234', amount: -20.00, date: '2026-05-31T15:00:00Z', type: 'expense' },
        { id: 't2', description: 'Paypal Invoice #1234', amount: -20.00, date: '2026-05-31T15:00:00Z', type: 'expense' },
        { id: 't3', description: 'Fatura da Apple #1234', amount: -20.00, date: '2026-05-31T15:00:00Z', type: 'expense' },
        { id: 't4', description: 'Fatura da Apple #1234', amount: -20.00, date: '2026-05-31T15:00:00Z', type: 'expense' }
      ];

  const expenseDelta = getExpenseDelta();
  const savingsDelta = getSavingsDelta();

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Orbitron:wght@400;500;600;700;800;900&family=Poppins:wght@200;300;400;500;600;700;800;900&display=swap');

        :root {
          --bg: oklch(91% 0.055 230);
          --surface: oklch(100% 0 0);
          --fg: oklch(22% 0.055 275);
          --muted: oklch(45% 0.07 275);
          --border: oklch(88% 0.035 270);
          --accent: oklch(72% 0.17 25);
          --success: oklch(70% 0.15 155);
          --danger: oklch(68% 0.19 25);
          --nav: oklch(23% 0.055 275);
          --card-blue: oklch(33% 0.11 285);
          --font-display: 'DM Serif Display', serif;
          --font-body: 'Poppins', sans-serif;
          --font-mono: 'Orbitron', sans-serif;
          --shadow-soft: 0 20px 44px color-mix(in oklab, var(--fg), transparent 88%);
          --radius-card: 14px;
          --screen-w: 393px;
        }

        .phone, .phone * {
          font-family: var(--font-body) !important;
        }

        .phone .balance-value {
          font-family: var(--font-display) !important;
          font-weight: 400 !important;
        }

        .phone .digits {
          font-family: var(--font-mono) !important;
          font-weight: 500 !important;
        }

        /* Ajustes precisos de pesos recomendados */
        .phone .name {
          font-weight: 600 !important;
        }
        .phone .welcome {
          font-weight: 400 !important;
        }
        .phone .balance-label {
          font-weight: 500 !important;
        }
        .phone .section-head h2 {
          font-weight: 600 !important;
        }
        .phone .summary-head span,
        .phone .bill-title {
          font-weight: 600 !important;
        }
        .phone .summary-value {
          font-weight: 600 !important;
        }
        .phone .tx-title {
          font-weight: 500 !important;
        }
        .phone .tx-date,
        .phone .due {
          font-weight: 400 !important;
        }
        .phone .tx-amount {
          font-weight: 600 !important;
        }
        .phone .expires {
          font-weight: 400 !important;
        }

        .phone {
          position: relative;
          width: min(100vw, var(--screen-w));
          margin-inline: auto;
          min-height: 100vh;
          overflow-x: hidden;
          overflow-y: auto;
          background:
            radial-gradient(circle at 25% 8%, color-mix(in oklab, var(--surface), transparent 30%) 0 14%, transparent 35%),
            radial-gradient(circle at 80% 9%, color-mix(in oklab, var(--surface), transparent 55%) 0 8%, transparent 27%),
            linear-gradient(180deg, var(--bg) 0 29%, var(--surface) 29% 100%);
          box-shadow: var(--shadow-soft);
        }

        .phone::before {
          content: "";
          position: absolute;
          inset: 0;
          height: 328px;
          background:
            radial-gradient(circle at 76% 45%, color-mix(in oklab, var(--surface), transparent 54%) 0 19%, transparent 39%),
            radial-gradient(circle at 9% 33%, color-mix(in oklab, var(--surface), transparent 42%) 0 22%, transparent 37%);
          clip-path: ellipse(88% 73% at 58% 0%);
          pointer-events: none;
        }

        .statusbar {
          position: relative;
          z-index: 2;
          height: 43px;
          padding: 14px 9px 0 30px;
          display: flex;
          align-items: start;
          justify-content: space-between;
          font-weight: 700;
          font-size: 15px;
          line-height: 1;
          color: color-mix(in oklab, var(--fg), black 28%);
        }

        .status-icons {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-right: 5px;
        }

        .signal {
          display: inline-grid;
          grid-template-columns: repeat(4, 3px);
          align-items: end;
          gap: 1.5px;
          height: 12px;
        }
        .signal span { width: 3px; border-radius: 2px; background: currentColor; }
        .signal span:nth-child(1) { height: 4px; }
        .signal span:nth-child(2) { height: 6px; }
        .signal span:nth-child(3) { height: 8px; }
        .signal span:nth-child(4) { height: 11px; }

        .battery {
          width: 23px;
          height: 11px;
          border: 1.6px solid currentColor;
          border-radius: 2.5px;
          position: relative;
          padding: 1.5px;
        }
        .battery::before {
          content: "";
          position: absolute;
          right: -3.5px;
          top: 3px;
          width: 2px;
          height: 4px;
          border-radius: 0 2px 2px 0;
          background: currentColor;
        }
        .battery::after {
          content: "";
          display: block;
          height: 100%;
          width: 76%;
          border-radius: 1px;
          background: currentColor;
        }

        .content-box {
          position: relative;
          z-index: 1;
          padding: 13px 16px 140px;
        }

        .topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .identity {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 32% 20%, var(--surface), color-mix(in oklab, var(--border), var(--surface) 30%));
          border: 1px solid color-mix(in oklab, var(--surface), var(--border) 60%);
          color: color-mix(in oklab, var(--fg), black 12%);
          font-family: var(--font-display);
          font-size: 21px;
          box-shadow: 0 3px 8px color-mix(in oklab, var(--muted), transparent 83%);
          flex: none;
          overflow: hidden;
        }

        .name { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: var(--fg); }
        .welcome { margin-top: 1px; font-size: 14px; color: var(--muted); }

        .actions-box {
          display: flex;
          gap: 13px;
          align-items: center;
        }

        .icon-btn {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: color-mix(in oklab, var(--surface), transparent 4%);
          box-shadow: 0 4px 13px color-mix(in oklab, var(--fg), transparent 92%);
          transition: transform 160ms ease, background 160ms ease;
          color: var(--fg);
        }
        .icon-btn:hover { transform: translateY(-1px); background: var(--surface); }
        .icon-btn:active { transform: scale(0.96); }
        .icon-btn svg { width: 21px; height: 21px; stroke-width: 2; }

        .balance-block { margin-top: 28px; }
        .balance-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 15px;
          font-weight: 700;
          color: var(--muted);
          letter-spacing: -0.015em;
        }
        .balance-label svg { width: 14px; height: 14px; }
        .balance-value {
          margin-top: 3px;
          font-family: var(--font-display);
          font-size: 34px;
          line-height: 1.08;
          letter-spacing: -0.045em;
          color: var(--fg);
          font-weight: 700;
        }

        .cards-rail {
          margin-top: 20px;
          margin-right: -16px;
          display: flex;
          gap: 16px;
          overflow: hidden;
          padding-bottom: 8px;
        }

        .visa-card {
          position: relative;
          flex: 0 0 100%;
          max-width: 360px;
          width: 100%;
          height: 215px;
          overflow: hidden;
          border-radius: 22px;
          background: linear-gradient(135deg, #9b30d0 0%, #8a2be0 45%, #7d1fc4 100%);
          box-shadow: 0 18px 50px rgba(120,30,180,0.25), 0 4px 14px rgba(0,0,0,0.15);
          color: #ffffff;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255,255,255,0.15);
          transition: all 0.3s ease;
          margin: 0 auto;
        }

        .visa-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%);
          pointer-events: none;
        }

        /* Mastercard logo */
        .mastercard {
          position: absolute;
          top: 24px;
          right: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .mc-circles {
          position: relative;
          width: 58px;
          height: 36px;
        }

        .mc-circle {
          position: absolute;
          top: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
        }

        .mc-red    { left: 0;  background: #eb001b; }
        .mc-yellow { right: 0; background: #f79e1b; }
        
        .mc-overlap {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          width: 14px;
          height: 36px;
          background: #ff5f00;
          border-radius: 50% / 50%;
        }

        .mc-text {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: -0.2px;
          margin-top: 2px;
          color: #ffffff;
        }
        
        .mc-text sup { font-size: 5px; font-weight: 400; }

        /* Chip */
        .nu-chip {
          width: 44px;
          height: 34px;
          border-radius: 6px;
          background: linear-gradient(135deg, #d9d4e0 0%, #c3bcd0 100%);
          border: 1px solid rgba(120,80,150,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Contactless */
        .nu-contactless {
          width: 22px;
          height: 24px;
        }

        .card-middle {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 10px;
        }

        /* Nu logo + name */
        .card-bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-top: auto;
        }

        .nu-bottom-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nu-logo {
          width: 44px;
          height: 36px;
        }

        .card-name {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1px;
          color: #ffffff;
        }

        .card-validity {
          font-size: 10px;
          opacity: 0.8;
          text-align: right;
          color: #ffffff;
          font-family: var(--font-mono);
        }
          margin-top: 4px;
          letter-spacing: 0.06em;
        }

        .side-card {
          flex: 0 0 118px;
          height: 196px;
          border-radius: 15px 0 0 15px;
          background:
            radial-gradient(circle at 30% 48%, color-mix(in oklab, var(--surface), transparent 80%) 0 20%, transparent 21%),
            linear-gradient(140deg, var(--accent), var(--danger));
          border: 1px solid color-mix(in oklab, var(--surface), transparent 45%);
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 24px;
        }
        .summary-card {
          min-height: 121px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
          padding: 17px 15px 14px;
        }
        .summary-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 15px;
          color: var(--muted);
          font-weight: 800;
        }
        .summary-value {
          margin-top: 9px;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--fg);
        }
        .delta {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
        }
        .delta.down {
          color: var(--danger);
          background: color-mix(in oklab, var(--danger), transparent 84%);
        }
        .delta.up {
          color: var(--success);
          background: color-mix(in oklab, var(--success), transparent 83%);
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 31px;
          margin-bottom: 16px;
        }
        .section-head h2 {
          font-family: var(--font-display);
          font-size: 17px;
          line-height: 1.2;
          color: var(--muted);
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .see-all {
          background: transparent;
          padding: 4px 0 4px 12px;
          color: var(--muted);
          font-size: 16px;
          font-weight: 500;
        }

        .bill-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .bill-card {
          min-height: 169px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 15px 12px 11px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .bill-top {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 24px;
        }
        .logo-bubble {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid var(--border);
          display: grid;
          place-items: center;
          color: var(--fg);
          font-weight: 900;
          background: var(--surface);
          position: relative;
        }
        .logo-bubble.youtube {
          color: var(--surface);
          background: var(--surface);
        }
        .yt-mark {
          width: 24px;
          height: 17px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          background: var(--danger);
        }
        .yt-mark::before {
          content: "";
          width: 0;
          height: 0;
          border-top: 4px solid transparent;
          border-bottom: 4px solid transparent;
          border-left: 7px solid var(--surface);
          margin-left: 2px;
        }
        .more {
          width: 22px;
          height: 30px;
          display: grid;
          place-items: center;
          color: var(--fg);
          background: transparent;
        }
        .more::before {
          content: "";
          width: 3px;
          height: 16px;
          background:
            radial-gradient(circle, currentColor 0 2px, transparent 2.5px) center 0 / 3px 6px repeat-y;
        }
        .bill-title {
          font-size: 18px;
          line-height: 1.3;
          letter-spacing: -0.025em;
          color: var(--fg);
          font-weight: 600;
          word-break: break-word;
        }
        .bill-amount {
          margin-top: 6px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.015em;
          color: var(--fg);
        }
        .bill-amount span {
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
        }
        .due {
          margin-top: 4px;
          color: var(--muted);
          font-size: 14px;
        }

        .transaction-list {
          border-radius: 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 8px 12px;
        }
        .transaction {
          display: grid;
          grid-template-columns: 40px 1fr auto;
          align-items: center;
          min-height: 74px;
          border-bottom: 1px solid var(--border);
          gap: 8px;
        }
        .transaction:last-child {
          border-bottom: 0;
        }
        .tx-title {
          font-size: 18px;
          color: var(--fg);
          font-weight: 600;
        }
        .tx-date {
          margin-top: 5px;
          color: var(--muted);
          font-size: 14px;
        }
        .tx-amount {
          font-size: 17px;
          font-weight: 700;
          color: var(--fg);
        }
        .blur-privacy {
          filter: blur(8px);
          opacity: 0.6;
          user-select: none;
          pointer-events: none;
        }

        .premium-card {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
          padding: 20px 15px 16px;
          margin-top: 12px;
        }
        .toggle-btn-container {
          background: color-mix(in oklab, var(--bg), var(--surface) 35%);
          padding: 4px;
          border-radius: 9px;
          display: flex;
          align-items: center;
        }
        .toggle-btn {
          font-size: 11px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 7px;
          transition: all 160ms ease;
          color: var(--muted);
          background: transparent;
        }
        .toggle-btn.active {
          background: var(--surface);
          color: var(--fg);
          box-shadow: 0 2px 6px color-mix(in oklab, var(--fg), transparent 95%);
        }
        .toggle-btn-type {
          font-size: 11px;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 9px;
          color: var(--surface);
          box-shadow: 0 4px 10px color-mix(in oklab, var(--nav), transparent 85%);
          transition: all 160ms ease;
        }
        .bar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: end;
          height: 100%;
          width: 100%;
          gap: 6px;
        }
        .bar-chart-visual {
          width: 100%;
          max-width: 14px;
          border-radius: 8px 8px 2px 2px;
          position: relative;
          overflow: hidden;
          transition: all 300ms ease;
        }
        .bar-chart-visual.expense-bar {
          background: linear-gradient(180deg, color-mix(in oklab, var(--danger), white 30%), var(--danger));
          box-shadow: 0 3px 8px color-mix(in oklab, var(--danger), transparent 80%);
        }
        .bar-chart-visual.income-bar {
          background: linear-gradient(180deg, color-mix(in oklab, var(--success), white 30%), var(--success));
          box-shadow: 0 3px 8px color-mix(in oklab, var(--success), transparent 80%);
        }
        .bar-chart-label {
          font-size: 8.5px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
        }
      `}} />

      <main className="phone" aria-label="Tela inicial do app de finanças">
        <section className="content-box" data-od-id="homescreen">
          <div className="topline">
            <div className="identity">
              <div className="avatar" aria-hidden="true" onClick={() => navigate('/settings')}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="name">{displayName}</p>
                <p className="welcome">Bem-vindo de volta</p>
              </div>
            </div>
            <div className="actions-box">
              <button className="icon-btn" aria-label="Notificações" onClick={() => navigate('/notifications')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 20a2.3 2.3 0 0 0 4 0"/></svg>
              </button>
            </div>
          </div>

          <div className="balance-block">
            <p className="balance-label">
              Saldo Atual · <span className="text-[#1a2366] hover:underline cursor-pointer font-extrabold" onClick={() => setShowMonthPicker(true)}>{monthNames[selectedMonth]} {selectedYear}</span>
              <button
                onClick={togglePrivacy}
                aria-label={isPrivacyEnabled ? 'Mostrar valor' : 'Ocultar valor'}
                className="inline-flex items-center text-current hover:opacity-80 transition-opacity ml-1.5 bg-transparent border-0 cursor-pointer"
              >
                {isPrivacyEnabled ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]"><path d="M2 12s3.5-5 10-5 10 5 10 5-3.5 5-10 5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                )}
              </button>
            </p>
            {summaryLoading ? (
              <Skeleton width={180} height={36} className="mt-1" />
            ) : (
              <h1 className={`balance-value ${isPrivacyEnabled ? 'blur-privacy' : ''}`}>{formatBRL(summary.balance)}</h1>
            )}
          </div>

          <div className="cards-rail" style={{ overflow: 'visible', marginRight: 0, paddingRight: 0, justifyContent: 'center', display: 'flex', width: '100%' }} aria-label="Cartões de pagamento">
            <article className="visa-card cursor-pointer" onClick={() => navigate('/projecao-futura')}>
              {/* Mastercard */}
              <div className="mastercard">
                <div className="mc-circles">
                  <div className="mc-circle mc-red"></div>
                  <div className="mc-circle mc-yellow"></div>
                  <div className="mc-overlap"></div>
                </div>
                <div className="mc-text">mastercard<sup>®</sup></div>
              </div>

              {/* Card Title & Amount */}
              <div className="card-top">
                <div>
                  <p className="card-label" style={{ fontSize: '13px', opacity: 0.85, fontWeight: 500 }}>Entradas</p>
                  {summaryLoading ? (
                    <Skeleton width={120} height={28} />
                  ) : (
                    <p className={`card-amount ${isPrivacyEnabled ? 'blur-privacy' : ''}`} style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                      {formatBRL(summary.income)}
                    </p>
                  )}
                </div>
              </div>

              {/* Chip & Contactless */}
              <div className="card-middle">
                <div className="nu-chip">
                  <svg viewBox="0 0 66 50" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                    <rect x="1" y="1" width="64" height="48" rx="8" fill="none" stroke="#7a5096" strokeWidth="1.2"/>
                    <ellipse cx="33" cy="25" rx="16" ry="13" fill="#cfc8da" stroke="#9a8fb0" strokeWidth="1"/>
                    <circle cx="33" cy="12" r="3" fill="#cfc8da" stroke="#9a8fb0" strokeWidth="0.8"/>
                    <line x1="1" y1="25" x2="17" y2="25" stroke="#9a8fb0" strokeWidth="1.2"/>
                    <line x1="49" y1="25" x2="65" y2="25" stroke="#9a8fb0" strokeWidth="1.2"/>
                    <line x1="33" y1="38" x2="33" y2="49" stroke="#9a8fb0" strokeWidth="1.2"/>
                    <line x1="17" y1="12" x2="17" y2="38" stroke="#9a8fb0" strokeWidth="1.2"/>
                    <line x1="49" y1="12" x2="49" y2="38" stroke="#9a8fb0" strokeWidth="1.2"/>
                  </svg>
                </div>
                <div className="nu-contactless">
                  <svg viewBox="0 0 34 38" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                    <path d="M6 9 a16 16 0 0 1 0 20"/>
                    <path d="M13 5 a24 24 0 0 1 0 28"/>
                    <path d="M20 1 a32 32 0 0 1 0 36"/>
                  </svg>
                </div>
              </div>

              {/* Bottom Row: Nu Logo, Cardholder Name, and Validity */}
              <div className="card-bottom-row">
                <div className="nu-bottom-left">
                  <svg className="nu-logo" viewBox="0 0 74 60" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 54 V18 a12 12 0 0 1 24 0 V54"/>
                    <path d="M40 6 V42 a12 12 0 0 0 24 0 V6"/>
                  </svg>
                  <span className="card-name">HENRIQUE LIMA</span>
                </div>
                <p className="card-validity">
                  Validade<strong> 12/{String(selectedYear).substring(2)}</strong>
                </p>
              </div>
            </article>
          </div>

          <div className="summary">
            <article className="summary-card cursor-pointer" onClick={() => navigate('/transactions?type=expense')}>
              <div className="summary-head">
                <span>Total Gasto</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>
              </div>
              {summaryLoading ? (
                <Skeleton width={110} height={20} className="mt-2.5" />
              ) : (
                <>
                  <p className={`summary-value ${isPrivacyEnabled ? 'blur-privacy' : ''}`}>{formatBRL(summary.expense)}</p>
                  <span className={`delta ${expenseDelta.class}`}>
                    {expenseDelta.class === 'up' ? '↗' : '↘'} {expenseDelta.text.replace('↗ ', '').replace('↘ ', '')}
                  </span>
                </>
              )}
            </article>
            <article className="summary-card cursor-pointer" onClick={() => navigate('/transactions?type=income')}>
              <div className="summary-head">
                <span>Economizado</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>
              </div>
              {summaryLoading ? (
                <Skeleton width={110} height={20} className="mt-2.5" />
              ) : (
                <>
                  <p className={`summary-value ${isPrivacyEnabled ? 'blur-privacy' : ''}`}>{formatBRL(summary.balance)}</p>
                  <span className={`delta ${savingsDelta.class}`}>
                    {savingsDelta.class === 'up' ? '↗' : '↘'} {savingsDelta.text.replace('↗ ', '').replace('↘ ', '')}
                  </span>
                </>
              )}
            </article>
          </div>

          <div className="section-head">
            <h2>Contas a Pagar</h2>
            <button className="see-all" onClick={() => navigate('/transactions?status=pending&type=expense')}>Ver todas</button>
          </div>

          <div className="bill-grid">
            {displayBills.map((bill) => (
              <article
                key={bill.id}
                className="bill-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => bill.isReal ? navigate(`/transactions?type=expense&status=pending`) : navigate('/add-transaction')}
              >
                <div className="bill-top">
                  {renderLogoBubble(bill.title)}
                  <button className="more" aria-label="Mais opções"></button>
                </div>
                <div>
                  <h3 className="bill-title">{bill.title}</h3>
                  <p className="bill-amount">
                    <span className={isPrivacyEnabled ? 'blur-privacy' : ''}>{formatBRL(bill.amount)}</span> <span>/mês</span>
                  </p>
                  <p className="due">{bill.due}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="section-head" style={{ marginTop: '27px' }}>
            <h2>Transações Recentes</h2>
            <button className="see-all" onClick={() => navigate('/transactions')}>Ver todas</button>
          </div>

          <div className="transaction-list">
            {displayTransactions.map((tx) => {
              const isExpense = tx.type === 'expense';
              return (
                <article
                  key={tx.id}
                  className="transaction cursor-pointer hover:bg-black/5 px-2 rounded-xl transition-colors"
                  onClick={() => navigate('/transactions')}
                >
                  {renderLogoBubble(tx.description)}
                  <div>
                    <p className="tx-title">{tx.description}</p>
                    <p className="tx-date">{formatTxDate(tx.date)}</p>
                  </div>
                  <p className={`tx-amount ${isExpense ? 'text-gray-700 font-extrabold' : 'text-success font-extrabold'} ${isPrivacyEnabled ? 'blur-privacy' : ''}`}>
                    {isExpense ? '-' : '+'} {formatBRL(Math.abs(Number(tx.amount)))}
                  </p>
                </article>
              );
            })}
          </div>

          {/* Gráficos de Fluxo */}
          <div className="section-head" style={{ marginTop: '35px' }}>
            <h2>Gráficos de Fluxo</h2>
            <button className="see-all" onClick={() => setIsChartsOpen(!isChartsOpen)}>
              {isChartsOpen ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <AnimatePresence>
            {isChartsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="premium-card">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="toggle-btn-container">
                      <button onClick={() => setPeriod('day')} className={`toggle-btn ${period === 'day' ? 'active' : ''}`}>DIA</button>
                      <button onClick={() => setPeriod('month')} className={`toggle-btn ${period === 'month' ? 'active' : ''}`}>MÊS</button>
                    </div>
                    <button
                      onClick={() => setChartType(prev => prev === 'expense' ? 'income' : 'expense')}
                      className="toggle-btn-type font-bold text-white"
                      style={{ background: chartType === 'expense' ? 'var(--danger)' : 'var(--success)' }}
                    >
                      {chartType === 'expense' ? 'SAÍDAS' : 'ENTRADAS'}
                    </button>
                  </div>
                  <div className="h-[200px] w-full flex items-end justify-between gap-1 sm:gap-2 px-1 relative">
                    {current.values.map((h, i) => {
                      const isHighlighted = period === 'month' && i === selectedMonth && chartYear === selectedYear;
                      return (
                        <div key={i} className="bar-container cursor-pointer" onClick={() => period === 'month' && setSelectedMonth(i)}>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(6, h * 1.2)}%` }}
                            transition={{ duration: 0.6, delay: i * 0.03 }}
                            className={`bar-chart-visual ${chartType === 'expense' ? 'expense-bar' : 'income-bar'} ${isHighlighted ? 'ring-2 ring-accent scale-105' : 'opacity-70 hover:opacity-100'}`}
                          />
                          <span className="bar-chart-label" style={{ fontSize: '8px' }}>{current.labels[i].substring(0, 3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Relatório Detalhado */}
          <div className="section-head" style={{ marginTop: '27px' }}>
            <h2>Relatório Detalhado</h2>
            <button className="see-all" onClick={() => setIsReportOpen(!isReportOpen)}>
              {isReportOpen ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <AnimatePresence>
            {isReportOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden flex flex-col gap-4"
              >
                <div className="premium-card" style={{ marginTop: '4px' }}>
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100/50 pb-2">
                    <p className="text-sm font-black text-success uppercase tracking-wider">Entradas do Mês</p>
                    <span className="text-[9px] font-black text-gray-500 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">{monthNames[selectedMonth]} {selectedYear}</span>
                  </div>
                  <div className="divide-y divide-gray-100/30 max-h-[180px] overflow-y-auto">
                    {incomeItems.length === 0 && <p className="text-xs text-gray-500 font-medium py-4 text-center italic">Nenhuma entrada registrada</p>}
                    {incomeItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between py-2 px-1">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{labelForDate(it.date)}</span>
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{it.description || 'Sem descrição'}</span>
                        </div>
                        <span className={`text-xs font-black text-success ${isPrivacyEnabled ? 'blur-privacy' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="premium-card" style={{ marginTop: '4px' }}>
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100/50 pb-2">
                    <p className="text-sm font-black text-danger uppercase tracking-wider">Saídas do Mês</p>
                    <span className="text-[9px] font-black text-gray-500 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">{monthNames[selectedMonth]} {selectedYear}</span>
                  </div>
                  <div className="divide-y divide-gray-100/30 max-h-[180px] overflow-y-auto">
                    {expenseItems.length === 0 && <p className="text-xs text-gray-500 font-medium py-4 text-center italic">Nenhuma saída registrada</p>}
                    {expenseItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between py-2 px-1">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{labelForDate(it.date)}</span>
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{it.description || 'Sem descrição'}</span>
                        </div>
                        <span className={`text-xs font-black text-danger ${isPrivacyEnabled ? 'blur-privacy' : ''}`}>{formatBRL(Number(it.amount || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {createPortal(
        <AnimatePresence>
          {showMonthPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMonthPicker(false)}
            >
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
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-2" />

                <div className="flex items-center justify-between border-b border-gray-200/50 pb-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedYear(y => y - 1)}
                    className="rounded-full p-2 hover:bg-black/5 text-gray-900 transition-all flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </motion.button>
                  
                  <div className="px-6">
                    <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">{selectedYear}</p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedYear(y => y + 1)}
                    className="rounded-full p-2 hover:bg-black/5 text-gray-900 transition-all flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </motion.button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[selectedYear - 2, selectedYear - 1, selectedYear].map((y) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${y === selectedYear ? 'bg-accent text-white shadow-lg' : 'bg-black/5 text-gray-500 hover:bg-black/10'}`}
                    >
                      {y}
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {monthNames.map((m, idx) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={m}
                      onClick={() => { setSelectedMonth(idx); setShowMonthPicker(false); }}
                      className={`px-2 py-3.5 rounded-xl text-xs font-black uppercase transition-all ${idx === selectedMonth ? 'bg-accent text-white shadow-lg' : 'bg-black/5 text-gray-500 hover:bg-black/10'}`}
                    >
                      {m}
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { const d = new Date(); setSelectedYear(d.getFullYear()); setSelectedMonth(d.getMonth()); setShowMonthPicker(false); }}
                    className="flex-1 rounded-2xl bg-black/5 py-3.5 text-xs font-black uppercase text-gray-900 hover:bg-black/10 transition-all"
                  >
                    Mês Atual
                  </motion.button>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMonthPicker(false)}
                    className="flex-1 rounded-2xl bg-gray-900 py-3.5 text-xs font-black uppercase text-white shadow-lg hover:shadow-black/20 transition-all"
                  >
                    Fechar
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Dashboard;

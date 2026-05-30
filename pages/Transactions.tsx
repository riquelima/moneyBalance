import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, toLocalISO, labelForDate } from '../utils/date';
import { usePrivacy } from '../src/context/PrivacyContext';
import { categories } from '../categories';
import Skeleton from '../components/ui/Skeleton';
import Header from '../components/common/Header';



const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPrivacyEnabled } = usePrivacy();

  // --- State Management ---
  const [items, setItems] = useState<Array<{ id: string; description: string | null; amount: number; type: 'income' | 'expense'; date: string; is_paid: boolean; category_id: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [catMap, setCatMap] = useState<Record<string, { name: string; type: 'income' | 'expense' }>>({});
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Filters
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>(new Date().getFullYear());
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userCategoryList, setUserCategoryList] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());

  // Estados para exclusão de transações recorrentes (Regra 2)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (yearFilter !== 'all') {
      setTempYear(yearFilter);
    }
  }, [yearFilter]);

  // --- Helpers ---
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Função assíncrona para deletar transação simples ou em lote (Regra 2)
  const handleDeleteTransaction = async (deleteAllRecurring: boolean) => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setIsDeleting(false);
        return;
      }
      
      let delError = null;
      if (deleteAllRecurring && transactionToDelete.description) {
        const { error } = await supabase
          .from('user_transactions')
          .delete()
          .eq('user_id', user.id)
          .eq('description', transactionToDelete.description);
        delError = error;
      } else {
        const { error } = await supabase
          .from('user_transactions')
          .delete()
          .eq('id', transactionToDelete.id);
        delError = error;
      }
      
      if (!delError) {
        if (deleteAllRecurring && transactionToDelete.description) {
          setItems(prev => prev.filter(x => x.description !== transactionToDelete.description));
        } else {
          setItems(prev => prev.filter(x => x.id !== transactionToDelete.id));
        }
        setOpenId(null);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmModal(false);
      setTransactionToDelete(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkMarkPaid = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('user_transactions')
        .update({ is_paid: true })
        .in('id', selectedIds);
      if (!error) {
        setItems(prev =>
          prev.map(item =>
            selectedIds.includes(item.id) ? { ...item, is_paid: true } : item
          )
        );
        setSelectedIds([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Data Fetching ---
  const fetchTransactions = useCallback(async (pageToLoad: number, shouldReset: boolean = false) => {
    if (pageToLoad === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('user_transactions')
        .select('id, description, amount, type, date, is_paid, category_id')
        .eq('user_id', user.id);

      // Backend Filtering
      if (statusFilter === 'paid') query = query.eq('is_paid', true);
      if (statusFilter === 'pending') query = query.eq('is_paid', false);
      if (typeFilter !== 'all') query = query.eq('type', typeFilter);

      if (dateFilter) {
        query = query.eq('date', dateFilter);
      } else {
        if (yearFilter !== 'all') {
          const y = Number(yearFilter);
          const start = `${y}-01-01`;
          const end = `${y}-12-31`;

          if (monthFilter !== 'all') {
            const m = Number(monthFilter);
            const dStart = new Date(y, m, 1);
            const dEnd = new Date(y, m + 1, 0);
            query = query.gte('date', toLocalISO(dStart)).lte('date', toLocalISO(dEnd));
          } else {
            query = query.gte('date', start).lte('date', end);
          }
        }
      }

      if (categoryFilter !== 'all') {
        if (categoryFilter === 'Sem Categoria') {
          query = query.is('category_id', null);
        } else {
          if (allCategories.length === 0) {
            setLoading(false);
            return;
          }
          const cat = allCategories.find(c => c.name === categoryFilter);
          if (cat) query = query.eq('category_id', cat.id);
        }
      }

      if (searchQuery) {
        query = query.ilike('description', `%${searchQuery}%`);
      }

      query = query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(pageToLoad * 20, (pageToLoad + 1) * 20 - 1);

      const { data, error } = await query;

      if (!error && data) {
        setItems(prev => shouldReset ? (data as any) : [...prev, ...data as any]);
        setHasMore(data.length === 20);
        setPage(pageToLoad);

        // Fetch categories for mapped items
        const ids = Array.from(new Set((data as any[]).map((x: any) => x.category_id).filter(Boolean)));
        if (ids.length) {
          const { data: cats } = await supabase
            .from('user_categories')
            .select('id, name, type')
            .in('id', ids);

          if (cats) {
            setCatMap(prev => {
              const next = { ...prev };
              cats.forEach((c: any) => { if (c?.id) next[c.id as string] = { name: String(c.name || 'Categoria'), type: (c.type as any) || 'expense' }; });
              return next;
            });
          }
        }
      } else {
        if (shouldReset) setItems([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter, typeFilter, yearFilter, monthFilter, dateFilter, categoryFilter, searchQuery, allCategories]);

  // Initial Load & Realtime
  useEffect(() => {
    fetchTransactions(0, true);
    const channel = supabase
      .channel('transactions_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_transactions' }, () => {
        fetchTransactions(0, true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTransactions]);

  // Metadata Load
  useEffect(() => {
    let mounted = true;
    const fetchMeta = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Carregar avatar do perfil do cache local
      try {
        const cached = localStorage.getItem(`dashboard_cache_profile_${userData.user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.data?.avatarUrl) {
            if (mounted) setAvatarUrl(parsed.data.avatarUrl);
          }
        } else {
          const { data: prof } = await supabase.from('user_profiles').select('avatar_url').eq('id', userData.user.id).maybeSingle();
          if (prof?.avatar_url && mounted) {
            setAvatarUrl(prof.avatar_url);
          }
        }
      } catch (e) { /* ignore */ }

      const { data: cats } = await supabase.from('user_categories').select('id, name').eq('user_id', userData.user.id).order('name');
      if (mounted && cats) {
        setUserCategoryList(cats.map((c: any) => c.name));
        setAllCategories(cats.map((c: any) => ({ id: c.id, name: c.name })));
      }

      const { data: dates } = await supabase.from('user_transactions').select('date').eq('user_id', userData.user.id);
      if (mounted && dates) {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        dates.forEach((d: any) => {
          const y = parseLocalISODate(d.date).getFullYear();
          if (!Number.isNaN(y)) years.add(y);
        });
        setAvailableYears(Array.from(years).sort((a, b) => b - a));
      }
    };
    fetchMeta();
    const channel = supabase.channel('public:user_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_categories' }, () => fetchMeta())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, []);

  // Filter Logic
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const type = params.get('type');
    const month = params.get('month');
    const year = params.get('year');
    const date = params.get('date');

    if (status === 'pending') setStatusFilter('pending');
    if (status === 'paid') setStatusFilter('paid');
    if (type === 'expense' || type === 'income') setTypeFilter(type as any);

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setDateFilter(date);
      setMonthFilter('all');
      setYearFilter('all');
    } else {
      setDateFilter(null);
      if (month !== null && !isNaN(Number(month))) setMonthFilter(Number(month));
      else setMonthFilter(new Date().getMonth());
      if (year !== null && !isNaN(Number(year))) setYearFilter(Number(year));
    }
    setCategoryFilter('all');
  }, [location.search]);

  const categoriesForFilter = useMemo(() => {
    const hasNone = items.some(i => !i.category_id);
    const list = userCategoryList;
    const names = hasNone ? (['Sem Categoria', ...list]) : list.slice();
    return Array.from(new Set(names)).sort();
  }, [items, userCategoryList]);

  const filteredItems = items;

  const grouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const acc: Record<string, typeof items> = {} as any;
    filteredItems.forEach((t) => {
      const title = String(t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')).toLowerCase();
      if (q && !title.includes(q)) return;
      const label = labelForDate(t.date);
      acc[label] = acc[label] || [];
      acc[label].push(t as any);
    });
    return acc;
  }, [filteredItems, searchQuery]);

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const headerVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
  };



  // ... (inside component)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen p-4 pb-24 gap-6 font-display text-gray-900 dark:text-white"
    >
      {/* --- Header --- */}
      <Header
        title={
          <div className="flex flex-col items-center gap-1 py-0.5 w-full">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none select-none">Transações</h1>
            
            {/* Filtro global 'Este Mês' no centro do header, abaixo do título */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMonthPicker(s => !s)}
              className="h-7 px-2 border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm backdrop-blur-md select-none mt-1"
            >
              <span className="material-symbols-outlined !text-[11px] leading-none">calendar_month</span>
              <span className="leading-none">
                {monthFilter === 'all' && yearFilter === 'all' 
                  ? 'Todos os Períodos' 
                  : monthFilter === 'all' 
                  ? `Ano ${yearFilter}` 
                  : yearFilter === 'all'
                  ? `${monthNames[monthFilter as number]}`
                  : `${monthNames[monthFilter as number]} ${yearFilter}`}
              </span>
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

      {/* --- Search & Quick Filters --- */}
      <div className="py-2 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Buscar transações"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilter(true)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">filter_list</span>
          </motion.button>
        </div>

        {/* Chips Row */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">

          {/* Clear Filter Chip (if active) */}
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all' || dateFilter) && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setYearFilter('all');
                setMonthFilter('all');
                setCategoryFilter('all');
                setDateFilter(null);
                setSearchQuery('');
                navigate(location.pathname);
              }}
              className="flex items-center gap-1 bg-red-50 border border-red-100 rounded-full px-4 py-2 text-red-500 text-xs font-bold shrink-0 shadow-sm hover:bg-red-100/50 transition-colors"
            >
              <span>Limpar</span>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* --- Filter Modal --- */}
      {createPortal(
        <AnimatePresence>
          {showFilter && (
            (
              <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
            onClick={() => setShowFilter(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Filtrar Transações</h3>
                <button onClick={() => setShowFilter(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pb-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Tipo</label>
                  <div className="flex gap-2">
                    {['all', 'income', 'expense'].map(t => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t as any)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${typeFilter === t ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {t === 'all' ? 'Todos' : t === 'income' ? 'Entradas' : 'Saídas'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Status</label>
                  <div className="flex gap-2">
                    {['all', 'paid', 'pending'].map(s => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s as any)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${statusFilter === s ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {s === 'all' ? 'Todos' : s === 'paid' ? 'Pagos' : 'Pendentes'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setCategoryFilter('all')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${categoryFilter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      Todas
                    </button>
                    {categoriesForFilter.map(name => (
                      <button
                        key={name}
                        onClick={() => setCategoryFilter(name)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${categoryFilter === name ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowFilter(false)}
                  className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Aplicar Filtros
                </button>
              </div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>,
        document.body
      )}

      {/* --- Transaction List --- */}
      <div className="flex-1 pb-6">
        {loading && page === 0 ? (
          <div className="space-y-4 pt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-3xl shadow-sm border border-gray-100">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="30%" height={14} />
                </div>
                <Skeleton variant="text" width={80} height={24} />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-gray-400">receipt_long</span>
            </div>
            <h3 className="text-gray-900 font-bold text-lg mb-1">Nenhuma transação</h3>
            <p className="text-gray-500 text-sm max-w-[200px]">Não encontramos nada com os filtros atuais.</p>
            <button
              onClick={() => navigate('/add-transaction')}
              className="mt-6 px-6 py-2.5 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors"
            >
              Adicionar Nova
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {Object.entries(grouped).map(([date, groupItems], groupIndex) => (
              <div key={date} className="mb-6">
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (groupIndex * 0.1) }}
                  className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-3"
                >
                  {date}
                </motion.h3>

                <div className="space-y-4">
                  {(groupItems as any[]).map((t: any) => {
                    const cat = t.category_id ? catMap[t.category_id] : null;
                    const catName = cat?.name || 'Sem Categoria';
                    const isSelected = selectedIds.includes(t.id);
                    const isIncome = t.type === 'income';

                    const cardBgClass = isIncome 
                      ? 'bg-[#E8F8EE] dark:bg-[#1D2D23] border-[#20BF55]/20 dark:border-[#20BF55]/30 shadow-[0_4px_16px_rgba(32,191,85,0.04)]' 
                      : 'bg-[#FFF0F0] dark:bg-[#3A2323] border-[#FF6B6B]/20 dark:border-[#FF6B6B]/30 shadow-[0_4px_16px_rgba(255,107,107,0.04)]';

                    const iconBgClass = isIncome 
                      ? 'bg-[#20BF55]/20 text-[#20BF55]' 
                      : 'bg-[#FF6B6B]/20 text-[#FF6B6B]';

                    const textTitleClass = isIncome
                      ? 'text-[#1B7A3D] dark:text-[#26de81]'
                      : 'text-[#B83232] dark:text-[#ff7979]';

                    const textCatClass = isIncome
                      ? 'bg-[#20BF55]/15 text-[#1B7A3D] dark:text-[#26de81]'
                      : 'bg-[#FF6B6B]/15 text-[#B83232] dark:text-[#ff7979]';

                    const textDateClass = isIncome
                      ? 'text-[#1B7A3D]/70 dark:text-[#26de81]/70'
                      : 'text-[#B83232]/70 dark:text-[#ff7979]/70';

                    const textAmountClass = isIncome
                      ? 'text-[#20BF55]'
                      : 'text-[#FF6B6B]';

                    const selectBorderClass = isSelected
                      ? (isIncome ? '!border-[#20BF55] ring-2 ring-[#20BF55]/20' : '!border-[#FF6B6B] ring-2 ring-[#FF6B6B]/20')
                      : '';

                    return (
                      <motion.div
                        key={t.id}
                        variants={itemVariants}
                        layout
                        className="relative group "
                      >
                        {/* Swipe Actions Background */}
                        <div className="absolute inset-y-0 right-0 flex items-center gap-2 pl-4 z-0">
                          <button
                            onClick={() => navigate(`/add-transaction?edit=${t.id}`)}
                            className="h-[80%] w-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const { data: userData } = await supabase.auth.getUser();
                                const user = userData?.user;
                                if (!user) return;
                                
                                if (t.description) {
                                  const { data: occurrences } = await supabase
                                    .from('user_transactions')
                                    .select('id')
                                    .eq('user_id', user.id)
                                    .eq('description', t.description);
                                  
                                  if (occurrences && occurrences.length > 1) {
                                    setTransactionToDelete(t);
                                    setShowDeleteConfirmModal(true);
                                    return;
                                  }
                                }
                                
                                const { error } = await supabase.from('user_transactions').delete().eq('id', t.id);
                                if (!error) {
                                  setItems(prev => prev.filter(x => x.id !== t.id));
                                  setOpenId(null);
                                }
                              } catch (e) {
                                // ignore
                              }
                            }}
                            className="h-[80%] w-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform ml-2"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>

                        {/* Card Content */}
                        <motion.div
                          drag="x"
                          dragConstraints={{ left: -120, right: 0 }}
                          dragElastic={0.1}
                          onDragStart={() => setOpenId(null)}
                          onDragEnd={(e, info) => setOpenId(info.offset.x < -50 ? t.id : null)}
                          animate={{ x: openId === t.id ? -120 : 0 }}
                          onTap={() => toggleSelect(t.id)}
                          className={`relative z-10 flex items-center gap-4 p-5 rounded-[24px] border cursor-pointer active:scale-[0.98] ${cardBgClass} ${selectBorderClass}`}
                        >
                          {/* Icon / Checkbox Indicator */}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? (isIncome ? 'bg-[#20BF55] text-white shadow-lg shadow-[#20BF55]/20' : 'bg-[#FF6B6B] text-white shadow-lg shadow-[#FF6B6B]/20')
                                : iconBgClass
                            }`}
                          >
                            <span className="material-symbols-outlined text-2xl transition-all">
                              {isSelected ? 'check' : (t.type === 'income' ? 'arrow_upward' : 'arrow_downward')}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-extrabold truncate transition-colors ${textTitleClass} ${t.is_paid ? 'line-through opacity-50' : ''}`}>
                              {t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors ${textCatClass}`}>
                                {catName}
                              </span>
                              <span className={`text-[10px] font-bold transition-colors ${textDateClass}`}>
                                {parseLocalISODate(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right">
                            <span className={`block text-base font-black transition-colors ${textAmountClass} ${isPrivacyEnabled ? 'blur-sm' : ''} ${t.is_paid ? 'line-through opacity-50' : ''}`}>
                              {formatBRL(t.amount)}
                            </span>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="py-6 flex justify-center">
                <button
                  onClick={() => fetchTransactions(page + 1)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? 'Carregando...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Bottom Sheet de Seleção de Mês - Painel Arrastável com AnimatePresence */}
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
              className="w-full max-w-md bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl p-6 rounded-t-[2.5rem] border-t border-white/40 dark:border-white/10 shadow-glass-lg relative flex flex-col gap-4 select-none cursor-grab active:cursor-grabbing text-gray-900 dark:text-white"
              onClick={(e) => e.stopPropagation()} // Impede fechamento ao clicar no painel
            >
              {/* Indicador visual de pílula arrastável */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-2" />

              {/* Cabeçalho do seletor de Ano */}
              <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTempYear(y => y - 1)}
                  className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-all flex items-center justify-center border border-transparent active:border-black/10 dark:active:border-white/10"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </motion.button>
                
                <div className="px-6">
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{tempYear}</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTempYear(y => y + 1)}
                  className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-all flex items-center justify-center border border-transparent active:border-black/10 dark:active:border-white/10"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </motion.button>
              </div>

              {/* Seletor rápido de anos (Últimos 3 Anos) */}
              <div className="grid grid-cols-3 gap-2">
                {[tempYear - 2, tempYear - 1, tempYear].map((y) => (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={y}
                    onClick={() => setTempYear(y)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${y === tempYear ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
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
                    onClick={() => { 
                      setMonthFilter(idx); 
                      setYearFilter(tempYear);
                      setShowMonthPicker(false); 
                    }}
                    className={`px-2 py-3.5 rounded-xl text-xs font-black uppercase transition-all ${idx === monthFilter && tempYear === yearFilter ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>

              {/* Botões de Ação na Base */}
              <div className="flex gap-2.5 mt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { 
                    setYearFilter('all'); 
                    setMonthFilter('all'); 
                    setShowMonthPicker(false); 
                  }}
                  className="flex-1 rounded-2xl bg-black/5 dark:bg-white/5 py-3.5 text-xs font-black uppercase text-gray-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5"
                >
                  Ver Todos
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { 
                    const d = new Date(); 
                    setYearFilter(d.getFullYear()); 
                    setMonthFilter(d.getMonth()); 
                    setShowMonthPicker(false); 
                  }}
                  className="flex-1 rounded-2xl bg-black/5 dark:bg-white/5 py-3.5 text-xs font-black uppercase text-gray-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5"
                >
                  Mês Atual
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMonthPicker(false)}
                  className="flex-1 rounded-2xl bg-primary py-3.5 text-xs font-black uppercase text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
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

      {/* Modal de Exclusão (Regra 2) */}
      {createPortal(
        <AnimatePresence>
          {showDeleteConfirmModal && transactionToDelete && (
            (
              <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl p-6 rounded-[2rem] border border-white/40 dark:border-white/10 shadow-glass-lg max-w-sm w-full flex flex-col gap-4 text-center select-none"
            >
              <div className="w-12 h-12 rounded-full bg-danger/15 flex items-center justify-center mx-auto text-danger">
                <span className="material-symbols-outlined text-2xl">delete</span>
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Excluir Recorrência</h4>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                Esta é uma transação recorrente. Deseja excluir apenas esta ocorrência específica ou remover todas as recorrências com o nome <span className="text-gray-900 dark:text-white font-extrabold">"{transactionToDelete.description}"</span>?
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await handleDeleteTransaction(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-danger text-white font-black text-xs uppercase shadow-md shadow-danger/20 transition-all font-display"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir todas as recorrências'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await handleDeleteTransaction(false);
                  }}
                  className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black text-xs uppercase hover:bg-gray-200 dark:hover:bg-white/10 transition-all font-display"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir apenas esta'}
                </motion.button>
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setTransactionToDelete(null);
                  }}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-1 transition-colors outline-none font-display"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
              </div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>,
        document.body
      )}

      {/* Barra de Ações em Lote Flutuante */}
      {createPortal(
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-28 left-4 right-4 z-[110] p-4 max-w-md mx-auto bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-glass-lg rounded-2xl flex items-center justify-between gap-4 font-display select-none text-gray-900 dark:text-white"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Lote selecionado</span>
                <p className="text-sm font-black text-gray-950 dark:text-white leading-none">
                  {selectedIds.length} {selectedIds.length === 1 ? 'transação' : 'transações'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedIds([])}
                  className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Limpar</span>
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkMarkPaid}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white font-black text-xs uppercase shadow-md shadow-primary/25 hover:shadow-primary/45 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Pagar todas</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default Transactions;

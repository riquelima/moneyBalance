import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, toLocalISO, labelForDate } from '../utils/date';
import { usePrivacy } from '../src/context/PrivacyContext';
import { categories } from '../categories';
import Skeleton from '../components/ui/Skeleton';

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
  const categoryOrder = [...categories, 'Sem Categoria'];

  // --- Helpers ---
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen bg-gray-50/50 pb-24"
    >
      {/* --- Header --- */}
      <motion.header
        initial="hidden"
        animate="visible"
        variants={headerVariants}
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-5 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowFilter(true)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">filter_list</span>
        </motion.button>

        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Transações</h1>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/add-transaction')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">add</span>
        </motion.button>
      </motion.header>

      {/* --- Search & Quick Filters --- */}
      <div className="px-5 py-4 space-y-4">
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar transações"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        {/* Chips Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar mask-gradient-right">
          {/* Year Chip */}
          <div className="flex items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm shrink-0">
            <span className="text-xs font-bold text-gray-500 mr-2">Ano</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-gray-900 outline-none appearance-none pr-4 cursor-pointer"
              style={{ backgroundImage: 'none' }} // Hide default arrow
            >
              <option value="all">Todos</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month Chip */}
          <div className="flex items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm shrink-0">
            <span className="text-xs font-bold text-gray-500 mr-2">Mês</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-gray-900 outline-none appearance-none pr-4 cursor-pointer"
            >
              <option value="all">Todos</option>
              {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>

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
              className="flex items-center gap-1 bg-red-50 border border-red-100 rounded-full px-3 py-1.5 text-red-500 text-xs font-bold shrink-0"
            >
              <span>Limpar</span>
              <span className="material-symbols-outlined text-[14px]">close</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* --- Filter Modal --- */}
      <AnimatePresence>
        {showFilter && (
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
        )}
      </AnimatePresence>

      {/* --- Transaction List --- */}
      <div className="flex-1 px-5 pb-6">
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
                              const { error } = await supabase.from('user_transactions').delete().eq('id', t.id);
                              if (!error) {
                                setItems(prev => prev.filter(x => x.id !== t.id));
                                setOpenId(null);
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
                          className="relative z-10 flex items-center gap-4 bg-white/80 backdrop-blur-md p-5 rounded-[24px] border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] active:scale-[0.98] transition-transform"
                        >
                          {/* Icon */}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}
                          >
                            <span className="material-symbols-outlined text-2xl">
                              {t.type === 'income' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold text-gray-900 truncate ${t.is_paid ? 'line-through opacity-50' : ''}`}>
                              {t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                {catName}
                              </span>
                              <span className="text-[10px] font-medium text-gray-400">
                                {parseLocalISODate(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right">
                            <span className={`block text-base font-black ${t.type === 'income' ? 'text-green-500' : 'text-red-500'} ${isPrivacyEnabled ? 'blur-sm' : ''} ${t.is_paid ? 'line-through opacity-50' : ''}`}>
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
    </motion.div>
  );
};

export default Transactions;

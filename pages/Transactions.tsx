import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, toLocalISO, labelForDate } from '../utils/date';
import { usePrivacy } from '../src/context/PrivacyContext';
import { categories } from '../categories';

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPrivacyEnabled } = usePrivacy();
  const [items, setItems] = useState<Array<{ id: string; description: string | null; amount: number; type: 'income' | 'expense'; date: string; is_paid: boolean; category_id: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [catMap, setCatMap] = useState<Record<string, { name: string; type: 'income' | 'expense' }>>({});
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>(new Date().getFullYear());
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userCategoryList, setUserCategoryList] = useState<string[]>([]);
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const categoryOrder = [...categories, 'Sem Categoria'];
  const hues = [15, 35, 55, 85, 160, 190, 210, 235, 255, 275, 300, 330, 350];
  const hashCode = (s: string) => {
    let h = 7;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  const styleForBadge = (n: string) => {
    if (n === 'Salário') {
      const hue = 140;
      return {
        backgroundColor: `hsla(${hue}, 85%, 55%, 0.15)`,
        color: `hsl(${hue}, 85%, 35%)`,
        borderColor: `hsla(${hue}, 85%, 45%, 0.30)`
      } as React.CSSProperties;
    }
    const idx = categoryOrder.indexOf(n);
    const i = idx >= 0 ? idx : (hashCode(n) % hues.length);
    const hue = hues[i];
    return {
      backgroundColor: `hsla(${hue}, 85%, 55%, 0.15)`,
      color: `hsl(${hue}, 85%, 35%)`,
      borderColor: `hsla(${hue}, 85%, 45%, 0.30)`
    } as React.CSSProperties;
  };
  const badgeClass = (name: string, typ?: 'income' | 'expense') => {
    const palette: Record<string, string> = {
      'Alimentação': 'bg-primary-green/15 text-primary-green border-primary-green/30',
      'Transporte': 'bg-primary-blue/15 text-primary-blue border-primary-blue/30',
      'Lazer': 'bg-warning/15 text-warning border-warning/30',
      'Lazer e social': 'bg-warning/15 text-warning border-warning/30',
      'Moradia': 'bg-primary/15 text-primary border-primary/30',
      'Contas da casa': 'bg-primary-teal/15 text-primary-teal border-primary-teal/30',
      'Saúde': 'bg-success/15 text-success border-success/30',
      'Educação e desenvolvimento': 'bg-surface-light/20 text-text-primary border-surface-light/40',
      'Imprevistos': 'bg-danger/15 text-danger border-danger/30',
      'Investimentos / economias': 'bg-primary-blue/15 text-primary-blue border-primary-blue/30',
      'Salário': 'bg-success/15 text-success border-success/30',
      'Rendimentos': 'bg-primary-teal/15 text-primary-teal border-primary-teal/30',
      'Dinheiro Extra': 'bg-primary-green/15 text-primary-green border-primary-green/30',
    };
    if (palette[name]) return palette[name];
    return typ === 'income'
      ? 'bg-success/15 text-success border-success/30'
      : 'bg-danger/15 text-danger border-danger/30';
  };

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (!mounted) return;
      
      if (!user) { 
        setItems([]); 
        setLoading(false); 
        return; 
      }
      
      const { data, error } = await supabase
        .from('user_transactions')
        .select('id, description, amount, type, date, is_paid, category_id')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (!mounted) return;

      if (!error && data) {
        setItems(data as any);
        const ids = Array.from(new Set((data as any[]).map((x: any) => x.category_id).filter(Boolean)));
        if (ids.length) {
          const { data: cats } = await supabase
            .from('user_categories')
            .select('id, name, type')
            .in('id', ids);
            
          if (mounted) {
            const m: Record<string, { name: string; type: 'income' | 'expense' }> = {};
            (cats || []).forEach((c: any) => { if (c?.id) m[c.id as string] = { name: String(c.name || 'Categoria'), type: (c.type as any) || 'expense' }; });
            setCatMap(m);
          }
        } else {
          if (mounted) setCatMap({});
        }
      } else {
        if (mounted) setItems([]);
      }
      if (mounted) setLoading(false);
    };
    
    load();
    
    return () => {
      mounted = false;
    };
  }, [location.key]); // Removed location.key dependency to prevent re-fetch on every location change unless necessary, but keeping for now as per original logic, just adding cleanup. Actually, better to just run once on mount or when key changes.

  


  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase
        .from('user_categories')
        .select('name')
        .eq('user_id', userData.user.id)
        .order('name');

      if (mounted && data) {
        setUserCategoryList(data.map((c: any) => c.name));
      }
    };

    fetchCategories();

    const channel = supabase
      .channel('public:user_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const categoriesForFilter = useMemo(() => {
    const hasNone = items.some(i => !i.category_id);
    const list = userCategoryList;
    const names = hasNone ? (['Sem Categoria', ...list]) : list.slice();
    return Array.from(new Set(names)).sort();
  }, [items, userCategoryList]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear()); // Always include current year
    items.forEach(item => {
      const y = parseLocalISODate(item.date).getFullYear();
      if (!Number.isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [items]);

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

    if (date) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setDateFilter(date);
        setMonthFilter('all');
        setYearFilter('all');
      }
    } else {
      setDateFilter(null);
      if (month !== null) {
        const m = Number(month);
        if (!Number.isNaN(m) && m >= 0 && m <= 11) setMonthFilter(m);
      } else {
        // Default to current month if no month filter is provided
        setMonthFilter(new Date().getMonth());
      }
      if (year !== null) {
        const y = Number(year);
        if (!Number.isNaN(y) && y > 2000) setYearFilter(y);
      }
    }
    setCategoryFilter('all');
  }, [location.search]);

  const filteredItems = useMemo(() => {
    let arr = items.slice();
    if (statusFilter === 'paid') arr = arr.filter(t => t.is_paid);
    if (statusFilter === 'pending') arr = arr.filter(t => !t.is_paid);
    if (typeFilter !== 'all') arr = arr.filter(t => t.type === typeFilter);

    if (dateFilter) {
      arr = arr.filter(t => t.date === dateFilter);
    } else {
      if (yearFilter !== 'all') arr = arr.filter(t => parseLocalISODate(t.date).getFullYear() === yearFilter);
      if (monthFilter !== 'all') arr = arr.filter(t => parseLocalISODate(t.date).getMonth() === monthFilter);
    }

    if (categoryFilter !== 'all') {
      if (categoryFilter === 'Sem Categoria') arr = arr.filter(t => !t.category_id);
      else arr = arr.filter(t => {
        const nm = t.category_id ? catMap[t.category_id]?.name : null;
        return nm === categoryFilter;
      });
    }
    // Sort ascending by date (oldest first)
    arr.sort((a, b) => parseLocalISODate(a.date).getTime() - parseLocalISODate(b.date).getTime());
    return arr;
  }, [items, statusFilter, typeFilter, monthFilter, categoryFilter, searchQuery]);

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

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col min-h-screen pb-24 transition-colors duration-300"
    >
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl bg-white/80 border-b border-white/40 shadow-glass">
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setShowFilter(true)}
          className="flex w-10 h-10 items-center justify-center text-gray-600 rounded-full bg-white/50 border border-white/40 backdrop-blur-md shadow-glass hover:bg-white/80 transition-all"
        >
          <span className="material-symbols-outlined text-xl">filter_alt</span>
        </motion.button>
        <h1 className="text-xl font-bold tracking-wide text-gray-900 drop-shadow-sm">Transações</h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => navigate('/add-transaction')}
          className="flex w-10 h-10 items-center justify-center text-white rounded-full bg-primary/80 border border-white/40 backdrop-blur-md shadow-glass hover:bg-primary transition-all"
        >
          <span className="material-symbols-outlined text-2xl">add_circle</span>
        </motion.button>
      </header>

      <div className="p-4 z-10 relative space-y-4">
        <div className="flex items-center rounded-2xl bg-white/60 border border-white/40 backdrop-blur-md shadow-glass px-4 py-3">
          <span className="material-symbols-outlined text-gray-500 mr-3">search</span>
          <input 
            type="text" 
            placeholder="Buscar transações"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-gray-900 placeholder:text-gray-400 outline-none border-none focus:ring-0 p-0 font-medium"
          />
        </div>

        <AnimatePresence>
          {showFilter && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden"
            >
              <div className="mt-2 bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-glass">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <h3 className="text-lg font-bold text-white">Filtrar</h3>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowFilter(false)} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
                    <span className="material-symbols-outlined">close</span>
                  </motion.button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold uppercase mb-3 text-white/70 tracking-wider">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {['all','paid','pending'].map((s) => (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          key={s}
                          onClick={() => setStatusFilter(s as any)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${statusFilter === s ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                        >
                          {s === 'all' ? 'Todos' : s === 'paid' ? 'Pagos' : 'Pendentes'}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase mb-3 text-gray-500 tracking-wider">Tipo</p>
                    <div className="flex flex-wrap gap-2">
                      {['all','income','expense'].map((t) => (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          key={t}
                          onClick={() => setTypeFilter(t as any)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${typeFilter === t ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/5 border-black/5 text-gray-500 hover:bg-black/10'}`}
                        >
                          {t === 'all' ? 'Todos' : t === 'income' ? 'Entradas' : 'Saídas'}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase mb-3 text-gray-500 tracking-wider">Ano</p>
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setYearFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${yearFilter === 'all' ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/5 border-black/5 text-gray-500 hover:bg-black/10'}`}
                      >
                        Todos
                      </motion.button>
                      {availableYears.map((y) => (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          key={y}
                          onClick={() => setYearFilter(y)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${yearFilter === y ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/5 border-black/5 text-gray-500 hover:bg-black/10'}`}
                        >
                          {y}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase mb-3 text-gray-500 tracking-wider">Mês</p>
                    <div className="grid grid-cols-4 gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMonthFilter('all')}
                        className={`px-2 py-2 rounded-xl text-xs font-medium border text-center transition-all ${monthFilter === 'all' ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/5 border-black/5 text-gray-500 hover:bg-black/10'}`}
                      >
                        Todos
                      </motion.button>
                      {monthNames.map((m, idx) => (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          key={m}
                          onClick={() => setMonthFilter(idx)}
                          className={`px-2 py-2 rounded-xl text-xs font-medium border text-center transition-all ${monthFilter === idx ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/5 border-black/5 text-gray-500 hover:bg-black/10'}`}
                        >
                          {m}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase mb-3 text-gray-500 tracking-wider">Categoria</p>
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCategoryFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${categoryFilter === 'all' ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/5 border-black/5 text-gray-500 hover:bg-black/10'}`}
                      >
                        Todas
                      </motion.button>
                      {categoriesForFilter.map((name) => (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          key={name}
                          onClick={() => setCategoryFilter(name)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${categoryFilter === name ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/5 border-black/5 text-gray-500 hover:bg-black/10'}`}
                        >
                          {name}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setYearFilter('all'); setMonthFilter('all'); setCategoryFilter('all'); setDateFilter(null); navigate(location.pathname); }} className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-3 font-bold hover:bg-gray-100 transition-all text-gray-900">Limpar</motion.button>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowFilter(false)} className="flex-1 rounded-xl bg-secondary/80 border border-white/20 shadow-lg shadow-secondary/20 py-3 font-bold text-white transition-all hover:bg-secondary">Aplicar</motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {((statusFilter !== 'all') || (typeFilter !== 'all') || (monthFilter !== 'all') || (yearFilter !== 'all') || (categoryFilter !== 'all') || dateFilter) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {dateFilter && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/20 border border-primary/30 text-gray-900 backdrop-blur-md">
                Data: {parseLocalISODate(dateFilter).toLocaleDateString('pt-BR')}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/5 border border-black/10 text-gray-900 backdrop-blur-md">{statusFilter === 'paid' ? 'Pagos' : 'Pendentes'}</span>
            )}
            {typeFilter !== 'all' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/5 border border-black/10 text-gray-900 backdrop-blur-md">{typeFilter === 'income' ? 'Entradas' : 'Saídas'}</span>
            )}
            {yearFilter !== 'all' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/5 border border-black/10 text-gray-900 backdrop-blur-md">{yearFilter}</span>
            )}
            {monthFilter !== 'all' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/5 border border-black/10 text-gray-900 backdrop-blur-md">{monthNames[monthFilter as number]}</span>
            )}
            {categoryFilter !== 'all' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/5 border border-black/10 text-gray-900 backdrop-blur-md">{categoryFilter}</span>
            )}
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setYearFilter('all'); setMonthFilter('all'); setCategoryFilter('all'); setDateFilter(null); navigate(location.pathname); }} className="px-3 py-1 rounded-full text-xs font-bold bg-danger/20 text-danger border border-danger/30 backdrop-blur-md hover:bg-danger/30 transition-all">Limpar</motion.button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
            <p className="font-medium">Nenhuma transação encontrada</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => navigate('/add-transaction')}
              className="mt-4 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary-light font-bold hover:bg-primary/30 transition-all"
            >
              Adicionar nova
            </motion.button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, groupItems], groupIndex) => (
            <div key={date} className="mb-6">
              <h2 className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{date}</h2>
              <div className="space-y-3">
                {(groupItems as any[]).map((t: any, i: number) => (
                  <div key={t.id} className="relative group">
                    <div className="absolute inset-y-0 right-0 flex items-center gap-2 px-0 z-0 h-full pl-4">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => navigate(`/add-transaction?edit=${t.id}`)}
                        className="h-full w-12 rounded-xl bg-primary/80 border border-white/40 text-white flex items-center justify-center shadow-lg backdrop-blur-md"
                        style={{ marginLeft: 'auto' }}
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('user_transactions')
                            .delete()
                            .eq('id', t.id);
                          if (!error) {
                            setItems(prev => prev.filter(x => x.id !== t.id));
                            setOpenId(null);
                          }
                        }}
                        className="h-full w-12 rounded-xl bg-danger/80 border border-white/40 text-white flex items-center justify-center shadow-lg backdrop-blur-md ml-2"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </motion.button>
                    </div>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0, x: openId === t.id ? -110 : 0 }}
                      transition={{ delay: i * 0.05 + groupIndex * 0.1 }}
                      drag="x"
                      dragConstraints={{ left: -110, right: 0 }}
                      dragElastic={0.05}
                      dragMomentum={false}
                      onDragStart={() => setOpenId(null)}
                      onDragEnd={(e, info) => {
                        setOpenId(info.offset.x < -50 ? t.id : null);
                      }}
                      className="relative z-10 flex items-center gap-4 px-4 py-4 bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-glass active:scale-[0.99] transition-all"
                    >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 ${t.type === 'income' ? 'bg-secondary/20 text-secondary' : 'bg-danger/20 text-danger'} self-center shadow-inner`}>
                      <span className="material-symbols-outlined font-bold text-xl">{t.type === 'income' ? 'arrow_downward' : 'arrow_upward'}</span>
                    </div>
                      <div className="flex flex-1 flex-col overflow-hidden">
                        <p className={`font-bold text-gray-900 text-sm truncate ${t.is_paid ? 'line-through opacity-50' : ''}`}>{t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {(() => {
                              const cat = t.category_id ? catMap[t.category_id as string] : null;
                              const name = cat?.name || 'Sem Categoria';
                              return (
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold shadow-sm backdrop-blur-sm"
                                  style={styleForBadge(name)}
                                >
                                  {name}
                                </span>
                              );
                            })()}
                            <span className="text-[10px] text-gray-500">{parseLocalISODate(t.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                          </div>
                      </div>
                      <p className={`font-bold text-base ${t.type === 'income' ? 'text-secondary' : 'text-danger'} self-center ${t.is_paid ? 'line-through opacity-50' : ''} ${isPrivacyEnabled ? 'filter blur-sm select-none' : ''}`}>
                        {formatBRL(Number(t.amount))}
                      </p>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Transactions;

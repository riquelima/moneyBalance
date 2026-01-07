import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { categories } from '../categories';

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<Array<{ id: string; description: string | null; amount: number; type: 'income' | 'expense'; date: string; is_paid: boolean; category_id: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [catMap, setCatMap] = useState<Record<string, { name: string; type: 'income' | 'expense' }>>({});
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
        color: `hsl(${hue}, 85%, 60%)`,
        borderColor: `hsla(${hue}, 85%, 60%, 0.30)`
      } as React.CSSProperties;
    }
    const idx = categoryOrder.indexOf(n);
    const i = idx >= 0 ? idx : (hashCode(n) % hues.length);
    const hue = hues[i];
    return {
      backgroundColor: `hsla(${hue}, 85%, 55%, 0.15)`,
      color: `hsl(${hue}, 85%, 60%)`,
      borderColor: `hsla(${hue}, 85%, 60%, 0.30)`
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
  const labelForDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const ytd = new Date(); ytd.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Hoje';
    if (sameDay(d, ytd)) return 'Ontem';
    return d.toLocaleDateString('pt-BR');
  };

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


  const categoriesForFilter = useMemo(() => {
    const hasNone = items.some(i => !i.category_id);
    const names = hasNone ? (['Sem Categoria', ...categories]) : categories.slice();
    return names;
  }, [items]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const type = params.get('type');
    const month = params.get('month');
    if (status === 'pending') setStatusFilter('pending');
    if (status === 'paid') setStatusFilter('paid');
    if (type === 'expense' || type === 'income') setTypeFilter(type as any);
    if (month !== null) {
      const m = Number(month);
      if (!Number.isNaN(m) && m >= 0 && m <= 11) setMonthFilter(m);
    } else {
      // Default to current month if no month filter is provided
      setMonthFilter(new Date().getMonth());
    }
    setCategoryFilter('all');
  }, [location.search]);

  const filteredItems = useMemo(() => {
    let arr = items.slice();
    if (statusFilter === 'paid') arr = arr.filter(t => t.is_paid);
    if (statusFilter === 'pending') arr = arr.filter(t => !t.is_paid);
    if (typeFilter !== 'all') arr = arr.filter(t => t.type === typeFilter);
    if (monthFilter !== 'all') arr = arr.filter(t => new Date(t.date).getMonth() === monthFilter);
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'Sem Categoria') arr = arr.filter(t => !t.category_id);
      else arr = arr.filter(t => {
        const nm = t.category_id ? catMap[t.category_id]?.name : null;
        return nm === categoryFilter;
      });
    }
    // Sort ascending by date (oldest first)
    arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
      className="flex flex-col min-h-screen pb-24 bg-background-light dark:bg-background-dark transition-colors duration-300"
    >
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white dark:bg-surface-dark p-4 border-b-3 border-dark dark:border-white shadow-sm transition-colors duration-300">
        <button
          type="button"
          onClick={() => setShowFilter(true)}
          className="flex w-10 items-center justify-center text-dark dark:text-white border-2 border-dark dark:border-white bg-white dark:bg-surface-dark shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-y-[2px] transition-all p-1"
        >
          <span className="material-symbols-outlined text-2xl">filter_alt</span>
        </button>
        <h1 className="text-xl font-black uppercase tracking-widest text-dark dark:text-white">Transações</h1>
        <button
          type="button"
          onClick={() => navigate('/add-transaction')}
          className="flex w-10 items-center justify-center text-white bg-primary border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-y-[2px] transition-all p-1"
        >
          <span className="material-symbols-outlined text-3xl">add_circle</span>
        </button>
      </header>

      <div className="p-4 z-10 relative">
        <div className="flex items-center rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] px-4 py-3">
          <span className="material-symbols-outlined text-dark dark:text-white mr-2">search</span>
          <input 
            type="text" 
            placeholder="BUSCAR TRANSAÇÕES"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-dark dark:text-white placeholder:text-text-secondary dark:placeholder:text-text-secondary/70 outline-none border-none focus:ring-0 p-0 font-bold uppercase"
          />
        </div>
        {((statusFilter !== 'all') || (typeFilter !== 'all') || (monthFilter !== 'all') || (categoryFilter !== 'all')) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {statusFilter !== 'all' && (
              <span className="px-3 py-1 rounded-sm text-xs font-black uppercase bg-white dark:bg-surface-dark border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-dark dark:text-white">{statusFilter === 'paid' ? 'Pagos' : 'Pendentes'}</span>
            )}
            {typeFilter !== 'all' && (
              <span className="px-3 py-1 rounded-sm text-xs font-black uppercase bg-white dark:bg-surface-dark border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-dark dark:text-white">{typeFilter === 'income' ? 'Entradas' : 'Saídas'}</span>
            )}
            {monthFilter !== 'all' && (
              <span className="px-3 py-1 rounded-sm text-xs font-black uppercase bg-white dark:bg-surface-dark border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-dark dark:text-white">{monthNames[monthFilter as number]}</span>
            )}
            {categoryFilter !== 'all' && (
              <span className="px-3 py-1 rounded-sm text-xs font-black uppercase bg-white dark:bg-surface-dark border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-dark dark:text-white">{categoryFilter}</span>
            )}
            <button onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setMonthFilter('all'); setCategoryFilter('all'); }} className="px-3 py-1 rounded-sm text-xs font-black uppercase bg-danger text-white border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all">Limpar</button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {loading ? (
          <p className="px-6 py-4 text-dark dark:text-white font-bold">CARREGANDO...</p>
        ) : filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center text-dark dark:text-white">
            <p className="font-bold">NENHUMA TRANSAÇÃO CADASTRADA.</p>
            <button
              type="button"
              onClick={() => navigate('/add-transaction')}
              className="mt-2 text-primary font-black hover:underline uppercase"
            >
              Adicionar transação
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, groupItems], groupIndex) => (
            <div key={date} className="mb-4">
              <h2 className="py-2 text-sm font-black uppercase tracking-widest text-dark dark:text-white border-b-2 border-dark dark:border-white mb-2">{date}</h2>
              {(groupItems as any[]).map((t: any, i: number) => (
                <div key={t.id} className="relative mb-3">
                  <div className="absolute inset-y-0 right-0 flex items-center gap-2 px-0 z-0 h-full">
                    <button
                      type="button"
                      onClick={() => navigate(`/add-transaction?edit=${t.id}`)}
                      className="h-full w-12 rounded-r-sm bg-primary border-y-2 border-r-2 border-dark dark:border-white text-white flex items-center justify-center shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                      style={{ marginLeft: 'auto' }}
                    >
                      <img src="https://cdn-icons-png.flaticon.com/512/860/860814.png" alt="Editar" className="h-5 w-5 invert" />
                    </button>
                    <button
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
                      className="h-full w-12 bg-danger border-y-2 border-r-2 border-dark dark:border-white text-white flex items-center justify-center shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ml-2"
                    >
                      <img src="https://cdn-icons-png.flaticon.com/512/6861/6861362.png" alt="Excluir" className="h-5 w-5 invert" />
                    </button>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: openId === t.id ? -100 : 0 }}
                    transition={{ delay: i * 0.05 + groupIndex * 0.1 }}
                    drag="x"
                    dragConstraints={{ left: -100, right: 0 }}
                    dragElastic={0.05}
                    dragMomentum={false}
                    onDragStart={() => setOpenId(null)}
                    onDragEnd={(e, info) => {
                      setOpenId(info.offset.x < -50 ? t.id : null);
                    }}
                    className="relative z-10 flex items-center gap-4 px-4 py-4 bg-white dark:bg-surface-dark border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-[1px] active:shadow-none transition-all"
                  >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-2 border-dark dark:border-white ${t.type === 'income' ? 'bg-secondary text-white' : 'bg-danger text-white'} self-center`}>
                    <span className="material-symbols-outlined font-bold">{t.type === 'income' ? 'arrow_downward' : 'arrow_upward'}</span>
                  </div>
                    <div className="flex flex-1 flex-col">
                      <p className={`font-black text-dark dark:text-white uppercase line-clamp-1 ${t.is_paid ? 'line-through opacity-60' : ''}`}>{t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')}</p>
                      {(() => {
                        const cat = t.category_id ? catMap[t.category_id as string] : null;
                        const name = cat?.name || 'Sem Categoria';
                        return (
                          <span className="mt-1 inline-flex w-fit self-start items-center px-1 border-2 border-dark dark:border-white text-[10px] font-bold uppercase bg-accent text-dark shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">{name}</span>
                        );
                      })()}
                      <p className="mt-1 text-[10px] font-bold text-text-secondary dark:text-text-secondary/70 uppercase">Prazo: {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p className={`font-black text-lg ${t.type === 'income' ? 'text-secondary' : 'text-danger'} self-center ${t.is_paid ? 'line-through opacity-60' : ''}`}>
                      {formatBRL(Number(t.amount))}
                    </p>
                  </motion.div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {showFilter && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="w-full max-w-md bg-white dark:bg-surface-dark p-6 border-t-4 border-x-4 border-dark dark:border-white shadow-[0_-4px_0px_0px_#000000] dark:shadow-[0_-4px_0px_0px_#FFFFFF]">
            <div className="flex items-center justify-between mb-6 border-b-2 border-dark dark:border-white pb-2">
              <h3 className="text-xl font-black uppercase text-dark dark:text-white">Filtrar transações</h3>
              <button onClick={() => setShowFilter(false)} className="text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10 p-1 border-2 border-transparent hover:border-dark dark:hover:border-white transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm font-black uppercase mb-2 text-dark dark:text-white">Status</p>
              <div className="grid grid-cols-3 gap-2">
                {['all','paid','pending'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s as any)}
                    className={`px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all ${statusFilter === s ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10'}`}
                  >
                    {s === 'all' ? 'Todos' : s === 'paid' ? 'Pagos' : 'Pendentes'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm font-black uppercase mb-2 text-dark dark:text-white">Tipo</p>
              <div className="grid grid-cols-3 gap-2">
                {['all','income','expense'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t as any)}
                    className={`px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all ${typeFilter === t ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10'}`}
                  >
                    {t === 'all' ? 'Todos' : t === 'income' ? 'Entradas' : 'Saídas'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm font-black uppercase mb-2 text-dark dark:text-white">Mês</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setMonthFilter('all')}
                  className={`px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all ${monthFilter === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10'}`}
                >
                  Todos
                </button>
                {monthNames.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => setMonthFilter(idx)}
                    className={`px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all ${monthFilter === idx ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm font-black uppercase mb-2 text-dark dark:text-white">Categoria</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all ${categoryFilter === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10'}`}
                >
                  Todas
                </button>
                {categoriesForFilter.map((name) => (
                  <button
                    key={name}
                    onClick={() => setCategoryFilter(name)}
                    className={`px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all ${categoryFilter === name ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-white/10'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setMonthFilter('all'); setCategoryFilter('all'); }} className="flex-1 rounded-sm border-2 border-dark dark:border-white bg-white dark:bg-surface-dark shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] py-3 font-black uppercase hover:bg-surface-light dark:hover:bg-white/10 active:translate-y-[2px] active:shadow-none transition-all text-dark dark:text-white">Limpar</button>
              <button onClick={() => setShowFilter(false)} className="flex-1 rounded-sm border-2 border-dark dark:border-white bg-secondary shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] py-3 font-black uppercase text-white active:translate-y-[2px] active:shadow-none transition-all">Aplicar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Transactions;

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

const getCategoryEmoji = (categoryName: string, type: 'income' | 'expense'): string => {
  const name = categoryName.toLowerCase();
  if (name.includes('salário') || name.includes('salario') || name.includes('renda') || name.includes('trabalho') || name.includes('freelance') || name.includes('job') || name.includes('recebimento')) {
    return '💼';
  }
  if (name.includes('aluguel') || name.includes('casa') || name.includes('moradia') || name.includes('lar') || name.includes('condomínio') || name.includes('condominio') || name.includes('energia') || name.includes('água') || name.includes('agua') || name.includes('luz') || name.includes('internet') || name.includes('lixo') || name.includes('gás') || name.includes('gas')) {
    return '🏠';
  }
  if (name.includes('mercado') || name.includes('feira') || name.includes('alimentação') || name.includes('compras') || name.includes('comida') || name.includes('supermercado') || name.includes('açougue') || name.includes('padaria')) {
    return '🛍️';
  }
  if (name.includes('academia') || name.includes('saúde') || name.includes('saude') || name.includes('medico') || name.includes('médico') || name.includes('farmácia') || name.includes('farmacia') || name.includes('crossfit') || name.includes('treino') || name.includes('dentista') || name.includes('remédio') || name.includes('remedio') || name.includes('hospital') || name.includes('exame')) {
    return '🏋️';
  }
  if (name.includes('freelance') || name.includes('design') || name.includes('desenvolvimento') || name.includes('computador') || name.includes('tecnologia') || name.includes('software') || name.includes('hospedagem') || name.includes('domínio') || name.includes('dominio')) {
    return '💻';
  }
  if (name.includes('café') || name.includes('cafe') || name.includes('padaria') || name.includes('lanche') || name.includes('chá') || name.includes('cha') || name.includes('restaurante') || name.includes('bar') || name.includes('pizzaria') || name.includes('hambúrguer') || name.includes('ifood') || name.includes('delivery')) {
    return '☕';
  }
  if (name.includes('transporte') || name.includes('ônibus') || name.includes('onibus') || name.includes('bus') || name.includes('carro') || name.includes('uber') || name.includes('gasolina') || name.includes('combustível') || name.includes('combustivel') || name.includes('viagem') || name.includes('pedágio') || name.includes('pedagio') || name.includes('estacionamento')) {
    return '🚌';
  }
  if (name.includes('lazer') || name.includes('entretenimento') || name.includes('cinema') || name.includes('show') || name.includes('festa') || name.includes('jogo') || name.includes('game') || name.includes('stream') || name.includes('netflix') || name.includes('spotify') || name.includes('youtube') || name.includes('prime') || name.includes('futebol')) {
    return '🎉';
  }
  if (name.includes('educação') || name.includes('educacao') || name.includes('curso') || name.includes('livro') || name.includes('escola') || name.includes('faculdade') || name.includes('material') || name.includes('estudo')) {
    return '📚';
  }
  if (name.includes('investimento') || name.includes('poupança') || name.includes('poupanca') || name.includes('ações') || name.includes('acoes') || name.includes('tesouro') || name.includes('cripto') || name.includes('cdb')) {
    return '📈';
  }
  return type === 'income' ? '💰' : '💸';
};

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="tx-page-container min-h-screen pb-28 flex flex-col"
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Orbitron:wght@400;500;600;700&display=swap');

        :root {
          --tx-bg: #f5f6fa;
          --tx-surface: #ffffff;
          --tx-border: #f0f1f5;
          --tx-fg: #111111;
          --tx-muted: #aaaaaa;
          --tx-accent: #8854D0;
          --tx-success: #2e9e44;
          --tx-outcome-val: #111111;
          --tx-header-bg: #ffffff;
        }

        .dark {
          --tx-bg: #0c0c0e;
          --tx-surface: #1c1c1e;
          --tx-border: #2c2c2e;
          --tx-fg: #ffffff;
          --tx-muted: #777777;
          --tx-accent: #8854D0;
          --tx-success: #40c057;
          --tx-outcome-val: #ffffff;
          --tx-header-bg: #1c1c1e;
        }

        .tx-page-container {
          background-color: var(--tx-bg);
          font-family: 'Poppins', sans-serif !important;
          color: var(--tx-fg);
        }

        .tx-page-container *:not(.material-symbols-outlined) {
          font-family: 'Poppins', sans-serif !important;
        }

        /* Header */
        .tx-header {
          background: var(--tx-header-bg);
          padding: 16px 20px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-bottom: 1px solid var(--tx-border);
        }

        .tx-back-btn {
          position: absolute;
          left: 20px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: var(--tx-fg);
          padding: 6px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .tx-back-btn:hover {
          background: var(--tx-border);
        }

        .tx-back-btn svg {
          width: 22px;
          height: 22px;
        }

        .tx-cal-header-btn {
          position: absolute;
          right: 20px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: var(--tx-fg);
          padding: 6px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .tx-cal-header-btn:hover {
          background: var(--tx-border);
        }
        .tx-cal-header-btn svg {
          width: 22px;
          height: 22px;
        }

        .tx-header h1 {
          font-size: 17px;
          font-weight: 600;
          color: var(--tx-fg);
          letter-spacing: -0.2px;
          margin: 0;
        }

        /* Period button */
        .tx-period-btn {
          height: 24px;
          padding: 0 10px;
          border: 1px solid var(--tx-border);
          background: var(--tx-bg);
          border-radius: 12px;
          color: var(--tx-fg);
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        
        .tx-period-btn:hover {
          background: var(--tx-border);
        }

        /* Right Header Action */
        .tx-notif-btn {
          position: absolute;
          right: 20px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--tx-fg);
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: background 0.2s;
        }

        .tx-notif-btn:hover {
          background: var(--tx-border);
        }

        .tx-notif-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 6px;
          height: 6px;
          background: #ff6b6b;
          border-radius: 50%;
        }

        /* Search */
        .tx-search-wrap {
          background: var(--tx-surface);
          padding: 14px 20px;
        }

        .tx-search-box {
          background: var(--tx-bg);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tx-search-box svg {
          width: 18px;
          height: 18px;
          color: var(--tx-muted);
          flex-shrink: 0;
        }

        .tx-search-input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          font-weight: 400;
          color: var(--tx-fg);
          width: 100%;
          padding: 0;
          margin: 0;
        }

        .tx-search-input::placeholder {
          color: var(--tx-muted);
        }

        /* Filters */
        .tx-filters-bar {
          background: var(--tx-surface);
          padding: 0 20px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--tx-border);
          overflow-x: auto;
        }

        .tx-filters-bar::-webkit-scrollbar {
          display: none;
        }

        .tx-filter-icon-btn {
          width: 38px;
          height: 38px;
          border: 1.5px solid var(--tx-border);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--tx-surface);
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          color: var(--tx-fg);
        }

        .tx-filter-icon-btn:hover {
          background: var(--tx-border);
        }

        .tx-filter-icon-btn svg {
          width: 18px;
          height: 18px;
        }

        .tx-chip {
          padding: 8px 18px;
          border-radius: 50px;
          font-size: 13.5px;
          font-weight: 500;
          border: 1.5px solid var(--tx-border);
          background: var(--tx-surface);
          color: var(--tx-fg);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .tx-chip:hover {
          background: var(--tx-border);
        }

        .tx-chip.active {
          background: var(--tx-accent) !important;
          border-color: var(--tx-accent) !important;
          color: #ffffff !important;
          font-weight: 600;
        }

        /* Section Label */
        .tx-section-label {
          padding: 18px 20px 8px;
          font-size: 12px;
          font-weight: 700;
          color: var(--tx-accent);
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        /* Transaction List & Item */
        .tx-list {
          background: var(--tx-surface);
        }

        .tx-item-row {
          display: flex;
          align-items: center;
          padding: 14px 20px;
          gap: 13px;
          border-bottom: 1px solid var(--tx-border);
          transition: background 0.15s;
          background: var(--tx-surface);
        }

        .tx-item-row:last-child {
          border-bottom: none;
        }

        .tx-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: var(--tx-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          transition: all 0.2s;
          color: var(--tx-fg);
        }

        .tx-icon-box.selected {
          background: var(--tx-accent) !important;
          color: #ffffff !important;
          font-size: 18px;
        }

        .tx-info-block {
          flex: 1;
          min-width: 0;
        }

        .tx-title {
          font-size: 14.5px;
          font-weight: 500;
          color: var(--tx-fg);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tx-date-sub {
          font-size: 12px;
          color: var(--tx-muted);
          font-weight: 400;
        }

        .tx-amount-block {
          text-align: right;
          flex-shrink: 0;
        }

        .tx-val-text {
          font-size: 14.5px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .tx-val-text.income {
          color: var(--tx-success);
        }

        .tx-val-text.outcome {
          color: var(--tx-outcome-val);
        }

        .tx-type-sub {
          font-size: 12px;
          color: var(--tx-muted);
          font-weight: 400;
        }

        /* Home indicator */
        .tx-home-indicator {
          background: var(--tx-surface);
          padding: 8px 0 20px;
          display: flex;
          justify-content: center;
        }

        .tx-home-bar {
          width: 130px;
          height: 5px;
          background: var(--tx-fg);
          border-radius: 10px;
          opacity: 0.15;
        }
      `}} />

      {/* --- Cabeçalho iOS Luxury Minimalist --- */}
      <div className="tx-header">
        <button className="tx-back-btn" onClick={() => navigate('/')} aria-label="Voltar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <h1>Histórico de Transações</h1>

        <button className="tx-cal-header-btn" onClick={() => setShowMonthPicker(s => !s)} aria-label="Alterar Período">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
      </div>

      {/* --- Busca Oval --- */}
      <div className="tx-search-wrap">
        <div className="tx-search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tx-search-input"
          />
        </div>
      </div>

      {/* --- Filtros de Chips e Trigger Avançado --- */}
      <div className="tx-filters-bar">
        <button className="tx-filter-icon-btn" onClick={() => setShowFilter(true)} aria-label="Filtros Avançados">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
        </button>

        <button 
          className={`tx-chip ${typeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setTypeFilter('all')}
        >
          Todos
        </button>
        <button 
          className={`tx-chip ${typeFilter === 'income' ? 'active' : ''}`}
          onClick={() => setTypeFilter('income')}
        >
          Receita
        </button>
        <button 
          className={`tx-chip ${typeFilter === 'expense' ? 'active' : ''}`}
          onClick={() => setTypeFilter('expense')}
        >
          Despesa
        </button>

        {/* Limpeza rápida de filtros ativos */}
        {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all' || dateFilter) && (
          <button
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
            className="tx-chip"
            style={{ color: '#ff6b6b', borderColor: 'rgba(255, 107, 107, 0.2)', background: 'rgba(255, 107, 107, 0.05)', fontWeight: '600' }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* --- Lista de Transações com Swipe e Seleção em Lote --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading && page === 0 ? (
          <div className="space-y-4 pt-4 px-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-100 dark:border-[#2c2c2e]">
                <Skeleton variant="circular" width={44} height={44} />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" width="60%" height={16} />
                  <Skeleton variant="text" width="30%" height={12} />
                </div>
                <Skeleton variant="text" width={60} height={18} />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-500">receipt_long</span>
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-1">Nenhuma transação</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[240px]">Não encontramos nada com os filtros atuais.</p>
            <button
              onClick={() => navigate('/add-transaction')}
              className="mt-6 px-6 py-2.5 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors"
            >
              Adicionar Nova
            </button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {Object.entries(grouped).map(([date, groupItems], groupIndex) => (
              <div key={date} className="mb-2">
                <div className="tx-section-label">
                  {date}
                </div>

                <div className="tx-list">
                  {(groupItems as any[]).map((t: any) => {
                    const cat = t.category_id ? catMap[t.category_id] : null;
                    const catName = cat?.name || 'Sem Categoria';
                    const isSelected = selectedIds.includes(t.id);
                    const isIncome = t.type === 'income';
                    const emoji = getCategoryEmoji(catName, t.type);

                    return (
                      <motion.div
                        key={t.id}
                        variants={itemVariants}
                        layout
                        className="relative group overflow-hidden"
                      >
                        {/* Ações de Swipe */}
                        <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-4 z-0">
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
                            className="h-[80%] w-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>

                        {/* Card do Item de Transação */}
                        <motion.div
                          drag="x"
                          dragConstraints={{ left: -120, right: 0 }}
                          dragElastic={0.1}
                          onDragStart={() => setOpenId(null)}
                          onDragEnd={(e, info) => setOpenId(info.offset.x < -50 ? t.id : null)}
                          animate={{ x: openId === t.id ? -120 : 0 }}
                          onTap={() => toggleSelect(t.id)}
                          className="relative z-10 tx-item-row cursor-pointer select-none"
                          style={{
                            borderLeft: isSelected ? '4px solid var(--tx-accent)' : 'none',
                            paddingLeft: isSelected ? '16px' : '20px'
                          }}
                        >
                          <div className={`tx-icon-box ${isSelected ? 'selected' : ''}`}>
                            {isSelected ? (
                              <span className="material-symbols-outlined text-base">check</span>
                            ) : (
                              emoji
                            )}
                          </div>

                          <div className="tx-info-block">
                            <div className={`tx-title ${t.is_paid ? 'line-through opacity-50' : ''}`}>
                              {t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')}
                            </div>
                            <div className="tx-date-sub">
                              {parseLocalISODate(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {parseLocalISODate(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div className="tx-amount-block">
                            <div className={`tx-val-text ${isIncome ? 'income' : 'outcome'} ${isPrivacyEnabled ? 'blur-sm' : ''} ${t.is_paid ? 'line-through opacity-50' : ''}`}>
                              {isIncome ? '+' : '−'}{formatBRL(t.amount).replace('R$', 'R$ ')}
                            </div>
                            <div className="tx-type-sub">
                              {isIncome ? 'Receita' : 'Despesa'}
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {hasMore && (
          <div className="py-6 flex justify-center px-4">
            <button
              onClick={() => fetchTransactions(page + 1)}
              disabled={loadingMore}
              className="w-full max-w-xs py-3 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#2c2c2e] text-gray-500 dark:text-gray-400 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </div>

      {/* Indicador Estético Home de iPhone na base */}
      <div className="tx-home-indicator">
        <div className="tx-home-bar"></div>
      </div>

      {/* --- Filter Modal (Portal) --- */}
      {createPortal(
        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
              onClick={() => setShowFilter(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-white dark:bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filtrar Transações</h3>
                  <button onClick={() => setShowFilter(false)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pb-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">Tipo</label>
                    <div className="flex gap-2">
                      {['all', 'income', 'expense'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTypeFilter(t as any)}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${typeFilter === t ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                        >
                          {t === 'all' ? 'Todos' : t === 'income' ? 'Entradas' : 'Saídas'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">Status</label>
                    <div className="flex gap-2">
                      {['all', 'paid', 'pending'].map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s as any)}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${statusFilter === s ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                        >
                          {s === 'all' ? 'Todos' : s === 'paid' ? 'Pagos' : 'Pendentes'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">Categoria</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setCategoryFilter('all')}
                        className={`px-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center w-full leading-snug ${categoryFilter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                      >
                        Todas
                      </button>
                      {categoriesForFilter.map(name => (
                        <button
                          key={name}
                          onClick={() => setCategoryFilter(name)}
                          className={`px-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center w-full leading-snug ${categoryFilter === name ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => setShowFilter(false)}
                    className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* --- Bottom Sheet de Seleção de Mês (Portal) --- */}
      {createPortal(
        <AnimatePresence>
          {showMonthPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 backdrop-blur-sm"
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
                className="w-full max-w-md bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl p-6 rounded-t-[2.5rem] border-t border-white/40 dark:border-white/10 shadow-glass-lg relative flex flex-col gap-4 select-none cursor-grab active:cursor-grabbing text-gray-900 dark:text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-2" />

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

      {/* --- Modal de Confirmação de Exclusão de Recorrências (Portal) --- */}
      {createPortal(
        <AnimatePresence>
          {showDeleteConfirmModal && transactionToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/40 dark:border-white/10 shadow-glass-lg max-w-sm w-full flex flex-col gap-4 text-center select-none"
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
                    className="w-full py-3.5 rounded-xl bg-danger text-white font-black text-xs uppercase shadow-md shadow-danger/20 transition-all"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Excluindo...' : 'Excluir todas as recorrências'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      await handleDeleteTransaction(false);
                    }}
                    className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black text-xs uppercase hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Excluindo...' : 'Excluir apenas esta'}
                  </motion.button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirmModal(false);
                      setTransactionToDelete(null);
                    }}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-1 transition-colors outline-none"
                    disabled={isDeleting}
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* --- Barra de Ações em Lote Flutuante (Portal) --- */}
      {createPortal(
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-28 left-4 right-4 z-[110] p-4 max-w-md mx-auto bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-glass-lg rounded-2xl flex items-center justify-between gap-4 select-none text-gray-900 dark:text-white"
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

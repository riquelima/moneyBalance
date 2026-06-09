import React, { useState, useEffect, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { parseLocalISODate } from '../../utils/date';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  is_paid: boolean;
  category_id?: string;
}

interface CalendarViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const getCategoryIconUrl = (name: string): string => {
  const n = name.toLowerCase();
  
  // Regras Específicas do Usuário (Money Balance)
  if (n.includes('educação') || n.includes('desenvolvimento') || n.includes('escola') || n.includes('curso') || n.includes('faculdade') || n.includes('estudo')) return 'https://cdn-icons-png.flaticon.com/512/4406/4406319.png';
  if (n.includes('imprevisto') || n.includes('urgência') || n.includes('emergência') || n.includes('conserto') || n.includes('reforma')) return 'https://cdn-icons-png.flaticon.com/512/3756/3756712.png';
  if (n.includes('rendimento') || n.includes('invest') || n.includes('economia') || n.includes('poupança') || n.includes('aplicação')) return 'https://cdn-icons-png.flaticon.com/512/10013/10013195.png';
  if (n.includes('dinheiro extra') || n.includes('extra') || n.includes('freela') || n.includes('bico')) return 'https://cdn-icons-png.flaticon.com/512/8283/8283617.png';
  if (n.includes('intelektus')) return 'https://cdn-icons-png.flaticon.com/512/7747/7747220.png';
  if (n.includes('back') || n.includes('beck')) return 'https://cdn-icons-png.flaticon.com/512/2160/2160424.png';
  if (n.includes('cartão de crédito') || n.includes('cartão') || n.includes('crédito') || n.includes('limite')) return 'https://cdn-icons-png.flaticon.com/512/2625/2625610.png';
  if (n.includes('cigarro') || n.includes('fumo') || n.includes('tabaco') || n.includes('tabacaria')) return 'https://cdn-icons-png.flaticon.com/512/595/595593.png';
  if (n.includes('delivery') || n.includes('ifood') || n.includes('entrega') || n.includes('rappi')) return 'https://cdn-icons-png.flaticon.com/512/3081/3081371.png';
  if (n.includes('empréstimo') || n.includes('financiamento') || n.includes('parcela de empréstimo')) return 'https://cdn-icons-png.flaticon.com/512/9428/9428343.png';
  if (n.includes('serviço') || n.includes('assinatura') || n.includes('mensalidade')) return 'https://cdn-icons-png.flaticon.com/512/3631/3631153.png';
  if (n.includes('transferência própria') || n.includes('transferência') || n.includes('ted') || n.includes('pix próprio')) return 'https://cdn-icons-png.flaticon.com/512/3344/3344961.png';
  
  if (n.includes('uazapi')) return 'https://cdn-icons-png.flaticon.com/512/2082/2082823.png';
  if (n.includes('lúcia') || n.includes('dona lúcia')) return 'https://cdn-icons-png.flaticon.com/512/619/619153.png';
  if (n.includes('mercado') || n.includes('feira') || n.includes('cesta')) return 'https://cdn-icons-png.flaticon.com/512/2203/2203239.png';
  if (n.includes('refeição') || n.includes('alimentação') || n.includes('comer') || n.includes('restaurante') || n.includes('cafe') || n.includes('café') || n.includes('padaria')) return 'https://cdn-icons-png.flaticon.com/512/2424/2424721.png';
  if (n.includes('transporte') || n.includes('ônibus') || n.includes('bus') || n.includes('carro') || n.includes('uber') || n.includes('gasolina') || n.includes('combustível')) return 'https://cdn-icons-png.flaticon.com/512/741/741407.png';
  if (n.includes('aluguel') || n.includes('moradia') || n.includes('casa') || n.includes('apartamento') || n.includes('condomínio')) return 'https://cdn-icons-png.flaticon.com/512/619/619153.png';
  if (n.includes('lazer') || n.includes('social') || n.includes('cinema') || n.includes('filme') || n.includes('pipoca') || n.includes('show') || n.includes('festa') || n.includes('viagem')) return 'https://cdn-icons-png.flaticon.com/512/3588/3588658.png';
  if (n.includes('saúde') || n.includes('médico') || n.includes('remédio') || n.includes('farmácia') || n.includes('hospital') || n.includes('academia') || n.includes('crossfit') || n.includes('dentista')) return 'https://cdn-icons-png.flaticon.com/512/1142/1142172.png';
  if (n.includes('compras') || n.includes('shopping') || n.includes('loja') || n.includes('vestuário') || n.includes('roupa')) return 'https://cdn-icons-png.flaticon.com/512/743/743007.png';
  
  if (n.includes('salário') || n.includes('pagamento') || n.includes('renda')) return 'https://cdn-icons-png.flaticon.com/512/2454/2454269.png';
  
  return 'https://cdn-icons-png.flaticon.com/512/5488/5488583.png';
};

/* ─── Ícones SVG inline (sem emoji) ─── */
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconArrowUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
  </svg>
);

const IconArrowDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
  </svg>
);

const IconCalendarEmpty = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="15" x2="8" y2="15" strokeWidth="2" /><line x1="12" y1="15" x2="12" y2="15" strokeWidth="2" /><line x1="16" y1="15" x2="16" y2="15" strokeWidth="2" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ─── Estilos inline (scoped) ─── */
const styles = `
  .calv-root {
    display: flex;
    flex-direction: column;
    gap: 0;
    font-family: var(--mb-font-body);
  }

  /* ── Cartão principal do calendário ── */
  .calv-card {
    background: var(--mb-surface);
    border: 1px solid var(--mb-border);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: var(--mb-shadow-soft);
    position: relative;
  }

  /* ── Cabeçalho do mês com gradiente ── */
  .calv-header {
    background: linear-gradient(135deg,
      oklch(52% 0.22 290) 0%,
      oklch(58% 0.20 310) 60%,
      oklch(64% 0.18 290) 100%
    );
    padding: 18px 16px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }

  .calv-header::before {
    content: '';
    position: absolute;
    top: -30px;
    right: -20px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    pointer-events: none;
  }

  .calv-header::after {
    content: '';
    position: absolute;
    bottom: -40px;
    left: 20px;
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
    pointer-events: none;
  }

  .calv-month-title {
    font-size: 17px;
    font-weight: 700;
    color: #ffffff;
    text-transform: capitalize;
    letter-spacing: -0.3px;
    text-shadow: 0 1px 6px rgba(0,0,0,0.15);
  }

  .calv-nav-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.12);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.18s ease;
    backdrop-filter: blur(8px);
    flex-shrink: 0;
  }
  .calv-nav-btn:hover {
    background: rgba(255,255,255,0.22);
    border-color: rgba(255,255,255,0.38);
  }
  .calv-nav-btn:active {
    transform: scale(0.92);
  }

  /* ── Dias da semana ── */
  .calv-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    padding: 10px 8px 6px;
    background: var(--mb-surface);
    border-bottom: 1px solid var(--mb-border-2);
  }

  .calv-weekday-label {
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mb-muted-2);
    padding: 2px 0;
  }

  /* ── Grade dos dias ── */
  .calv-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    padding: 8px;
    gap: 3px;
    background: var(--mb-surface);
  }

  .calv-day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.12s ease;
    position: relative;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    padding: 2px;
  }

  .calv-day:not(.calv-day--outside):hover {
    background: color-mix(in oklab, var(--mb-accent), transparent 90%);
  }

  .calv-day:active {
    transform: scale(0.88);
  }

  .calv-day--outside {
    opacity: 0.25;
    cursor: default;
    pointer-events: none;
  }

  .calv-day--today .calv-day-num {
    background: var(--mb-accent);
    color: #ffffff;
    box-shadow: 0 2px 10px color-mix(in oklab, var(--mb-accent), transparent 55%);
  }

  .calv-day--selected {
    background: color-mix(in oklab, var(--mb-accent), transparent 84%) !important;
    box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--mb-accent), transparent 60%);
  }

  .calv-day--selected .calv-day-num {
    color: var(--mb-accent);
    font-weight: 800;
  }

  .calv-day--today.calv-day--selected .calv-day-num {
    color: #ffffff;
  }

  .calv-day-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--mb-fg);
    transition: all 0.15s ease;
    line-height: 1;
  }

  /* ── Pontos indicadores ── */
  .calv-dots {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: center;
    height: 6px;
  }

  .calv-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .calv-dot--expense {
    background: var(--mb-danger);
    box-shadow: 0 0 5px color-mix(in oklab, var(--mb-danger), transparent 40%);
  }

  .calv-dot--income {
    background: var(--mb-success);
    box-shadow: 0 0 5px color-mix(in oklab, var(--mb-success), transparent 40%);
  }

  /* ── Rodapé de totais do mês ── */
  .calv-summary {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 14px 16px;
    background: var(--mb-surface-2);
    border-top: 1px solid var(--mb-border-2);
    gap: 8px;
  }

  .calv-summary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex: 1;
  }

  .calv-summary-item + .calv-summary-item {
    border-left: 1px solid var(--mb-border);
  }

  .calv-summary-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mb-muted-2);
  }

  .calv-summary-value {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }

  .calv-summary-value--income { color: var(--mb-success); }
  .calv-summary-value--expense { color: var(--mb-danger); }
  .calv-summary-value--balance { color: var(--mb-fg); }

  /* ── Painel de transações (abaixo do calendário) ── */
  .calv-txn-panel {
    margin-top: 16px;
    background: var(--mb-surface);
    border: 1px solid var(--mb-border);
    border-radius: 22px;
    overflow: hidden;
    box-shadow: var(--mb-shadow-card);
  }

  .calv-txn-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px 12px;
    border-bottom: 1px solid var(--mb-border-2);
  }

  .calv-txn-date-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--mb-fg);
    letter-spacing: -0.2px;
    text-transform: capitalize;
  }

  .calv-txn-count-badge {
    font-size: 11px;
    font-weight: 700;
    color: var(--mb-muted);
    background: var(--mb-surface-2);
    border: 1px solid var(--mb-border);
    border-radius: 99px;
    padding: 2px 10px;
    letter-spacing: 0.02em;
  }

  .calv-txn-list {
    display: flex;
    flex-direction: column;
    padding: 8px 10px 10px;
    gap: 6px;
  }

  /* ── Item de transação ── */
  .calv-txn-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px;
    border-radius: 14px;
    border: 1px solid transparent;
    transition: all 0.18s ease;
    cursor: default;
  }

  .calv-txn-item--expense {
    background: color-mix(in oklab, var(--mb-danger), transparent 93%);
    border-color: color-mix(in oklab, var(--mb-danger), transparent 82%);
  }

  .calv-txn-item--income {
    background: color-mix(in oklab, var(--mb-success), transparent 93%);
    border-color: color-mix(in oklab, var(--mb-success), transparent 82%);
  }

  .calv-txn-item--paid {
    opacity: 0.65;
  }

  /* Ícone lateral da transação */
  .calv-txn-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .calv-txn-icon--expense {
    background: color-mix(in oklab, var(--mb-danger), transparent 84%);
    color: var(--mb-danger);
  }

  .calv-txn-icon--income {
    background: color-mix(in oklab, var(--mb-success), transparent 84%);
    color: var(--mb-success);
  }

  /* Textos da transação */
  .calv-txn-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .calv-txn-desc {
    font-size: 13px;
    font-weight: 600;
    color: var(--mb-fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .calv-txn-amount {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .calv-txn-amount--expense { color: var(--mb-danger); }
  .calv-txn-amount--income  { color: var(--mb-success); }

  /* Botão de pagamento */
  .calv-pay-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1.5px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .calv-pay-btn--unpaid {
    border-color: var(--mb-border);
    background: transparent;
    color: var(--mb-muted-2);
  }

  .calv-pay-btn--unpaid:hover {
    border-color: var(--mb-success);
    color: var(--mb-success);
    background: color-mix(in oklab, var(--mb-success), transparent 90%);
  }

  .calv-pay-btn--paid {
    border-color: var(--mb-success);
    background: var(--mb-success);
    color: #ffffff;
    box-shadow: 0 3px 10px color-mix(in oklab, var(--mb-success), transparent 60%);
  }

  .calv-pay-btn:active {
    transform: scale(0.88);
  }

  /* Status de pagamento */
  .calv-paid-tag {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mb-success);
    opacity: 0.75;
    margin-top: 1px;
  }

  .calv-unpaid-tag {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--mb-muted-2);
    margin-top: 1px;
  }

  /* Estado vazio */
  .calv-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 36px 20px;
    color: var(--mb-muted);
  }

  .calv-empty-text {
    font-size: 13px;
    font-weight: 500;
    color: var(--mb-muted);
    text-align: center;
    line-height: 1.5;
  }

  /* Loading skeleton */
  .calv-skeleton {
    background: linear-gradient(90deg,
      var(--mb-border-2) 25%,
      var(--mb-border) 50%,
      var(--mb-border-2) 75%
    );
    background-size: 200% 100%;
    animation: calv-shimmer 1.4s ease infinite;
    border-radius: 8px;
  }

  @keyframes calv-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Efeito de update no botão pagar */
  @keyframes calv-pop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.18); }
    100% { transform: scale(1); }
  }

  .calv-pay-btn.calv-pay-btn--popping {
    animation: calv-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
`;

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CalendarView: React.FC<CalendarViewProps> = ({ currentDate, setCurrentDate }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [catMap, setCatMap] = useState<Record<string, { name: string; type: 'income' | 'expense' }>>({});

  // Derived dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const calStart   = startOfWeek(monthStart);
  const calEnd     = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Fetch transactions for the current month
  useEffect(() => {
    fetchTransactions();
  }, [currentDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString());

      if (error) throw error;
      setTransactions(data || []);

      // Buscar categorias associadas às transações do mês
      const ids = Array.from(new Set((data || []).map((x: any) => x.category_id).filter(Boolean)));
      if (ids.length) {
        const { data: cats } = await supabase
          .from('user_categories')
          .select('id, name, type')
          .in('id', ids);

        if (cats) {
          setCatMap(prev => {
            const next = { ...prev };
            cats.forEach((c: any) => {
              if (c?.id) {
                next[c.id as string] = {
                  name: String(c.name || 'Categoria'),
                  type: (c.type as any) || 'expense'
                };
              }
            });
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentStatus = useCallback(async (transaction: Transaction) => {
    // Optimistic update imediato
    setTransactions(prev =>
      prev.map(t => t.id === transaction.id ? { ...t, is_paid: !t.is_paid } : t)
    );
    setUpdatingIds(prev => new Set(prev).add(transaction.id));

    try {
      const { error } = await supabase
        .from('user_transactions')
        .update({ is_paid: !transaction.is_paid })
        .eq('id', transaction.id);

      if (error) {
        // Reverter se houver erro
        setTransactions(prev =>
          prev.map(t => t.id === transaction.id ? { ...t, is_paid: transaction.is_paid } : t)
        );
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(transaction.id); return s; });
    }
  }, []);

  const getDayTransactions = (day: Date) =>
    transactions.filter(t => isSameDay(parseLocalISODate(t.date), day));

  /* ── Transações da data selecionada (deve vir antes dos totais) ── */
  const selectedTransactions = selectedDate ? getDayTransactions(selectedDate) : [];
  const pendingCount = selectedTransactions.filter(t => !t.is_paid).length;

  // Totais: usa dia selecionado se houver, senão o mês inteiro
  const summarySource  = selectedDate ? selectedTransactions : transactions;
  const summaryLabel   = selectedDate ? 'dia' : 'mês';
  const totalIncome    = summarySource.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense   = summarySource.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance        = totalIncome - totalExpense;

  const fmtBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(val));

  /* ── Renderizar cada célula do dia ── */
  const renderDay = (day: Date) => {
    const dayTxns      = getDayTransactions(day);
    const hasExpense   = dayTxns.some(t => t.type === 'expense');
    const hasIncome    = dayTxns.some(t => t.type === 'income');
    const isThisMonth  = isSameMonth(day, monthStart);
    const isTodayDay   = isToday(day);
    const isSelectedDay = selectedDate && isSameDay(day, selectedDate);

    const classes = [
      'calv-day',
      !isThisMonth   ? 'calv-day--outside'  : '',
      isTodayDay     ? 'calv-day--today'    : '',
      isSelectedDay  ? 'calv-day--selected' : '',
    ].filter(Boolean).join(' ');

    return (
      <div
        key={day.toISOString()}
        className={classes}
        onClick={() => isThisMonth && setSelectedDate(day)}
        role="button"
        tabIndex={isThisMonth ? 0 : -1}
        aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
        aria-pressed={!!isSelectedDay}
      >
        <span className="calv-day-num">{format(day, 'd')}</span>

        {/* Pontos indicadores */}
        <div className="calv-dots">
          {hasExpense && <div className="calv-dot calv-dot--expense" />}
          {hasIncome  && <div className="calv-dot calv-dot--income" />}
        </div>
      </div>
    );
  };

  /* (selectedTransactions e pendingCount declarados acima, antes dos totais) */

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="calv-root">

        {/* ── Cartão Calendário ── */}
        <div className="calv-card">

          {/* Header do mês */}
          <div className="calv-header">
            <button
              className="calv-nav-btn"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              aria-label="Mês anterior"
            >
              <IconChevronLeft />
            </button>

            <motion.span
              key={format(currentDate, 'MM-yyyy')}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="calv-month-title"
            >
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </motion.span>

            <button
              className="calv-nav-btn"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              aria-label="Próximo mês"
            >
              <IconChevronRight />
            </button>
          </div>

          {/* Labels dos dias da semana */}
          <div className="calv-weekdays">
            {WEEKDAY_LABELS.map(d => (
              <div key={d} className="calv-weekday-label">{d}</div>
            ))}
          </div>

          {/* Grade dos dias */}
          <div className="calv-grid">
            {loading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="calv-day"
                    style={{ padding: '4px' }}
                  >
                    <div className="calv-skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  </div>
                ))
              : calendarDays.map(renderDay)
            }
          </div>

          {/* Rodapé com totais do dia ou do mês */}
          <motion.div
            key={selectedDate ? selectedDate.toISOString() : 'month'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="calv-summary"
          >
            <div className="calv-summary-item">
              <span className="calv-summary-label">Receitas ({summaryLabel})</span>
              <span className="calv-summary-value calv-summary-value--income">
                R$ {fmtBRL(totalIncome)}
              </span>
            </div>
            <div className="calv-summary-item">
              <span className="calv-summary-label">Despesas ({summaryLabel})</span>
              <span className="calv-summary-value calv-summary-value--expense">
                R$ {fmtBRL(totalExpense)}
              </span>
            </div>
            <div className="calv-summary-item">
              <span className="calv-summary-label">Saldo ({summaryLabel})</span>
              <span
                className="calv-summary-value"
                style={{ color: balance >= 0 ? 'var(--mb-success)' : 'var(--mb-danger)' }}
              >
                {balance < 0 ? '-' : ''}R$ {fmtBRL(balance)}
              </span>
            </div>
          </motion.div>
        </div>

        {/* ── Painel de Transações da Data Selecionada ── */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.34, 1.1, 0.64, 1] }}
              className="calv-txn-panel"
            >
              {/* Cabeçalho da data */}
              <div className="calv-txn-header">
                <span className="calv-txn-date-label">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
                {selectedTransactions.length > 0 && (
                  <span className="calv-txn-count-badge">
                    {selectedTransactions.length} {selectedTransactions.length === 1 ? 'lançamento' : 'lançamentos'}
                    {pendingCount > 0 && ` · ${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`}
                  </span>
                )}
              </div>

              {/* Lista de transações */}
              <div className="calv-txn-list">
                {selectedTransactions.length === 0 ? (
                  <div className="calv-empty">
                    <IconCalendarEmpty />
                    <p className="calv-empty-text">
                      Nenhum lançamento para esta data.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {selectedTransactions.map((txn, i) => (
                      <motion.div
                        key={txn.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        className={[
                          'calv-txn-item',
                          txn.type === 'expense' ? 'calv-txn-item--expense' : 'calv-txn-item--income',
                          txn.is_paid ? 'calv-txn-item--paid' : ''
                        ].join(' ')}
                      >
                        {/* Ícone do tipo / categoria */}
                        <div className={`calv-txn-icon calv-txn-icon--${txn.type}`}>
                          {(() => {
                            const cat = txn.category_id ? catMap[txn.category_id] : null;
                            const catName = cat?.name || txn.description || 'Sem Categoria';
                            const iconUrl = getCategoryIconUrl(catName);
                            return (
                              <img
                                src={iconUrl}
                                alt={catName}
                                className="w-5 h-5 object-contain"
                              />
                            );
                          })()}
                        </div>

                        {/* Descrição e valor */}
                        <div className="calv-txn-body">
                          <span className="calv-txn-desc">
                            {txn.description || 'Sem descrição'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`calv-txn-amount calv-txn-amount--${txn.type}`}>
                              {txn.type === 'expense' ? '−' : '+'}R$ {fmtBRL(txn.amount)}
                            </span>
                            {txn.is_paid
                              ? <span className="calv-paid-tag">Pago</span>
                              : txn.type === 'expense'
                                ? <span className="calv-unpaid-tag">Pendente</span>
                                : null
                            }
                          </div>
                        </div>

                        {/* Botão marcar como pago */}
                        <motion.button
                          className={[
                            'calv-pay-btn',
                            txn.is_paid ? 'calv-pay-btn--paid' : 'calv-pay-btn--unpaid',
                            updatingIds.has(txn.id) ? 'calv-pay-btn--popping' : ''
                          ].join(' ')}
                          onClick={() => togglePaymentStatus(txn)}
                          whileTap={{ scale: 0.85 }}
                          aria-label={txn.is_paid ? 'Marcar como pendente' : 'Marcar como pago'}
                          title={txn.is_paid ? 'Marcar como pendente' : 'Marcar como pago'}
                          disabled={updatingIds.has(txn.id)}
                        >
                          <IconCheck />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default CalendarView;

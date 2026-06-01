import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, toLocalISO, toLocalISODateTime } from '../utils/date';
import { categories } from '../categories';
import Header from '../components/common/Header';

const getCategoryIconUrl = (name: string): string => {
  const n = name.toLowerCase();
  
  // Regras Específicas do Usuário (Money Balance)
  if (n.includes('educação') || n.includes('desenvolvimento') || n.includes('escola') || n.includes('curso') || n.includes('faculdade') || n.includes('estudo')) return 'https://cdn-icons-png.flaticon.com/512/4406/4406319.png';
  if (n.includes('imprevisto') || n.includes('urgência') || n.includes('emergência') || n.includes('conserto') || n.includes('reforma')) return 'https://cdn-icons-png.flaticon.com/512/3756/3756712.png';
  if (n.includes('rendimento') || n.includes('invest') || n.includes('economia') || n.includes('poupança') || n.includes('aplicação')) return 'https://cdn-icons-png.flaticon.com/512/10013/10013195.png';
  if (n.includes('dinheiro extra') || n.includes('extra') || n.includes('freela') || n.includes('bico')) return 'https://cdn-icons-png.flaticon.com/512/8283/8283617.png';
  if (n.includes('back')) return 'https://cdn-icons-png.flaticon.com/512/7182/7182410.png';
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

const primaryCats = [
  { name: 'Mercado', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2203/2203239.png' },
  { name: 'Refeição', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2424/2424721.png' },
  { name: 'Transporte', iconUrl: 'https://cdn-icons-png.flaticon.com/512/741/741407.png' },
  { name: 'Aluguel', iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619153.png' },
  { name: 'Lazer', iconUrl: 'https://cdn-icons-png.flaticon.com/512/3588/3588658.png' },
  { name: 'Saúde', iconUrl: 'https://cdn-icons-png.flaticon.com/512/1142/1142172.png' },
  { name: 'Compras', iconUrl: 'https://cdn-icons-png.flaticon.com/512/743/743007.png' },
];

const AddTransaction: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth());
  const [isRecurring, setIsRecurring] = useState(false);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(new Date());
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderPickerYear, setReminderPickerYear] = useState<number>(new Date().getFullYear());
  const [reminderPickerMonth, setReminderPickerMonth] = useState<number>(new Date().getMonth());
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [reminderPhone, setReminderPhone] = useState('');
  const [existingPhone, setExistingPhone] = useState<string | null>(null);

  // Rastreamento e Modais para Transações Recorrentes
  const [originalDescription, setOriginalDescription] = useState<string>('');
  const [originalCategoryName, setOriginalCategoryName] = useState<string>('');
  const [isOriginalRecurring, setIsOriginalRecurring] = useState(false);
  const [showCategoryConfirmModal, setShowCategoryConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Colors based on type
  const activeColor = type === 'expense' ? '#FF455F' : '#00D68F'; // Pink/Red for expense, Green for income
  const activeClass = type === 'expense' ? 'bg-[#FF455F]' : 'bg-[#00D68F]';
  const textClass = type === 'expense' ? 'text-[#FF455F]' : 'text-[#00D68F]';
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const displayDateLabel = useMemo(() => {
    const today = new Date();
    return isSameDay(selectedDate, today) ? 'Hoje' : selectedDate.toLocaleDateString('pt-BR');
  }, [selectedDate]);
  const monthGrid = useMemo(() => {
    const first = new Date(pickerYear, pickerMonth, 1);
    const startDowMonday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const arr: (number | null)[] = Array(startDowMonday).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    while (arr.length % 7 !== 0) arr.push(null);
    if (arr.length < 42) while (arr.length < 42) arr.push(null);
    return arr;
  }, [pickerYear, pickerMonth]);

  const reminderMonthGrid = useMemo(() => {
    const first = new Date(reminderPickerYear, reminderPickerMonth, 1);
    const startDowMonday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(reminderPickerYear, reminderPickerMonth + 1, 0).getDate();
    const arr: (number | null)[] = Array(startDowMonday).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    while (arr.length % 7 !== 0) arr.push(null);
    if (arr.length < 42) while (arr.length < 42) arr.push(null);
    return arr;
  }, [reminderPickerYear, reminderPickerMonth]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('edit');
    if (id) {
      setEditId(id);
      (async () => {
        const { data } = await supabase
          .from('user_transactions')
          .select('id, description, amount, type, date, is_paid, category_id, reminder_at, reminder_phone')
          .eq('id', id)
          .maybeSingle();
        if (data) {
          setType(data.type as any);
          const desc = data.description || '';
          setDescription(desc);
          setOriginalDescription(desc);
          setIsPaid(!!data.is_paid);
          setAmount(String(Number(data.amount)).replace('.', ','));
          if (typeof data.date === 'string' && data.date) {
            setSelectedDate(parseLocalISODate(data.date));
            setPickerYear(parseLocalISODate(data.date).getFullYear());
            setPickerMonth(parseLocalISODate(data.date).getMonth());
          }
          if (data.category_id) {
            const { data: cat } = await supabase
              .from('user_categories')
              .select('name')
              .eq('id', data.category_id)
              .maybeSingle();
            const catName = (cat as any)?.name || '';
            setCategoryName(catName);
            setOriginalCategoryName(catName);
          }

          // Verificar assincronamente se é uma transação recorrente
          (async () => {
            const { data: userData } = await supabase.auth.getUser();
            const user = userData?.user;
            if (user && desc) {
              const { data: occurrences } = await supabase
                .from('user_transactions')
                .select('id')
                .eq('user_id', user.id)
                .eq('description', desc);
              if (occurrences && occurrences.length > 1) {
                setIsOriginalRecurring(true);
              }
            }
          })();
          if ((data as any).reminder_at) {
            const rAt = new Date((data as any).reminder_at);
            setHasReminder(true);
            setReminderDate(rAt);
            setReminderTime(rAt.getHours().toString().padStart(2, '0') + ':' + rAt.getMinutes().toString().padStart(2, '0'));
            setReminderPickerYear(rAt.getFullYear());
            setReminderPickerMonth(rAt.getMonth());
            if ((data as any).reminder_phone) {
              const p = String((data as any).reminder_phone);
              const formatted = p.length === 13 ? `(${p.slice(2, 4)}) ${p.slice(4, 9)}-${p.slice(9)}` : p;
              setReminderPhone(formatted);
            }
          }
        }
      })();
    }
  }, [location.search]);

  const fetchUserCategories = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data } = await supabase
        .from('user_categories')
        .select('name')
        .eq('user_id', user.id)
        .eq('type', type)
        .order('name', { ascending: true });
      const names = Array.from(new Set((data || []).map((x: any) => String(x.name || '')).filter(Boolean)));
      setUserCategories(names);
    } catch (e) {
      console.error(e);
    }
  }, [type]);

  useEffect(() => {
    fetchUserCategories();
  }, [fetchUserCategories]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      // Fetch profile phone or check metadata
      let phoneToSet: string | null = null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('whatsapp')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.whatsapp && profile.whatsapp.trim() !== '') {
        phoneToSet = profile.whatsapp;
      } else if (user.user_metadata?.whatsapp) {
        phoneToSet = user.user_metadata.whatsapp;
      }

      if (phoneToSet) {
        const p = String(phoneToSet).replace(/\D/g, '');
        if (p.length >= 10) {
          setExistingPhone(p);
          const formatted = p.length === 11
            ? `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`
            : (p.length === 13 && p.startsWith('55'))
              ? `(${p.slice(2, 4)}) ${p.slice(4, 9)}-${p.slice(9)}`
              : (p.length === 10)
                ? `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`
                : p;
          setReminderPhone(formatted);
        }
      }
    })();
  }, []);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...categories, ...userCategories]));
  }, [userCategories]);

  // Função auxiliar assíncrona para salvar transação com lógica de recorrência
  const handleSave = async (updateAllCategories: boolean) => {
    setSaving(true);
    const normalized = amount
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .trim();
    const value = Number(normalized);
    if (!value || value <= 0) {
      setError('Informe um valor válido');
      setSaving(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setError('Faça login para salvar a transação');
      setSaving(false);
      return;
    }
    const dateStr = toLocalISO(selectedDate);
    const formattedPhone = reminderPhone ? '55' + reminderPhone.replace(/\D/g, '') : null;

    if (hasReminder && reminderPhone && !existingPhone) {
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          whatsapp: formattedPhone,
          username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'user'
        });
    }

    let reminderAt: string | null = null;
    if (hasReminder) {
      const [h, m] = reminderTime.split(':').map(Number);
      const rDate = new Date(reminderDate);
      rDate.setHours(h, m, 0, 0);
      reminderAt = toLocalISODateTime(rDate);
    }

    let categoryId: string | null = null;
    if (categoryName) {
      const { data: catData, error: catErr } = await supabase
        .from('user_categories')
        .upsert({ user_id: user.id, name: categoryName, type }, { onConflict: 'user_id,name' })
        .select('id')
        .maybeSingle();
      if (!catErr) categoryId = (catData as any)?.id ?? null;
    }

    let dbError = null as any;
    if (editId) {
      // Regra 3: se a transação for recorrente e mudou a descrição (nome), atualiza todas
      const descriptionChanged = description !== originalDescription;
      if (isOriginalRecurring && descriptionChanged && originalDescription) {
        const { error: renameError } = await supabase
          .from('user_transactions')
          .update({ description: description || null })
          .eq('user_id', user.id)
          .eq('description', originalDescription);
        if (renameError) dbError = renameError;
      }

      if (!dbError) {
        const { error: updateError } = await supabase
          .from('user_transactions')
          .update({
            amount: value,
            type,
            description: description || null,
            date: dateStr,
            is_paid: isPaid,
            category_id: categoryId,
            reminder_at: reminderAt,
            reminder_phone: hasReminder ? (formattedPhone || existingPhone) : null
          })
          .eq('id', editId);
        dbError = updateError;
      }

      // Regra 1: se o usuário escolheu atualizar em massa a categoria
      if (!dbError && updateAllCategories && originalDescription) {
        const targetDesc = descriptionChanged ? description : originalDescription;
        const { error: bulkError } = await supabase
          .from('user_transactions')
          .update({ category_id: categoryId })
          .eq('user_id', user.id)
          .eq('description', targetDesc);
        if (bulkError) dbError = bulkError;
      }
    } else {
      const { error: insertError } = await supabase
        .from('user_transactions')
        .insert({
          user_id: user.id,
          amount: value,
          type,
          description: description || null,
          date: dateStr,
          is_paid: isPaid,
          category_id: categoryId,
          reminder_at: reminderAt,
          reminder_phone: hasReminder ? (formattedPhone || existingPhone) : null
        });
      dbError = insertError;

      if (!dbError && isRecurring) {
        const baseDay = selectedDate.getDate();
        const start = new Date(selectedDate);
        start.setMonth(start.getMonth() + 1);
        const recurringEndYear = 2026;
        const rows: any[] = [];
        for (let yr = start.getFullYear(); yr <= recurringEndYear; yr++) {
          const monthStart = yr === start.getFullYear() ? start.getMonth() : 0;
          for (let m = monthStart; m < 12; m++) {
            const daysInMonth = new Date(yr, m + 1, 0).getDate();
            const day = Math.min(baseDay, daysInMonth);
            const d = new Date(yr, m, day);
            rows.push({
              user_id: user.id,
              amount: value,
              type,
              description: description || null,
              date: toLocalISO(d),
              is_paid: false,
              category_id: categoryId,
              reminder_at: reminderAt,
              reminder_phone: hasReminder && reminderPhone ? '55' + reminderPhone.replace(/\D/g, '') : null
            });
          }
        }
        if (rows.length) {
          const { error: recErr } = await supabase
            .from('user_transactions')
            .insert(rows);
          if (recErr) dbError = recErr;
        }
      }
    }

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    navigate(-1);
  };

  // Função auxiliar assíncrona para deletar transação
  const handleDelete = async (deleteAllRecurring: boolean) => {
    if (!editId) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setError('Faça login para excluir a transação');
      setSaving(false);
      return;
    }

    let delError = null;
    if (deleteAllRecurring && originalDescription) {
      // Regra 2: Deleta todas as transações correspondentes ao mesmo nome
      const { error } = await supabase
        .from('user_transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('description', originalDescription);
      delError = error;
    } else {
      const { error } = await supabase
        .from('user_transactions')
        .delete()
        .eq('id', editId);
      delError = error;
    }

    setSaving(false);
    if (delError) {
      setError(delError.message);
      return;
    }
    navigate(-1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="add-tx-container fixed inset-0 z-40 overflow-y-auto"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap');

        .add-tx-container, .add-tx-container * {
          font-family: var(--mb-font-body);
        }
        input:focus, button:focus, textarea:focus, select:focus,
        input:active, button:active {
          outline: none !important;
          box-shadow: none !important;
        }
        .add-tx-container {
          background: var(--mb-bg);
          color: var(--mb-fg);
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .add-content-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding-bottom: 140px;
        }
        .add-header {
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: var(--mb-surface);
          border-bottom: 1px solid var(--mb-border);
          height: 60px;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .add-cancel-btn {
          position: absolute;
          left: 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          color: var(--mb-accent);
          transition: opacity 0.2s;
        }
        .add-cancel-btn:hover { opacity: 0.75; }
        .add-header h1 {
          font-size: 17px;
          font-weight: 700;
          color: var(--mb-fg);
          letter-spacing: -0.2px;
        }
        .add-toggle-wrap { display: flex; justify-content: center; padding: 16px 0 20px; }
        .add-toggle {
          background: var(--mb-surface-2);
          border-radius: var(--mb-radius-md);
          padding: 4px;
          display: flex;
          gap: 2px;
          border: 1px solid var(--mb-border);
        }
        .add-toggle-btn {
          padding: 8px 28px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          background: transparent;
          color: var(--mb-muted);
          transition: all 0.2s ease;
        }
        .add-toggle-btn.active {
          background: var(--mb-surface);
          color: var(--mb-fg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .add-toggle-btn.active.expense {
          background: var(--mb-danger);
          color: #ffffff;
          box-shadow: 0 4px 12px color-mix(in oklab, var(--mb-danger), transparent 70%);
        }
        .add-toggle-btn.active.income {
          background: var(--mb-success);
          color: #ffffff;
          box-shadow: 0 4px 12px color-mix(in oklab, var(--mb-success), transparent 70%);
        }
        .add-amount-block {
          padding: 20px 20px 0;
          text-align: center;
        }
        .add-amount-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--mb-muted);
          margin-bottom: 8px;
        }
        .add-amount-display {
          font-family: var(--mb-font-display) !important;
          font-size: 48px;
          font-weight: 400;
          letter-spacing: -0.03em;
          color: var(--mb-fg);
          line-height: 1.1;
        }
        .add-section {
          margin: 14px 16px 0;
          background: var(--mb-surface);
          border-radius: var(--mb-radius-lg);
          border: 1px solid var(--mb-border);
          box-shadow: var(--mb-shadow-card);
          overflow: hidden;
        }
        .add-row {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          gap: 12px;
          border-bottom: 1px solid var(--mb-border-2);
          min-height: 52px;
        }
        .add-row:last-child { border-bottom: none; }
        .add-row-icon { width: 20px; height: 20px; color: var(--mb-muted); flex-shrink: 0; }
        .add-row-label { font-size: 15px; font-weight: 500; color: var(--mb-fg); flex: 1; }
        .add-row-value { font-size: 15px; font-weight: 400; color: var(--mb-muted); }
        .add-row-chevron { color: var(--mb-muted-2); }
        .add-section-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--mb-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 14px 16px 0;
          margin: 0 0 -2px;
        }
        .add-cat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 14px 16px;
        }
        .add-cat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: transform 0.15s ease;
          padding: 4px;
          border-radius: var(--mb-radius-md);
        }
        .add-cat-item:active { transform: scale(0.93); }
        .add-cat-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--mb-surface-2);
          border: 1.5px solid var(--mb-border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: border-color 0.15s, background 0.15s;
        }
        .add-cat-icon-wrap.selected {
          border-color: var(--mb-accent);
          background: color-mix(in oklab, var(--mb-accent), transparent 88%);
        }
        .add-cat-icon-wrap img { width: 32px; height: 32px; object-fit: contain; }
        .add-cat-name {
          font-size: 11px;
          font-weight: 500;
          color: var(--mb-muted);
          text-align: center;
          max-width: 72px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .add-cat-name.selected { color: var(--mb-accent); }
        .add-more-dots { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 2px; }
        .add-dot { width: 10px; height: 10px; border-radius: 3px; background: var(--mb-muted-2); }
        .add-dot.accent { background: var(--mb-accent); }
        .add-save-wrap { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .add-save-btn {
          padding: 16px;
          border-radius: var(--mb-radius-md);
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          letter-spacing: -0.01em;
        }
        .add-save-btn:active { transform: scale(0.98); opacity: 0.9; }
        .add-save-btn.expense { background: var(--mb-danger); }
        .add-save-btn.income  { background: var(--mb-success); }
        .add-delete-btn {
          padding: 14px;
          border-radius: var(--mb-radius-md);
          font-size: 15px;
          font-weight: 600;
          color: var(--mb-danger);
          border: 1.5px solid color-mix(in oklab, var(--mb-danger), transparent 70%);
          background: color-mix(in oklab, var(--mb-danger), transparent 92%);
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-delete-btn:active { opacity: 0.8; }
        .add-toggle-switch {
          width: 44px; height: 26px; border-radius: 13px;
          background: var(--mb-border); position: relative;
          cursor: pointer; transition: background 0.2s; flex-shrink: 0;
        }
        .add-toggle-switch.on { background: var(--mb-accent); }
        .add-toggle-switch::after {
          content: ''; position: absolute; top: 3px; left: 3px;
          width: 20px; height: 20px; border-radius: 50%; background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2); transition: transform 0.2s;
        }
        .add-toggle-switch.on::after { transform: translateX(18px); }
        .add-date-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 20px;
          background: var(--mb-surface-2); border: 1px solid var(--mb-border);
          font-size: 13px; font-weight: 500; color: var(--mb-muted); cursor: pointer;
        }
        .cal-popup {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: flex-end; justify-content: center;
        }
        .cal-sheet {
          background: var(--mb-surface); border-radius: 22px 22px 0 0;
          padding: 20px; width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto;
        }
        .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .cal-nav-btn { background: none; border: none; cursor: pointer; color: var(--mb-fg); padding: 6px; border-radius: 8px; transition: background 0.15s; }
        .cal-nav-btn:hover { background: var(--mb-surface-2); }
        .cal-month-label { font-size: 16px; font-weight: 700; color: var(--mb-fg); }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .cal-day-header { font-size: 11px; font-weight: 600; color: var(--mb-muted); text-align: center; padding: 4px 0; }
        .cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 400; color: var(--mb-fg); border-radius: 50%; cursor: pointer; transition: background 0.15s; }
        .cal-day:hover { background: var(--mb-surface-2); }
        .cal-day.selected { background: var(--mb-accent); color: #fff; font-weight: 700; }
        .cal-day.today { border: 1.5px solid var(--mb-accent); }
        .cal-day.empty { pointer-events: none; }
        .add-error {
          margin: 10px 16px 0;
          padding: 12px 16px;
          background: color-mix(in oklab, var(--mb-danger), transparent 88%);
          border: 1px solid color-mix(in oklab, var(--mb-danger), transparent 70%);
          border-radius: var(--mb-radius-md);
          font-size: 14px; color: var(--mb-danger); font-weight: 500;
        }
        .add-input {
          width: 100%; background: transparent; border: none; outline: none;
          font-size: 15px; font-weight: 400; color: var(--mb-fg);
          font-family: var(--mb-font-body); flex: 1;
        }
        .add-input::placeholder { color: var(--mb-muted-2); }

        /* Estilização Premium para Elementos Superiores e Toggles */
        .add-amount-wrap {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 6px;
          margin: 10px 16px;
          padding: 16px;
          background: var(--mb-surface-2);
          border-radius: var(--mb-radius-lg);
          border: 1px solid var(--mb-border);
        }
        .add-amount-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 10px 16px;
          padding: 20px 16px;
          background: var(--mb-surface-2);
          border-radius: var(--mb-radius-lg);
          border: 1px solid var(--mb-border);
          overflow: hidden;
        }
        .add-currency-sign {
          font-family: 'Luckiest Guy', cursive !important;
          font-size: 32px;
          transition: color 0.2s ease;
        }
        .add-currency-sign.expense {
          color: var(--mb-danger);
        }
        .add-currency-sign.income {
          color: var(--mb-success);
        }
        .add-amount-input {
          font-family: 'Luckiest Guy', cursive !important;
          font-size: 56px;
          background: transparent;
          border: none;
          outline: none;
          text-align: left;
          width: 100%;
          max-width: 250px;
          letter-spacing: 0.03em;
          transition: color 0.2s ease;
          padding: 0;
          line-height: 1.1;
        }
        .add-amount-input.expense {
          color: var(--mb-danger);
        }
        .add-amount-input.income {
          color: var(--mb-success);
        }
        .add-amount-input::placeholder {
          color: var(--mb-muted-2);
        }
        .add-description-wrap {
          margin: 0 16px 14px;
          background: var(--mb-surface);
          border-radius: var(--mb-radius-lg);
          border: 1px solid var(--mb-border);
          box-shadow: var(--mb-shadow-card);
          padding: 4px 16px;
        }
        .add-description-input {
          width: 100%;
          height: 48px;
          background: transparent;
          border: none;
          outline: none;
          font-size: 15px;
          font-weight: 500;
          color: var(--mb-fg);
          font-family: var(--mb-font-body);
        }
        .add-description-input::placeholder {
          color: var(--mb-muted-2);
        }
        .add-cards-list {
          margin: 0 16px 14px;
          background: var(--mb-surface);
          border-radius: var(--mb-radius-lg);
          border: 1px solid var(--mb-border);
          box-shadow: var(--mb-shadow-card);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .add-card-row {
          display: flex;
          align-items: center;
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          padding: 15px 16px;
          gap: 12px;
          border-bottom: 1px solid var(--mb-border-2);
          cursor: pointer;
          transition: background 0.15s;
          box-sizing: border-box;
        }
        .add-card-row:last-child {
          border-bottom: none;
        }
        .add-card-row:hover {
          background: var(--mb-surface-2);
        }
        .add-card-icon {
          font-size: 18px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
        }
        .add-card-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--mb-fg);
          flex: 1;
        }
        .add-card-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--mb-muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .add-card-value svg {
          width: 16px;
          height: 16px;
          color: var(--mb-muted-2);
          transition: transform 0.2s;
        }
        .add-switch {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: var(--mb-border);
          position: relative;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.1s;
          border: none;
          flex-shrink: 0;
          padding: 0;
        }
        .add-switch.active {
          background: var(--mb-accent);
        }
        .add-switch-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .add-switch.active .add-switch-thumb {
          transform: translateX(20px);
        }
        .add-subcard-wrap {
          background: var(--mb-surface-2);
          border-top: 1px solid var(--mb-border-2);
          border-bottom: 1px solid var(--mb-border-2);
        }
        .add-subcard-wrap:last-child {
          border-bottom: none;
        }
        .add-subcard-wrap .add-card-row {
          border-bottom: 1px solid var(--mb-border-2);
        }
        .add-subcard-wrap .add-card-row:last-child {
          border-bottom: none;
        }
        .add-subcard-input {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          gap: 12px;
          border-bottom: 1px solid var(--mb-border-2);
        }
        .add-subcard-input:last-child {
          border-bottom: none;
        }
        .add-subcard-input-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--mb-muted);
          width: 80px;
        }
        .add-subcard-input-field {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          color: var(--mb-fg);
          font-family: var(--mb-font-body);
        }
        .add-subcard-input-field::placeholder {
          color: var(--mb-muted-2);
        }
        .add-cat-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--mb-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 20px 16px 8px;
        }
      ` }} />

      {/* Cabeçalho */}
      <div className="add-header">
        <button onClick={() => navigate(-1)} className="add-cancel-btn">
          Cancelar
        </button>
        <h1>{editId ? 'Editar Transação' : 'Nova Transação'}</h1>
      </div>

      <div className="add-content-scroll">

      {/* Toggle Despesa / Receita */}
      <div className="add-toggle-wrap">
        <div className="add-toggle">
          <button
            onClick={() => setType('expense')}
            className={`add-toggle-btn ${type === 'expense' ? 'active expense' : ''}`}
          >
            Despesa
          </button>
          <button
            onClick={() => setType('income')}
            className={`add-toggle-btn ${type === 'income' ? 'active income' : ''}`}
          >
            Receita
          </button>
        </div>
      </div>

      {/* Valor */}
      <div className="add-amount-wrap">
        <span className={`add-currency-sign ${type === 'expense' ? 'expense' : 'income'}`}>R$</span>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            if (!digits) {
              setAmount('');
              return;
            }
            const value = Number(digits) / 100;
            setAmount(value.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }));
          }}
          placeholder="0,00"
          autoFocus
          className={`add-amount-input ${type === 'expense' ? 'expense' : 'income'}`}
        />
      </div>

      {/* Descrição */}
      <div className="add-description-wrap">
        <input
          type="text"
          placeholder="Compras de Ano Novo para a família"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="add-description-input"
        />
      </div>

      {/* Data e Toggles em Cartões */}
      <div className="add-cards-list">
        {/* Cartão de Data */}
        <button
          onClick={() => setShowDatePicker(v => !v)}
          className="add-card-row"
        >
          <span className="add-card-icon">📅</span>
          <span className="add-card-label">Data</span>
          <span className="add-card-value">
            {displayDateLabel}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </button>

        {/* Calendário Acordeão */}
        <AnimatePresence>
          {showDatePicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="w-full rounded-2xl bg-white dark:bg-[#171c30] border border-gray-200 dark:border-white/5 p-4 shadow-md select-none">
                <div className="flex items-center justify-between mb-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const m = pickerMonth - 1; const y = pickerYear + (m < 0 ? -1 : 0);
                      setPickerYear(y); setPickerMonth((m + 12) % 12);
                    }}
                    className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-all border-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </motion.button>
                  <span className="text-gray-900 dark:text-white font-bold text-sm uppercase tracking-wider">{monthNames[pickerMonth]} {pickerYear}</span>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const m = pickerMonth + 1; const y = pickerYear + (m > 11 ? 1 : 0);
                      setPickerYear(y); setPickerMonth(m % 12);
                    }}
                    className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-all border-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </motion.button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-400 font-bold mb-2 uppercase text-center">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.map((d, i) => {
                    if (!d) return <div key={i} className="h-9" />;
                    const curr = new Date(pickerYear, pickerMonth, d);
                    const isSel = isSameDay(curr, selectedDate);
                    const isToday = isSameDay(curr, new Date());
                    return (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        key={i}
                        onClick={() => { setSelectedDate(curr); setShowDatePicker(false); }}
                        className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all border-none cursor-pointer ${isSel ? 'bg-[#3b5bdb] text-white shadow-lg shadow-[#3b5bdb]/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 bg-transparent'} ${isToday && !isSel ? 'text-[#3b5bdb] dark:text-[#5c7cfa] ring-1 ring-[#3b5bdb]/50' : ''}`}
                      >
                        {String(d)}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cartão de Pago */}
        <div className="add-card-row" onClick={() => setIsPaid(!isPaid)}>
          <span className="add-card-icon">💰</span>
          <span className="add-card-label">Esta transação já foi paga?</span>
          <button
            onClick={(e) => { e.stopPropagation(); setIsPaid(!isPaid); }}
            className={`add-switch ${isPaid ? 'active' : ''}`}
          >
            <div className="add-switch-thumb"></div>
          </button>
        </div>

        {/* Cartão de Recorrente */}
        <div className="add-card-row" onClick={() => setIsRecurring(!isRecurring)}>
          <span className="add-card-icon">🔄</span>
          <span className="add-card-label">Repetir mensalmente?</span>
          <button
            onClick={(e) => { e.stopPropagation(); setIsRecurring(!isRecurring); }}
            className={`add-switch ${isRecurring ? 'active' : ''}`}
          >
            <div className="add-switch-thumb"></div>
          </button>
        </div>

        {/* Cartão de Lembrete WhatsApp */}
        <div className="add-card-row" onClick={() => setHasReminder(!hasReminder)}>
          <span className="add-card-icon">🔔</span>
          <span className="add-card-label">Enviar lembrete no WhatsApp?</span>
          <button
            onClick={(e) => { e.stopPropagation(); setHasReminder(!hasReminder); }}
            className={`add-switch ${hasReminder ? 'active' : ''}`}
          >
            <div className="add-switch-thumb"></div>
          </button>
        </div>

        {/* Sub-cards quando Lembrete estiver ativo */}
        <AnimatePresence>
          {hasReminder && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden add-subcard-wrap"
            >
              {/* Data do Lembrete */}
              <button
                onClick={() => setShowReminderDatePicker(v => !v)}
                className="add-card-row"
              >
                <span className="add-card-icon">📅</span>
                <span className="add-card-label">Data do Lembrete</span>
                <span className="add-card-value">
                  {isSameDay(reminderDate, new Date()) ? 'Hoje' : reminderDate.toLocaleDateString('pt-BR')}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
              </button>

              {/* Calendário do Lembrete Acordeão */}
              <AnimatePresence>
                {showReminderDatePicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="w-full rounded-2xl bg-white dark:bg-[#171c30] border border-gray-200 dark:border-white/5 p-4 shadow-md select-none">
                      <div className="flex items-center justify-between mb-4">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const m = reminderPickerMonth - 1; const y = reminderPickerYear + (m < 0 ? -1 : 0);
                            setReminderPickerYear(y); setReminderPickerMonth((m + 12) % 12);
                          }}
                          className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-all border-none cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </motion.button>
                        <span className="text-gray-900 dark:text-white font-bold text-sm uppercase tracking-wider">{monthNames[reminderPickerMonth]} {reminderPickerYear}</span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const m = reminderPickerMonth + 1; const y = reminderPickerYear + (m > 11 ? 1 : 0);
                            setReminderPickerYear(y); setReminderPickerMonth(m % 12);
                          }}
                          className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-all border-none cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </motion.button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-400 font-bold mb-2 uppercase text-center">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                          <div key={d}>{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {reminderMonthGrid.map((d, i) => {
                          if (!d) return <div key={i} className="h-9" />;
                          const curr = new Date(reminderPickerYear, reminderPickerMonth, d);
                          const isSel = isSameDay(curr, reminderDate);
                          const isToday = isSameDay(curr, new Date());
                          return (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              key={i}
                              onClick={() => { setReminderDate(curr); setShowReminderDatePicker(false); }}
                              className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all border-none cursor-pointer ${isSel ? 'bg-[#3b5bdb] text-white shadow-lg shadow-[#3b5bdb]/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 bg-transparent'} ${isToday && !isSel ? 'text-[#3b5bdb] dark:text-[#5c7cfa] ring-1 ring-[#3b5bdb]/50' : ''}`}
                            >
                              {String(d)}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hora do Lembrete */}
              <div className="add-card-row relative">
                <span className="add-card-icon">⏰</span>
                <span className="add-card-label">Hora do Lembrete</span>
                <span className="add-card-value">
                  {reminderTime}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              {/* Input de Telefone WhatsApp */}
              {!existingPhone && (
                <div className="add-subcard-input">
                  <span className="add-subcard-input-label">WhatsApp</span>
                  <input
                    type="text"
                    inputMode="tel"
                    value={reminderPhone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 11);
                      if (val.length <= 2) val = val.length > 0 ? `(${val}` : '';
                      else if (val.length <= 7) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                      else val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                      setReminderPhone(val);
                    }}
                    placeholder="(71) 99908-8651"
                    className="add-subcard-input-field"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Seção Categorias */}
      <div className="add-cat-label">Selecionar Categoria</div>

      <div className="add-cat-grid">
        {primaryCats.map((cat) => {
          const isSelected = categoryName === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => {
                setCategoryName(cat.name);
                setShowCategoryPicker(false);
              }}
              className="add-cat-item"
            >
              <div className={`add-cat-icon-wrap ${isSelected ? 'selected' : ''}`}>
                <img src={cat.iconUrl} alt={cat.name} className="w-8 h-8 object-contain" />
              </div>
              <span className="add-cat-name">{cat.name}</span>
            </button>
          );
        })}

        {/* Oitavo botão "Mais" */}
        {(() => {
          const isPrimarySelected = primaryCats.some(c => c.name === categoryName);
          const hasCustomSelected = categoryName !== '' && !isPrimarySelected;
          return (
            <button
              onClick={() => {
                setShowCategoryPicker(prev => {
                  const next = !prev;
                  if (next) {
                    fetchUserCategories();
                  }
                  return next;
                });
              }}
              className="add-cat-item"
            >
              <div className={`add-cat-icon-wrap ${hasCustomSelected ? 'selected' : ''}`}>
                {hasCustomSelected ? (
                  <img src={getCategoryIconUrl(categoryName)} alt={categoryName} className="w-8 h-8 object-contain" />
                ) : (
                  <div className="add-more-dots">
                    <div className="add-dot accent"></div>
                    <div className="add-dot accent"></div>
                    <div className="add-dot"></div>
                    <div className="add-dot"></div>
                  </div>
                )}
              </div>
              <span className="add-cat-name">
                {hasCustomSelected ? categoryName : 'Mais'}
              </span>
            </button>
          );
        })()}
      </div>

      {/* Gaveta de Categorias Extras */}
      <AnimatePresence>
        {showCategoryPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="px-4 mb-6"
          >
            <div className="grid grid-cols-2 gap-2 p-3 bg-white dark:bg-[#171c30] border border-gray-200 dark:border-white/5 rounded-2xl shadow-md">
              {allCategories.map((c) => {
                const isSel = categoryName === c;
                return (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    key={c}
                    onClick={() => {
                      setCategoryName(c);
                      setShowCategoryPicker(false);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold uppercase border transition-all text-center flex items-center justify-center gap-2 ${
                      isSel
                        ? 'border-[#3b5bdb]/50 dark:border-[#5c7cfa]/50 bg-[#3b5bdb]/10 dark:bg-[#5c7cfa]/10 text-[#3b5bdb] dark:text-[#5c7cfa]'
                        : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <img src={getCategoryIconUrl(c)} alt={c} className="w-5 h-5 object-contain" />
                    <span>{c}</span>
                  </motion.button>
                );
              })}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setNewCategoryError(null);
                  setNewCategoryName('');
                  setShowNewCategoryModal(true);
                }}
                className="px-3 py-2.5 rounded-xl text-xs font-bold uppercase border border-[#3b5bdb] dark:border-[#5c7cfa] bg-transparent text-[#3b5bdb] dark:text-[#5c7cfa] hover:bg-[#3b5bdb]/5 dark:hover:bg-[#5c7cfa]/5 text-center"
              >
                + Criar Nova
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Criação de Categoria */}
      <AnimatePresence>
        {showNewCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewCategoryModal(false)}>
            <div className="w-80 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-white/40 dark:border-white/10 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-gray-900 dark:text-white font-bold text-lg mb-4">Nova Categoria</h2>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome da categoria"
                className="w-full h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#3b5bdb] dark:focus:border-[#5c7cfa] mb-2"
              />
              {newCategoryError && (
                <div className="text-[#ff455f] font-bold text-xs mb-4">{newCategoryError}</div>
              )}
              <div className="flex gap-3 mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNewCategoryModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all border-none cursor-pointer"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    if (creatingCategory) return;
                    setNewCategoryError(null);
                    const name = String(newCategoryName || '').trim();
                    if (!name) {
                      setNewCategoryError('Informe um nome válido');
                      return;
                    }
                    const exists = allCategories.some(c => String(c).toLowerCase() === name.toLowerCase());
                    if (exists) {
                      setNewCategoryError('Categoria já existe');
                      return;
                    }
                    setCreatingCategory(true);
                    const { data: userData } = await supabase.auth.getUser();
                    const user = userData?.user;
                    if (!user) {
                      setNewCategoryError('Faça login para criar categoria');
                      setCreatingCategory(false);
                      return;
                    }
                    const { error: catErr } = await supabase
                      .from('user_categories')
                      .upsert({ user_id: user.id, name, type }, { onConflict: 'user_id,name' });
                    setCreatingCategory(false);
                    if (catErr) {
                      setNewCategoryError('Erro ao criar categoria');
                      return;
                    }
                    setUserCategories(prev => Array.from(new Set([...prev, name])));
                    setCategoryName(name);
                    setShowNewCategoryModal(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-[#3b5bdb] text-white shadow-lg shadow-[#3b5bdb]/20 hover:bg-[#3b5bdb]/90 transition-all border-none cursor-pointer"
                >
                  Criar
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1"></div>

      {/* Botão Salvar e Excluir */}
      <div className="add-save-wrap">
        <button
          onClick={async () => {
            if (saving) return;
            setError(null);
            
            // Regra 1: se for transação recorrente e mudou de categoria, exibe modal de confirmação
            if (editId && isOriginalRecurring && categoryName !== originalCategoryName) {
              setShowCategoryConfirmModal(true);
              return;
            }

            await handleSave(false);
          }}
          disabled={saving}
          className={`add-save-btn ${type === 'expense' ? 'expense' : 'income'}`}
        >
          {saving ? 'Salvando...' : (editId ? 'Salvar' : 'Salvar')}
        </button>

        {editId && (
          <button
            onClick={async () => {
              if (!editId) return;
              // Regra 2: se for transação recorrente, exibe modal de exclusão
              if (isOriginalRecurring) {
                setShowDeleteConfirmModal(true);
              } else {
                await handleDelete(false);
              }
            }}
            disabled={saving}
            className="add-delete-btn"
          >
            Excluir Transação
          </button>
        )}

        {error && (
          <p className="mt-2 text-[#ff455f] text-xs text-center font-medium bg-[#ff455f]/10 p-2 rounded-lg border border-[#ff455f]/20">
            {error}
          </p>
        )}
      </div>

      {/* Indicador Home do iOS */}
      <div className="add-home-indicator">
        <div className="add-home-bar"></div>
      </div>

      </div>

      {/* Modais de Confirmação Premium */}
      <AnimatePresence>
        {/* Modal de Categoria (Regra 1) */}
        {showCategoryConfirmModal && (
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
              <div className="w-12 h-12 rounded-full bg-[#3b5bdb]/15 flex items-center justify-center mx-auto text-[#3b5bdb]">
                <span className="material-symbols-outlined text-2xl">category</span>
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Atualizar Categorias</h4>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                Você alterou a categoria desta transação. Deseja aplicar essa nova categoria a todas as outras transações com o nome <span className="text-gray-900 dark:text-white font-extrabold">"{originalDescription}"</span>?
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    setShowCategoryConfirmModal(false);
                    await handleSave(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#3b5bdb] text-white font-black text-xs uppercase shadow-md shadow-[#3b5bdb]/20 transition-all border-none cursor-pointer"
                >
                  Mudar todas as transações
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    setShowCategoryConfirmModal(false);
                    await handleSave(false);
                  }}
                  className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black text-xs uppercase hover:bg-gray-200 dark:hover:bg-white/10 transition-all border-none cursor-pointer"
                >
                  Mudar apenas esta
                </motion.button>
                <button
                  onClick={() => setShowCategoryConfirmModal(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-1 transition-colors outline-none bg-transparent border-none cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Exclusão (Regra 2) */}
        {showDeleteConfirmModal && (
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
              <div className="w-12 h-12 rounded-full bg-[#ff455f]/15 flex items-center justify-center mx-auto text-[#ff455f]">
                <span className="material-symbols-outlined text-2xl">delete</span>
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Excluir Recorrência</h4>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                Esta é uma transação recorrente. Deseja excluir apenas esta ocorrência específica ou remover todas as recorrências com o nome <span className="text-gray-900 dark:text-white font-extrabold">"{originalDescription}"</span>?
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    setShowDeleteConfirmModal(false);
                    await handleDelete(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#ff455f] text-white font-black text-xs uppercase shadow-md shadow-[#ff455f]/20 transition-all border-none cursor-pointer"
                >
                  Excluir todas as recorrências
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    setShowDeleteConfirmModal(false);
                    await handleDelete(false);
                  }}
                  className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black text-xs uppercase hover:bg-[#ff455f]/10 dark:hover:bg-[#ff455f]/20 transition-all border-none cursor-pointer text-[#ff455f]"
                >
                  Excluir apenas esta
                </motion.button>
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-1 transition-colors outline-none bg-transparent border-none cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AddTransaction;

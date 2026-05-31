import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, toLocalISO, toLocalISODateTime } from '../utils/date';
import { categories } from '../categories';
import Header from '../components/common/Header';

const getCategoryEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('mercado') || n.includes('cesta')) return '🧺';
  if (n.includes('refeição') || n.includes('alimentação') || n.includes('comer') || n.includes('restaurante')) return '🍽️';
  if (n.includes('transporte') || n.includes('ônibus') || n.includes('bus') || n.includes('carro') || n.includes('uber')) return '🚌';
  if (n.includes('aluguel') || n.includes('moradia') || n.includes('casa') || n.includes('apartamento')) return '🏠';
  if (n.includes('lazer') || n.includes('social') || n.includes('cinema') || n.includes('filme') || n.includes('pipoca') || n.includes('show')) return '🍿';
  if (n.includes('saúde') || n.includes('médico') || n.includes('remédio') || n.includes('farmácia') || n.includes('hospital')) return '🧰';
  if (n.includes('compras') || n.includes('shopping') || n.includes('loja') || n.includes('vestuário')) return '🛍️';
  if (n.includes('salário') || n.includes('pagamento')) return '💰';
  if (n.includes('rendimento') || n.includes('invest') || n.includes('economia')) return '📈';
  if (n.includes('extra') || n.includes('bônus')) return '💵';
  return '🏷️';
};

const primaryCats = [
  { name: 'Mercado', emoji: '🧺' },
  { name: 'Refeição', emoji: '🍽️' },
  { name: 'Transporte', emoji: '🚌' },
  { name: 'Aluguel', emoji: '🏠' },
  { name: 'Lazer', emoji: '🍿' },
  { name: 'Saúde', emoji: '🧰' },
  { name: 'Compras', emoji: '🛍️' },
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

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data } = await supabase
        .from('user_categories')
        .select('name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      const names = Array.from(new Set((data || []).map((x: any) => String(x.name || '')).filter(Boolean)));
      setUserCategories(names);

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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

        input:focus, button:focus, textarea:focus, select:focus, input:active, button:active {
          outline: none !important;
          box-shadow: none !important;
        }

        .add-tx-container {
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #eef0f7;
          color: #111;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .dark .add-tx-container {
          background: #0b0e17;
          color: #fff;
        }
        .add-content-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding-bottom: 140px;
        }

        /* Header */
        .add-header {
          padding: 20px 20px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: #eef0f7;
        }
        .dark .add-header {
          background: #0b0e17;
        }
        .add-cancel-btn {
          position: absolute;
          left: 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          color: #3b5bdb;
          font-family: 'Poppins', sans-serif;
          transition: opacity 0.2s;
        }
        .add-cancel-btn:hover {
          opacity: 0.8;
        }
        .dark .add-cancel-btn {
          color: #5c7cfa;
        }
        .add-header h1 {
          font-size: 17px;
          font-weight: 700;
          color: #111;
          letter-spacing: -0.2px;
          font-family: 'Poppins', sans-serif;
        }
        .dark .add-header h1 {
          color: #fff;
        }

        /* Toggle */
        .add-toggle-wrap {
          display: flex;
          justify-content: center;
          padding: 4px 0 20px;
        }
        .add-toggle {
          background: #dde0ec;
          border-radius: 14px;
          padding: 4px;
          display: flex;
          gap: 2px;
        }
        .dark .add-toggle {
          background: #1e243b;
        }
        .add-toggle-btn {
          padding: 8px 28px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          background: transparent;
          color: #7d859a;
          transition: all 0.2s;
          font-family: 'Poppins', sans-serif;
        }
        .dark .add-toggle-btn {
          color: #a1b3d6;
        }
        .add-toggle-btn.active {
          background: #fff;
          color: #111;
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
        }
        .dark .add-toggle-btn.active {
          background: #2e3756;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.20);
        }

        /* Amount Input */
        .add-amount-wrap {
          padding: 10px 28px 4px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 4px;
        }
        .add-currency-sign {
          font-size: 28px;
          font-weight: 700;
          color: #1a2366;
          margin-top: 14px;
          line-height: 1;
        }
        .dark .add-currency-sign {
          color: #9db0ff;
        }
        .add-amount-input {
          font-size: 64px;
          font-weight: 800;
          color: #1a2366;
          letter-spacing: -2px;
          line-height: 1;
          background: transparent;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          width: 100%;
          max-width: 280px;
          text-align: center;
          font-family: 'Poppins', sans-serif;
        }
        .add-amount-input:focus, .add-amount-input:active {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .dark .add-amount-input {
          color: #9db0ff;
        }

        /* Description */
        .add-description-wrap {
          padding: 6px 28px 24px;
          display: flex;
          justify-content: center;
        }
        .add-description-input {
          font-size: 14px;
          color: #111;
          border: none !important;
          border-bottom: 1.5px dashed #c5c8d8 !important;
          padding-bottom: 6px;
          background: transparent;
          outline: none !important;
          box-shadow: none !important;
          width: 100%;
          max-width: 334px;
          font-family: 'Poppins', sans-serif;
          text-align: center;
          transition: border-bottom-color 0.2s;
        }
        .add-description-input::placeholder {
          color: #888;
        }
        .dark .add-description-input {
          color: #fff;
          border-bottom-color: #4a5270 !important;
        }
        .dark .add-description-input::placeholder {
          color: #555;
        }
        .add-description-input:focus, .add-description-input:active {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
          border-bottom: 1.5px dashed #3b5bdb !important;
        }
        .dark .add-description-input:focus, .dark .add-description-input:active {
          border-bottom-color: #5c7cfa !important;
        }

        /* Card list */
        .add-cards-list {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .add-card-row {
          background: #fff;
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.02);
          cursor: pointer;
          border: none;
          width: 100%;
          text-align: left;
          transition: transform 0.15s, background-color 0.15s;
        }
        .add-card-row:active {
          transform: scale(0.99);
        }
        .dark .add-card-row {
          background: #171c30;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        .add-card-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        .add-card-label {
          font-size: 15px;
          font-weight: 500;
          color: #111;
          flex: 1;
          font-family: 'Poppins', sans-serif;
        }
        .dark .add-card-label {
          color: #fff;
        }
        .add-card-value {
          font-size: 15px;
          font-weight: 500;
          color: #555;
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: 'Poppins', sans-serif;
        }
        .dark .add-card-value {
          color: #a1b3d6;
        }
        .add-card-value svg {
          width: 14px;
          height: 14px;
          color: #aaa;
        }

        /* Switch */
        .add-switch {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: #dde0ec;
          position: relative;
          transition: background-color 0.2s;
          border: none;
          cursor: pointer;
        }
        .dark .add-switch {
          background: #2e3756;
        }
        .add-switch.active {
          background: #3b5bdb;
        }
        .dark .add-switch.active {
          background: #5c7cfa;
        }
        .add-switch-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9px;
          background: #fff;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .add-switch.active .add-switch-thumb {
          transform: translateX(20px);
        }

        /* WhatsApp Input container */
        .add-subcard-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 4px 16px 12px;
          margin-top: -8px;
        }
        .add-subcard-input {
          background: #fff;
          border-radius: 12px;
          padding: 10px 14px;
          border: 1px solid #dde0ec;
          font-family: 'Poppins', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dark .add-subcard-input {
          background: #171c30;
          border-color: #232a45;
        }
        .add-subcard-input-label {
          font-size: 10px;
          font-weight: 700;
          color: #7d859a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .add-subcard-input-field {
          background: transparent;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          font-size: 14px;
          font-weight: 600;
          color: #111;
          width: 100%;
          padding: 0;
        }
        .add-subcard-input-field:focus, .add-subcard-input-field:active {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        .dark .add-subcard-input-field {
          color: #fff;
        }

        /* Category grid */
        .add-cat-label {
          padding: 10px 20px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #3b5bdb;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-family: 'Poppins', sans-serif;
        }
        .dark .add-cat-label {
          color: #5c7cfa;
        }
        .add-cat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 0 16px;
          margin-bottom: 24px;
        }
        .add-cat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          border: none;
          background: transparent;
        }
        .add-cat-icon-wrap {
          width: 68px;
          height: 68px;
          border-radius: 18px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          transition: all 0.2s;
          border: 2px solid transparent;
        }
        .dark .add-cat-icon-wrap {
          background: #171c30;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        .add-cat-icon-wrap.selected {
          border-color: #3b5bdb;
          background: #f0f3ff;
        }
        .dark .add-cat-icon-wrap.selected {
          border-color: #5c7cfa;
          background: #232a45;
        }
        .add-cat-name {
          font-size: 12px;
          font-weight: 500;
          color: #333;
          font-family: 'Poppins', sans-serif;
          text-align: center;
          max-width: 80px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dark .add-cat-name {
          color: #a1b3d6;
        }

        /* Dots inside the 'More' icon */
        .add-more-dots {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          padding: 2px;
        }
        .add-dot {
          width: 12px;
          height: 12px;
          border-radius: 3.5px;
          background: #a0a8d8;
        }
        .dark .add-dot {
          background: #4a5270;
        }
        .add-dot.accent {
          background: #3b5bdb;
        }
        .dark .add-dot.accent {
          background: #5c7cfa;
        }

        /* Save / Delete button wrap */
        .add-save-wrap {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .add-save-btn {
          width: 100%;
          padding: 18px;
          background: #1a2366;
          border: none;
          border-radius: 18px;
          color: #fff;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.1px;
          font-family: 'Poppins', sans-serif;
          transition: background-color 0.2s, transform 0.15s;
        }
        .add-save-btn:active {
          transform: scale(0.98);
        }
        .dark .add-save-btn {
          background: #3b5bdb;
        }
        .add-save-btn:hover {
          background: #12194d;
        }
        .dark .add-save-btn:hover {
          background: #2b4cc4;
        }

        .add-delete-btn {
          width: 100%;
          padding: 18px;
          background: transparent;
          border: 1.5px dashed #ff455f;
          border-radius: 18px;
          color: #ff455f;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          transition: background-color 0.2s;
          text-align: center;
        }
        .add-delete-btn:hover {
          background: rgba(255, 69, 95, 0.08);
        }

        /* Home indicator */
        .add-home-indicator {
          padding: 8px 0 20px;
          display: flex;
          justify-content: center;
          background: #eef0f7;
        }
        .dark .add-home-indicator {
          background: #0b0e17;
        }
        .add-home-bar {
          width: 130px; height: 5px;
          background: #111;
          border-radius: 10px;
          opacity: 0.15;
        }
        .dark .add-home-bar {
          background: #fff;
          opacity: 0.2;
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
            className={`add-toggle-btn ${type === 'expense' ? 'active' : ''}`}
          >
            Despesa
          </button>
          <button
            onClick={() => setType('income')}
            className={`add-toggle-btn ${type === 'income' ? 'active' : ''}`}
          >
            Receita
          </button>
        </div>
      </div>

      {/* Valor */}
      <div className="add-amount-wrap">
        <span className="add-currency-sign">R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          autoFocus
          className="add-amount-input"
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
                {cat.emoji}
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
              onClick={() => setShowCategoryPicker(prev => !prev)}
              className="add-cat-item"
            >
              <div className={`add-cat-icon-wrap ${hasCustomSelected ? 'selected' : ''}`}>
                {hasCustomSelected ? (
                  getCategoryEmoji(categoryName)
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 mb-6"
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
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold uppercase border transition-all text-center ${
                      isSel
                        ? 'border-[#3b5bdb]/50 dark:border-[#5c7cfa]/50 bg-[#3b5bdb]/10 dark:bg-[#5c7cfa]/10 text-[#3b5bdb] dark:text-[#5c7cfa]'
                        : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-1">{getCategoryEmoji(c)}</span>
                    {c}
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
          className="add-save-btn"
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

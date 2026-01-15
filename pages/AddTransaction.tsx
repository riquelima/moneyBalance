import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, toLocalISO } from '../utils/date';
import { categories } from '../categories';

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

  // Colors based on type
  const activeColor = type === 'expense' ? '#FF455F' : '#00D68F'; // Pink/Red for expense, Green for income
  const activeClass = type === 'expense' ? 'bg-[#FF455F]' : 'bg-[#00D68F]';
  const textClass = type === 'expense' ? 'text-[#FF455F]' : 'text-[#00D68F]';
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('edit');
    if (id) {
      setEditId(id);
      (async () => {
        const { data } = await supabase
          .from('user_transactions')
          .select('id, description, amount, type, date, is_paid, category_id')
          .eq('id', id)
          .maybeSingle();
        if (data) {
          setType(data.type as any);
          setDescription(data.description || '');
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
            setCategoryName((cat as any)?.name || '');
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
    })();
  }, []);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...categories, ...userCategories]));
  }, [userCategories]);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm font-display"
    >
      {/* Click outside to close simulation */}
      <div className="h-10 w-full" onClick={() => navigate(-1)}></div>

      <div className="flex-1 flex flex-col bg-white dark:bg-surface-dark rounded-t-lg overflow-hidden shadow-neo dark:shadow-[4px_4px_0px_0px_#ffffff] border-t-4 border-x-4 border-dark dark:border-white">
        {/* Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1" onClick={() => navigate(-1)}>
          <div className="h-1.5 w-12 rounded-full bg-dark dark:bg-white opacity-20"></div>
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 relative border-b-2 border-dark dark:border-white pb-4">
            <div className="w-10"></div> {/* Spacer */}
            <h1 className="text-xl font-black text-dark dark:text-white uppercase">Adicionar Transação</h1>
            <button 
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-transparent hover:border-dark dark:hover:border-white text-dark dark:text-white transition-all"
            >
                <span className="material-symbols-outlined">close</span>
            </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white dark:bg-surface-dark">
          <div className="max-w-md mx-auto">
            
            {/* Type Segmented Control */}
            <div className="flex bg-white dark:bg-surface-dark border-2 border-dark dark:border-white rounded-sm p-1 mb-8 shadow-neo-sm dark:shadow-none">
                <button 
                    onClick={() => setType('income')}
                    className={`flex-1 py-2 rounded-sm text-sm font-black uppercase transition-all border-2 ${type === 'income' ? 'bg-secondary text-white border-dark dark:border-white shadow-neo-sm dark:shadow-none -translate-y-1' : 'bg-transparent text-dark dark:text-white border-transparent hover:bg-surface-light dark:hover:bg-gray-800'}`}
                >
                    Receita
                </button>
                <button 
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2 rounded-sm text-sm font-black uppercase transition-all border-2 ${type === 'expense' ? 'bg-primary text-white border-dark dark:border-white shadow-neo-sm dark:shadow-none -translate-y-1' : 'bg-transparent text-dark dark:text-white border-transparent hover:bg-surface-light dark:hover:bg-gray-800'}`}
                >
                    Despesa
                </button>
            </div>

            {/* Amount Input */}
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-dark dark:text-white">R$</span>
                    <input 
                        type="text" 
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0,00"
                        autoFocus
                        className={`bg-transparent border-none p-0 text-6xl font-black placeholder-text-secondary/30 focus:ring-0 w-48 text-center ${type === 'expense' ? 'text-primary' : 'text-secondary'}`}
                    />
                </div>
                {showDatePicker && (
                  <div className="mt-3 w-full max-w-full rounded-sm bg-white dark:bg-surface-dark border-2 border-dark dark:border-white p-3 sm:p-4 select-none shadow-neo dark:shadow-[4px_4px_0px_0px_#ffffff]">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => {
                          const m = pickerMonth - 1; const y = pickerYear + (m < 0 ? -1 : 0);
                          setPickerYear(y); setPickerMonth((m + 12) % 12);
                        }}
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-sm bg-white dark:bg-surface-dark border-2 border-dark dark:border-white text-dark dark:text-white flex items-center justify-center hover:bg-surface-light dark:hover:bg-gray-800 shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[1px]"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <span className="text-dark dark:text-white font-black text-sm sm:text-base uppercase">{monthNames[pickerMonth]} {pickerYear}</span>
                      <button
                        onClick={() => {
                          const m = pickerMonth + 1; const y = pickerYear + (m > 11 ? 1 : 0);
                          setPickerYear(y); setPickerMonth(m % 12);
                        }}
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-sm bg-white dark:bg-surface-dark border-2 border-dark dark:border-white text-dark dark:text-white flex items-center justify-center hover:bg-surface-light dark:hover:bg-gray-800 shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[1px]"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-[2px] sm:gap-1 text-[11px] sm:text-xs text-dark dark:text-white font-bold mb-2 uppercase">
                      {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
                        <div key={d} className="text-center">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-[2px] sm:gap-1">
                      {monthGrid.map((d, i) => {
                        if (!d) return <div key={i} className="h-9 sm:h-10 rounded-sm bg-surface-light/40 dark:bg-gray-800/40" />;
                        const curr = new Date(pickerYear, pickerMonth, d);
                        const isSel = isSameDay(curr, selectedDate);
                        const isToday = isSameDay(curr, new Date());
                        return (
                          <button
                            key={i}
                            onClick={() => { setSelectedDate(curr); setShowDatePicker(false); }}
                            className={`h-9 sm:h-10 rounded-sm text-xs sm:text-sm font-bold flex items-center justify-center border-2 ${isSel ? 'bg-primary text-white border-dark dark:border-white shadow-neo-sm dark:shadow-none' : 'bg-white dark:bg-surface-dark text-dark dark:text-white border-transparent hover:border-dark dark:hover:border-white'} ${isToday && !isSel ? 'border-primary text-primary' : ''}`}
                          >
                            {String(d)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                {/* Description */}
                <div className="space-y-2">
                    <input 
                        type="text"
                        placeholder="DESCRIÇÃO"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-14 rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-4 text-dark dark:text-white font-bold uppercase placeholder:text-text-secondary/70 dark:placeholder:text-gray-500 focus:shadow-neo-sm dark:focus:shadow-[2px_2px_0px_0px_#ffffff] focus:outline-none transition-all"
                    />
                </div>

                {/* Category */}
                <button onClick={() => setShowCategoryPicker(v => !v)} className="w-full h-14 rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-4 flex items-center justify-between group active:translate-y-[2px] shadow-neo-sm dark:shadow-none active:shadow-none transition-all">
                    <span className="text-dark dark:text-white font-bold uppercase group-hover:text-primary transition-colors">Categoria</span>
                    <div className="flex items-center gap-2">
                        <span className="text-dark dark:text-white font-black uppercase">{categoryName || 'SELECIONE'}</span>
                        <span className="material-symbols-outlined text-dark dark:text-white">chevron_right</span>
                    </div>
                </button>
                {showCategoryPicker && (
                  <div className="grid grid-cols-2 gap-2 mt-2 p-2 border-2 border-dark dark:border-white bg-surface-light dark:bg-background-dark shadow-neo-sm dark:shadow-none">
                    {allCategories.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCategoryName(c); setShowCategoryPicker(false); }}
                        className={`px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 ${categoryName === c ? 'border-dark dark:border-white bg-primary text-white shadow-neo-sm dark:shadow-none' : 'border-dark dark:border-white bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-gray-800'}`}
                      >
                        {c}
                      </button>
                    ))}
                    <button
                      onClick={() => { setNewCategoryError(null); setNewCategoryName(''); setShowNewCategoryModal(true); }}
                      className="px-3 py-2 rounded-sm text-sm font-black uppercase border-2 border-dark dark:border-white bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-gray-800"
                      aria-label="Criar nova categoria"
                    >
                      +
                    </button>
                  </div>
                )}
                {showNewCategoryModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setShowNewCategoryModal(false)}>
                    <div className="w-80 rounded-sm bg-white dark:bg-surface-dark border-2 border-dark dark:border-white p-4 shadow-neo dark:shadow-[4px_4px_0px_0px_#ffffff]" onClick={(e) => e.stopPropagation()}>
                      <h2 className="text-dark dark:text-white font-black text-base uppercase mb-3">Nova Categoria</h2>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="NOME DA CATEGORIA"
                        className="w-full h-12 rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-3 text-dark dark:text-white font-bold uppercase placeholder:text-text-secondary/70 dark:placeholder:text-gray-500 focus:outline-none mb-2"
                      />
                      {newCategoryError && (
                        <div className="text-primary font-bold text-xs uppercase mb-2">{newCategoryError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowNewCategoryModal(false)}
                          className="flex-1 px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 border-dark dark:border-white bg-white dark:bg-surface-dark text-dark dark:text-white hover:bg-surface-light dark:hover:bg-gray-800"
                        >
                          Cancelar
                        </button>
                        <button
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
                          className="flex-1 px-3 py-2 rounded-sm text-sm font-bold uppercase border-2 border-dark dark:border-white bg-primary text-white hover:opacity-90"
                        >
                          Criar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 items-center">
                    {/* Date */}
                    <button onClick={() => setShowDatePicker(v => !v)} className="col-span-2 h-12 w-full rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-4 flex flex-col justify-center items-start group active:translate-y-[2px] shadow-neo-sm dark:shadow-none active:shadow-none transition-all">
                        <span className="text-[10px] font-bold text-text-secondary dark:text-gray-400 uppercase">Data</span>
                        <span className="text-dark dark:text-white font-black truncate w-full uppercase">{displayDateLabel}</span>
                    </button>

                    {/* Paid Toggle */}
                    <div className="h-12 w-full rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-3 flex items-center justify-between shadow-neo-sm dark:shadow-none">
                        <span className="text-dark dark:text-white text-sm font-bold uppercase">{type === 'income' ? 'Recebido' : 'Pago'}</span>
                        <button 
                            onClick={() => setIsPaid(!isPaid)}
                            className={`w-10 h-6 rounded-sm relative overflow-visible transition-colors border-2 border-dark dark:border-white ${isPaid ? (type === 'expense' ? 'bg-primary' : 'bg-secondary') : 'bg-surface-light dark:bg-gray-700'}`}
                        >
                            <div className={`absolute -top-1 -left-1 bg-white dark:bg-surface-dark h-4 w-4 rounded-sm border-2 border-dark dark:border-white shadow-sm transition-transform ${isPaid ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Recurring Toggle */}
                    <div className="h-12 w-full rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-3 flex items-center justify-between shadow-neo-sm dark:shadow-none">
                        <span className="text-dark dark:text-white text-sm font-bold uppercase">Recorrente</span>
                        <button 
                            onClick={() => setIsRecurring(!isRecurring)}
                            className={`w-10 h-6 rounded-sm relative overflow-visible transition-colors border-2 border-dark dark:border-white ${isRecurring ? (type === 'expense' ? 'bg-primary' : 'bg-secondary') : 'bg-surface-light dark:bg-gray-700'}`}
                        >
                            <div className={`absolute -top-1 -left-1 bg-white dark:bg-surface-dark h-4 w-4 rounded-sm border-2 border-dark dark:border-white shadow-sm transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>

          </div>
        </div>

        {/* Footer Button */}
        <div className="p-6 pt-2 bg-white dark:bg-surface-dark border-t-2 border-dark dark:border-white pb-8">
            <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (saving) return;
                  setError(null);
                  const normalized = amount
                    .replace(/\./g, '')
                    .replace(/,/g, '.')
                    .trim();
                  const value = Number(normalized);
                  if (!value || value <= 0) {
                    setError('Informe um valor válido');
                    return;
                  }
                  setSaving(true);
                  const { data: userData } = await supabase.auth.getUser();
                  const user = userData?.user;
                  if (!user) {
                    setError('Faça login para salvar a transação');
                    setSaving(false);
                    return;
                  }
                  const dateStr = toLocalISO(selectedDate);
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
                    const { error: updateError } = await supabase
                      .from('user_transactions')
                      .update({
                        amount: value,
                        type,
                        description: description || null,
                        date: dateStr,
                        is_paid: isPaid,
                        category_id: categoryId
                      })
                      .eq('id', editId);
                    dbError = updateError;
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
                        category_id: categoryId
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
                            category_id: categoryId
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
                }}
                className={`w-full h-14 rounded-xl font-bold text-lg shadow-lg text-white transition-colors ${activeClass}`}
                disabled={saving}
            >
                {editId ? 'Atualizar Transação' : 'Salvar Transação'}
            </motion.button>
            {editId && (
              <button
                onClick={async () => {
                  if (!editId) return;
                  const { error: delError } = await supabase
                    .from('user_transactions')
                    .delete()
                    .eq('id', editId);
                  if (delError) { setError(delError.message); return; }
                  navigate(-1);
                }}
                className="mt-3 w-full h-12 rounded-xl font-bold text-sm bg-danger text-white"
              >Excluir</button>
            )}
            {error && (
              <p className="mt-2 text-danger text-sm">{error}</p>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default AddTransaction;

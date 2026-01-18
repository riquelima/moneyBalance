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

      <div className="flex-1 flex flex-col bg-[#1A1A1A] rounded-t-3xl overflow-hidden shadow-2xl border-t border-white/10">
        {/* Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1" onClick={() => navigate(-1)}>
          <div className="h-1.5 w-12 rounded-full bg-white/20"></div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="w-10"></div> {/* Spacer */}
            <h1 className="text-lg font-bold text-white tracking-wide">Nova Transação</h1>
            <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all"
            >
                <span className="material-symbols-outlined">close</span>
            </motion.button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-md mx-auto space-y-8">
            
            {/* Type Segmented Control */}
            <div className="flex bg-white/5 rounded-2xl p-1 shadow-inner">
                <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setType('income')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'income' ? 'bg-secondary/20 text-secondary-light shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                >
                    Receita
                </motion.button>
                <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setType('expense')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'expense' ? 'bg-danger/20 text-danger-light shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                >
                    Despesa
                </motion.button>
            </div>

            {/* Amount Input */}
            <div className="flex flex-col items-center justify-center">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white/50">R$</span>
                    <input 
                        type="text" 
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0,00"
                        autoFocus
                        className={`bg-transparent border-none p-0 text-6xl font-bold placeholder-white/10 focus:ring-0 w-64 text-center outline-none ${type === 'expense' ? 'text-danger-light drop-shadow-[0_0_15px_rgba(255,69,95,0.3)]' : 'text-secondary-light drop-shadow-[0_0_15px_rgba(0,214,143,0.3)]'}`}
                    />
                </div>
                {showDatePicker && (
                  <div className="mt-6 w-full rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 p-4 select-none shadow-glass animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const m = pickerMonth - 1; const y = pickerYear + (m < 0 ? -1 : 0);
                          setPickerYear(y); setPickerMonth((m + 12) % 12);
                        }}
                        className="h-8 w-8 rounded-full bg-white/5 text-white flex items-center justify-center hover:bg-white/10 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </motion.button>
                      <span className="text-white font-bold text-sm uppercase tracking-wider">{monthNames[pickerMonth]} {pickerYear}</span>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const m = pickerMonth + 1; const y = pickerYear + (m > 11 ? 1 : 0);
                          setPickerYear(y); setPickerMonth(m % 12);
                        }}
                        className="h-8 w-8 rounded-full bg-white/5 text-white flex items-center justify-center hover:bg-white/10 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-[10px] text-white/50 font-bold mb-2 uppercase text-center">
                      {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
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
                            className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${isSel ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-white hover:bg-white/5'} ${isToday && !isSel ? 'text-primary ring-1 ring-primary/50' : ''}`}
                          >
                            {String(d)}
                          </motion.button>
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
                        placeholder="Descrição"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 px-4 text-white font-medium placeholder:text-white/30 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all"
                    />
                </div>

                {/* Category */}
                <motion.button 
                  whileTap={{ scale: 0.98 }} 
                  onClick={() => setShowCategoryPicker(v => !v)} 
                  className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 px-4 flex items-center justify-between group hover:bg-white/10 transition-all"
                >
                    <span className="text-white/70 font-medium group-hover:text-white transition-colors">Categoria</span>
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{categoryName || 'Selecionar'}</span>
                        <span className="material-symbols-outlined text-white/50">chevron_right</span>
                    </div>
                </motion.button>
                {showCategoryPicker && (
                  <div className="grid grid-cols-2 gap-2 mt-2 p-3 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-md">
                    {allCategories.map((c) => (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        key={c}
                        onClick={() => { setCategoryName(c); setShowCategoryPicker(false); }}
                        className={`px-3 py-3 rounded-xl text-xs font-bold uppercase border transition-all ${categoryName === c ? 'border-primary/50 bg-primary/20 text-white shadow-lg shadow-primary/10' : 'border-white/5 bg-white/5 text-white/70 hover:bg-white/10'}`}
                      >
                        {c}
                      </motion.button>
                    ))}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setNewCategoryError(null); setNewCategoryName(''); setShowNewCategoryModal(true); }}
                      className="px-3 py-3 rounded-xl text-xs font-bold uppercase border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      aria-label="Criar nova categoria"
                    >
                      + Nova
                    </motion.button>
                  </div>
                )}
                {showNewCategoryModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowNewCategoryModal(false)}>
                    <div className="w-80 rounded-3xl bg-[#1E1E1E] border border-white/10 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <h2 className="text-white font-bold text-lg mb-4">Nova Categoria</h2>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da categoria"
                        className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 mb-2"
                      />
                      {newCategoryError && (
                        <div className="text-danger-light font-bold text-xs mb-4">{newCategoryError}</div>
                      )}
                      <div className="flex gap-3 mt-4">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowNewCategoryModal(false)}
                          className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-white/5 text-white hover:bg-white/10 transition-all"
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
                          className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                        >
                          Criar
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 items-center">
                    {/* Date */}
                    <motion.button 
                      whileTap={{ scale: 0.98 }} 
                      onClick={() => setShowDatePicker(v => !v)} 
                      className="col-span-2 h-14 w-full rounded-2xl bg-white/5 border border-white/10 px-4 flex flex-col justify-center items-start group hover:bg-white/10 transition-all"
                    >
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Data</span>
                        <span className="text-white font-bold truncate w-full">{displayDateLabel}</span>
                    </motion.button>

                    {/* Paid Toggle */}
                    <div className="h-14 w-full rounded-2xl bg-white/5 border border-white/10 px-4 flex items-center justify-between">
                        <span className="text-white font-medium text-sm">{type === 'income' ? 'Recebido' : 'Pago'}</span>
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                            onClick={() => setIsPaid(!isPaid)}
                            className={`w-12 h-7 rounded-full relative transition-colors ${isPaid ? (type === 'expense' ? 'bg-danger' : 'bg-secondary') : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 left-1 bg-white h-5 w-5 rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-5' : 'translate-x-0'}`} />
                        </motion.button>
                    </div>

                    {/* Recurring Toggle */}
                    <div className="h-14 w-full rounded-2xl bg-white/5 border border-white/10 px-4 flex items-center justify-between">
                        <span className="text-white font-medium text-sm">Recorrente</span>
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                            onClick={() => setIsRecurring(!isRecurring)}
                            className={`w-12 h-7 rounded-full relative transition-colors ${isRecurring ? (type === 'expense' ? 'bg-danger' : 'bg-secondary') : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 left-1 bg-white h-5 w-5 rounded-full shadow-sm transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
                        </motion.button>
                    </div>
                </div>
            </div>

          </div>
        </div>

        {/* Footer Button */}
        <div className="p-6 pt-4 bg-[#1A1A1A] border-t border-white/5 pb-8">
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
                    if (!dbError && description) {
                      const { error: bulkError } = await supabase
                        .from('user_transactions')
                        .update({ category_id: categoryId })
                        .eq('user_id', user.id)
                        .eq('description', description);
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
                className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg text-white transition-all ${type === 'expense' ? 'bg-danger shadow-danger/30 hover:bg-danger/90' : 'bg-secondary shadow-secondary/30 hover:bg-secondary/90'}`}
                disabled={saving}
            >
                {editId ? 'Atualizar' : 'Salvar'}
            </motion.button>
            {editId && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  if (!editId) return;
                  const { error: delError } = await supabase
                    .from('user_transactions')
                    .delete()
                    .eq('id', editId);
                  if (delError) { setError(delError.message); return; }
                  navigate(-1);
                }}
                className="mt-3 w-full h-12 rounded-2xl font-bold text-sm bg-white/5 text-danger-light hover:bg-danger/10 transition-colors"
              >Excluir</motion.button>
            )}
            {error && (
              <p className="mt-4 text-danger-light text-sm text-center font-medium bg-danger/10 p-2 rounded-lg border border-danger/20">{error}</p>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default AddTransaction;

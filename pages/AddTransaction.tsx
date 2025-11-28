import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const AddTransaction: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const categories = [
    'Moradia',
    'Contas da casa',
    'Alimentação',
    'Transporte',
    'Saúde',
    'Educação e desenvolvimento',
    'Lazer e social',
    'Imprevistos',
    'Investimentos / economias'
  ];

  // Colors based on type
  const activeColor = type === 'expense' ? '#FF455F' : '#00D68F'; // Pink/Red for expense, Green for income
  const activeClass = type === 'expense' ? 'bg-[#FF455F]' : 'bg-[#00D68F]';
  const textClass = type === 'expense' ? 'text-[#FF455F]' : 'text-[#00D68F]';

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

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/80 font-display"
    >
      {/* Click outside to close simulation */}
      <div className="h-10 w-full" onClick={() => navigate(-1)}></div>

      <div className="flex-1 flex flex-col bg-surface-dark rounded-t-3xl overflow-hidden shadow-2xl">
        {/* Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1" onClick={() => navigate(-1)}>
          <div className="h-1.5 w-12 rounded-full bg-surface-light opacity-50"></div>
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 relative">
            <div className="w-10"></div> {/* Spacer */}
            <h1 className="text-lg font-bold text-white">Adicionar Transação</h1>
            <button 
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:bg-surface-light hover:text-white transition-colors"
            >
                <span className="material-symbols-outlined">close</span>
            </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
            
            {/* Type Segmented Control */}
            <div className="flex bg-[#2C2C2E] rounded-xl p-1 mb-8">
                <button 
                    onClick={() => setType('income')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-[#00D68F] text-black shadow-md' : 'text-text-secondary hover:text-white'}`}
                >
                    Receita
                </button>
                <button 
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-[#FF455F] text-white shadow-md' : 'text-text-secondary hover:text-white'}`}
                >
                    Despesa
                </button>
            </div>

            {/* Amount Input */}
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-medium text-text-secondary">R$</span>
                    <input 
                        type="text" 
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0,00"
                        autoFocus
                        className="bg-transparent border-none p-0 text-6xl font-bold text-white placeholder-text-secondary/30 focus:ring-0 w-48 text-center"
                    />
                </div>
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
                        className="w-full h-14 rounded-xl bg-[#2C2C2E] border-none px-4 text-white placeholder:text-text-secondary/70 focus:ring-2 focus:ring-opacity-50 transition-all"
                        style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
                    />
                </div>

                {/* Category */}
                <button onClick={() => setShowCategoryPicker(v => !v)} className="w-full h-14 rounded-xl bg-[#2C2C2E] px-4 flex items-center justify-between group active:scale-[0.99] transition-transform">
                    <span className="text-text-secondary group-hover:text-white transition-colors">Categoria</span>
                    <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{categoryName || 'Selecione'}</span>
                        <span className="material-symbols-outlined text-text-secondary">chevron_right</span>
                    </div>
                </button>
                {showCategoryPicker && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCategoryName(c); setShowCategoryPicker(false); }}
                        className={`px-3 py-2 rounded-lg text-sm border ${categoryName === c ? 'border-primary text-white' : 'border-surface-light text-text-secondary hover:text-white'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                     {/* Date */}
                    <button className="flex-1 h-14 rounded-xl bg-[#2C2C2E] px-4 flex flex-col justify-center items-start group active:scale-[0.99] transition-transform">
                        <span className="text-xs text-text-secondary">Data</span>
                        <span className="text-white font-medium">Hoje</span>
                    </button>

                    {/* Paid Toggle */}
                    <div className="flex-1 h-14 rounded-xl bg-[#2C2C2E] px-4 flex items-center justify-between">
                        <span className="text-white font-medium">Pago</span>
                        <button 
                            onClick={() => setIsPaid(!isPaid)}
                            className={`w-12 h-7 rounded-full relative transition-colors ${isPaid ? activeClass : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-1 left-1 bg-white h-5 w-5 rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer Button */}
        <div className="p-6 pt-2 bg-surface-dark pb-8">
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
                  const today = new Date();
                  const dateStr = today.toISOString().slice(0, 10);
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

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<Array<{ id: string; description: string | null; amount: number; type: 'income' | 'expense'; date: string; is_paid: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

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
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { setItems([]); setLoading(false); return; }
      const { data, error } = await supabase
        .from('user_transactions')
        .select('id, description, amount, type, date, is_paid')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (!error && data) {
        setItems(data as any);
      } else {
        setItems([]);
      }
      setLoading(false);
    };
    load();
  }, [location.key]);

  const grouped = useMemo(() => {
    const acc: Record<string, typeof items> = {} as any;
    items.forEach((t) => {
      const label = labelForDate(t.date);
      acc[label] = acc[label] || [];
      acc[label].push(t as any);
    });
    return acc;
  }, [items]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col min-h-screen pb-24"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background-dark/80 backdrop-blur-md p-4 border-b border-surface-light">
        <div className="w-10"></div>
        <h1 className="text-lg font-bold">Transações</h1>
        <button className="flex w-10 items-center justify-center text-primary">
          <span
            className="material-symbols-outlined text-3xl"
            onClick={() => navigate('/add-transaction')}
          >
            add_circle
          </span>
        </button>
      </header>

      <div className="p-4">
        <div className="flex items-center rounded-xl bg-surface-dark border border-surface-light px-4 py-3">
          <span className="material-symbols-outlined text-text-secondary mr-2">search</span>
          <input 
            type="text" 
            placeholder="Buscar transações"
            className="w-full bg-transparent text-text-primary placeholder:text-text-secondary outline-none border-none focus:ring-0 p-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-6 py-4 text-text-secondary">Carregando...</p>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-text-secondary">
            <p>Nenhuma transação cadastrada.</p>
            <button onClick={() => navigate('/add-transaction')} className="mt-2 text-primary hover:underline">Adicionar transação</button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, groupItems], groupIndex) => (
            <div key={date}>
              <h2 className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary">{date}</h2>
              {(groupItems as any[]).map((t: any, i: number) => (
                <div key={t.id} className="relative overflow-hidden">
                  <div className="absolute inset-y-0 right-0 flex items-center gap-2 px-4 z-0">
                    <button
                      onClick={() => navigate(`/add-transaction?edit=${t.id}`)}
                      className="px-3 py-1 rounded-lg bg-primary text-background-dark text-xs font-bold"
                    >Editar</button>
                    <button
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
                      className="px-3 py-1 rounded-lg bg-danger text-white text-xs font-bold"
                    >Excluir</button>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: openId === t.id ? -120 : 0 }}
                    transition={{ delay: i * 0.05 + groupIndex * 0.1 }}
                    drag="x"
                    dragConstraints={{ left: -120, right: 0 }}
                    dragElastic={0.05}
                    dragMomentum={false}
                    onDragStart={() => setOpenId(null)}
                    onDragEnd={(e, info) => {
                      setOpenId(info.offset.x < -60 ? t.id : null);
                    }}
                    className="relative z-10 flex items-center gap-4 px-6 py-4 hover:bg-surface-dark/30 active:bg-surface-dark/50 transition-colors border-b border-surface-light/30 last:border-0"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-light text-text-primary">
                      <span className="material-symbols-outlined">{t.type === 'income' ? 'south' : 'north'}</span>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <p className="font-medium text-text-primary line-clamp-1">{t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')}</p>
                      <p className="text-xs text-text-secondary">{t.is_paid ? 'Pago' : 'Pendente'}</p>
                    </div>
                    <p className={`font-medium ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                      {formatBRL(Number(t.amount))}
                    </p>
                  </motion.div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Transactions;

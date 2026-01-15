import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Array<{ icon: string; title: string; text: string; tag?: string; tagClass?: string; time: string; tone: 'danger' | 'warning' | 'info' | 'neutral' }>>([]);

  useEffect(() => {
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { setItems([]); return; }
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: budgets } = await supabase
        .from('user_budgets')
        .select('category, limit_amount')
        .eq('user_id', user.id)
        .eq('year', now.getFullYear())
        .eq('month', now.getMonth());

      const { data: tx } = await supabase
        .from('user_transactions')
        .select('amount, type, date, category_id')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', fmt(start))
        .lte('date', fmt(end));

      const map = new Map<string, number>();
      const idsSet = new Set<string>();
      (tx || []).forEach((t: any) => {
        const id = t.category_id || 'none';
        idsSet.add(id);
        map.set(id, (map.get(id) || 0) + Number(t.amount || 0));
      });
      const ids = Array.from(idsSet).filter(id => id !== 'none');
      let byIdName: Record<string, string> = {};
      if (ids.length) {
        const { data: cats } = await supabase
          .from('user_categories')
          .select('id, name')
          .in('id', ids);
        (cats || []).forEach((c: any) => { byIdName[String(c.id)] = String(c.name || 'Categoria'); });
      }
      const spentByName: Record<string, number> = {};
      Array.from(map.entries()).forEach(([id, amt]) => {
        if (id === 'none') return;
        const nm = byIdName[id] || 'Categoria';
        spentByName[nm] = (spentByName[nm] || 0) + Number(amt || 0);
      });

      const alerts: Array<{ icon: string; title: string; text: string; tag?: string; tagClass?: string; time: string; tone: 'danger' | 'warning' | 'info' | 'neutral' }> = [];
      (budgets || []).forEach((b: any) => {
        const limit = Number(b.limit_amount || 0);
        const name = String(b.category || 'Categoria');
        if (limit > 0) {
          const spent = Number(spentByName[name] || 0);
          const pct = limit ? Math.round((spent / limit) * 100) : 0;
          if (pct >= 80) {
            alerts.push({ icon: 'warning', title: 'Alerta de Orçamento', text: `Você atingiu ${pct}% do seu orçamento para a categoria "${name}".`, tag: 'Atenção', tagClass: 'text-warning', time: 'Este mês', tone: 'warning' });
          }
        }
      });

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const todayISO = fmt(now);
      const tomorrowISO = fmt(tomorrow);

      const { data: expTomorrow } = await supabase
        .from('user_transactions')
        .select('description, amount, type, is_paid, date')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('is_paid', false)
        .eq('date', tomorrowISO);
      (expTomorrow || []).forEach((t: any) => {
        const desc = String(t.description || '').trim();
        const amountStr = Number(t.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        alerts.push({ icon: 'event_upcoming', title: 'Vencimento Amanhã (Despesa)', text: `Amanhã vence: ${desc || 'Despesa'} (${amountStr}).`, tag: 'Atenção', tagClass: 'text-warning', time: 'Amanhã', tone: 'warning' });
      });

      const { data: expToday } = await supabase
        .from('user_transactions')
        .select('description, amount, type, is_paid, date')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('is_paid', false)
        .eq('date', todayISO);
      (expToday || []).forEach((t: any) => {
        const desc = String(t.description || '').trim();
        const amountStr = Number(t.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        alerts.push({ icon: 'calendar_today', title: 'Vencimento Hoje (Despesa)', text: `Vence hoje: ${desc || 'Despesa'} (${amountStr}).`, tag: 'Vence hoje', tagClass: 'text-danger', time: 'Hoje', tone: 'danger' });
      });

      const { data: incTomorrow } = await supabase
        .from('user_transactions')
        .select('description, amount, type, date')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .eq('date', tomorrowISO);
      (incTomorrow || []).forEach((t: any) => {
        const desc = String(t.description || '').trim();
        const amountStr = Number(t.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        alerts.push({ icon: 'payments', title: 'Entrada Amanhã', text: `Amanhã você deve receber: ${desc || 'Entrada'} (${amountStr}).`, tag: 'Recebimento', tagClass: 'text-primary-blue', time: 'Amanhã', tone: 'info' });
      });

      const { data: incToday } = await supabase
        .from('user_transactions')
        .select('description, amount, type, date')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .eq('date', todayISO);
      (incToday || []).forEach((t: any) => {
        const desc = String(t.description || '').trim();
        const amountStr = Number(t.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        alerts.push({ icon: 'attach_money', title: 'Entrada Hoje', text: `Entrada prevista para hoje: ${desc || 'Entrada'} (${amountStr}).`, tag: 'Recebimento', tagClass: 'text-primary-blue', time: 'Hoje', tone: 'info' });
      });
      setItems(alerts);
    };
    load();
  }, []);

  const toneClasses = (t: 'danger' | 'warning' | 'info' | 'neutral') => {
    if (t === 'danger') return { border: 'border-danger/50', iconBg: 'bg-danger/20', iconText: 'text-danger' };
    if (t === 'warning') return { border: 'border-warning/50', iconBg: 'bg-warning/20', iconText: 'text-warning' };
    if (t === 'info') return { border: 'border-primary-blue/50', iconBg: 'bg-primary-blue/20', iconText: 'text-primary-blue' };
    return { border: 'border-transparent', iconBg: 'bg-surface-light', iconText: 'text-text-secondary' };
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm font-display"
    >
      <div className="flex h-full w-full flex-col justify-end">
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 160 }}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={(e, info) => { if (info.offset.y > 60) navigate(-1); }}
          className="flex h-[95%] w-full flex-col bg-white dark:bg-surface-dark rounded-t-lg overflow-hidden shadow-neo dark:shadow-[4px_4px_0px_0px_#ffffff] border-t-4 border-x-4 border-dark dark:border-white"
        >
          <div className="flex w-full justify-center pt-3 pb-1">
            <div className="h-1.5 w-12 rounded-full bg-dark dark:bg-white opacity-20"></div>
          </div>
          <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-white dark:bg-surface-dark border-b-2 border-dark dark:border-white pb-4">
            <h1 className="text-xl font-black text-dark dark:text-white uppercase">Notificações</h1>
            <motion.button 
              whileTap={{ scale: 0.95, y: 2 }} 
              onClick={() => navigate(-1)} 
              className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-transparent hover:border-dark dark:hover:border-white text-dark dark:text-white transition-all"
            >
              <span className="material-symbols-outlined !text-3xl">close</span>
            </motion.button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <div className="flex flex-col gap-4">
              {items.map((it, idx) => {
                const cls = toneClasses(it.tone);
                const faded = it.tone === 'neutral' ? 'opacity-70' : '';
                return (
                  <div key={idx} className="relative">
                    <div className="absolute inset-0 z-0 flex items-center justify-end pr-4">
                      <motion.button
                        whileTap={{ scale: 0.95, y: 2 }}
                        onClick={() => setItems(arr => arr.filter((_, i) => i !== idx))}
                        className="flex items-center justify-center h-10 w-10 rounded-sm bg-danger/20 text-danger hover:bg-danger/30 border-2 border-dark dark:border-white"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </motion.button>
                    </div>
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: -120, right: 0 }}
                      dragElastic={0.06}
                      dragMomentum={false}
                      onDragEnd={(e, info) => { if (info.offset.x < -80) setItems(arr => arr.filter((_, i) => i !== idx)); }}
                      className={`relative z-10 flex items-start gap-4 rounded-sm border-2 border-dark dark:border-white bg-white dark:bg-surface-dark p-4 shadow-neo-sm dark:shadow-none ${faded}`}
                    >
                      <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border-2 border-dark dark:border-white ${cls.iconBg} ${cls.iconText}`}>
                        <span className="material-symbols-outlined">{it.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h2 className={`font-black uppercase ${it.tone === 'neutral' ? 'text-text-secondary dark:text-gray-400' : 'text-dark dark:text-white'}`}>{it.title}</h2>
                        <p className="text-sm font-bold text-text-secondary dark:text-gray-400">{it.text}</p>
                        {it.tag && (
                          <span className={`mt-2 inline-block text-[10px] font-black uppercase px-2 py-1 border-2 border-dark dark:border-white bg-white dark:bg-surface-dark ${it.tagClass}`}>{it.tag}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-text-secondary dark:text-gray-400">{it.time}</span>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Notifications;

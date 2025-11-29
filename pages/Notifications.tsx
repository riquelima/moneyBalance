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

      const twoDays = new Date(now);
      twoDays.setDate(now.getDate() + 2);
      const { data: upcoming } = await supabase
        .from('user_transactions')
        .select('description, amount, type, is_paid, date')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('is_paid', false)
        .eq('date', fmt(twoDays));
      (upcoming || []).forEach((t: any) => {
        const desc = String(t.description || '').trim();
        const amountStr = Number(t.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const suffix = desc ? ` ${desc}` : '';
        alerts.push({ icon: 'calendar_today', title: 'Lembrete de Pagamento', text: `Lembre-se de pagar sua conta${suffix}. Vencimento em 2 dias.`, tag: 'Lembrete', tagClass: 'text-primary-blue', time: 'Hoje', tone: 'info' });
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
      className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm"
    >
      <div className="flex h-full w-full flex-col justify-end">
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 160 }}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={(e, info) => { if (info.offset.y > 60) navigate(-1); }}
          className="flex h-[95%] w-full flex-col rounded-t-3xl border-t border-surface-light bg-background-dark/95"
        >
          <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-surface-light"></div>
          <header className="flex items-center justify-between p-6">
            <h1 className="text-2xl font-bold text-text-primary">Notificações</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setItems([])} className="text-text-secondary hover:text-danger">
                <span className="material-symbols-outlined !text-3xl">delete_sweep</span>
              </button>
              <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-primary">
                <span className="material-symbols-outlined !text-3xl">close</span>
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="flex flex-col gap-4">
              {items.map((it, idx) => {
                const cls = toneClasses(it.tone);
                const faded = it.tone === 'neutral' ? 'opacity-60' : '';
                return (
                  <div key={idx} className={`flex items-start gap-4 rounded-xl border ${cls.border} bg-surface-dark/50 p-4 ${faded}`}>
                    <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${cls.iconBg} ${cls.iconText}`}>
                      <span className="material-symbols-outlined">{it.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h2 className={`font-bold ${it.tone === 'neutral' ? 'text-text-secondary' : 'text-text-primary'}`}>{it.title}</h2>
                      <p className="text-sm text-text-secondary">{it.text}</p>
                      {it.tag && (
                        <span className={`mt-2 inline-block text-xs font-medium ${it.tagClass}`}>{it.tag}</span>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary">{it.time}</span>
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

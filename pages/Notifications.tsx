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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4"
      onClick={() => navigate(-1)}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-glass overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white tracking-wide">Notificações</h2>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </motion.button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
              <p className="text-sm font-medium">Nenhuma notificação nova</p>
            </div>
          ) : (
            items.map((notif, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-2xl border transition-all relative overflow-hidden group bg-white/10 border-white/20 text-white shadow-sm"
              >
                <div className="flex items-start gap-3 relative z-10">
                  <div className="mt-1 h-2 w-2 rounded-full shrink-0 bg-secondary shadow-[0_0_8px_rgba(0,214,143,0.6)]" />
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1 text-white">{notif.title}</h3>
                    <p className="text-xs opacity-80 leading-relaxed">{notif.text}</p>
                    <span className="text-[10px] font-bold mt-2 block opacity-40 uppercase tracking-wider">{notif.time}</span>
                  </div>
                  <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setItems(arr => arr.filter((_, i) => i !== idx))}
                      className="text-white/30 hover:text-secondary transition-colors"
                      title="Marcar como lida"
                  >
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                  </motion.button>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shine pointer-events-none" />
              </motion.div>
            ))
          )}
        </div>
        
        {items.length > 0 && (
           <div className="p-4 border-t border-white/10 bg-white/5">
              <motion.button 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setItems([])}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                  Marcar todas como lidas
              </motion.button>
           </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Notifications;

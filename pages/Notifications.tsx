import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const items: Array<{ icon: string; title: string; text: string; tag?: string; tagClass?: string; time: string; tone: 'danger' | 'warning' | 'info' | 'neutral' }> = [
    { icon: 'priority_high', title: 'Vencimento de Fatura', text: 'Sua fatura do cartão de crédito no valor de R$ 850,00 vence amanhã.', tag: 'Urgente', tagClass: 'text-danger', time: 'Agora', tone: 'danger' },
    { icon: 'warning', title: 'Alerta de Orçamento', text: 'Você atingiu 85% do seu orçamento para a categoria "Restaurantes".', tag: 'Atenção', tagClass: 'text-warning', time: '2h atrás', tone: 'warning' },
    { icon: 'calendar_today', title: 'Lembrete de Pagamento', text: 'Lembre-se de pagar sua conta de internet. Vencimento em 3 dias.', tag: 'Lembrete', tagClass: 'text-primary-blue', time: 'Ontem', tone: 'info' },
    { icon: 'check_circle', title: 'Transferência Recebida', text: 'Você recebeu uma transferência de R$ 250,00 de Maria Silva.', time: '2 dias', tone: 'neutral' },
    { icon: 'receipt_long', title: 'Pagamento Confirmado', text: 'Seu pagamento da conta de energia foi processado com sucesso.', time: '4 dias', tone: 'neutral' },
  ];

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
            <h1 className="text-2xl font-bold text-text-primary">Central de Notificações</h1>
            <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-primary">
              <span className="material-symbols-outlined !text-3xl">close</span>
            </button>
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

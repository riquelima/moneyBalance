import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Transactions: React.FC = () => {
  const navigate = useNavigate();

  const transactions = [
    { id: 1, title: 'Almoço no Café Central', category: 'Restaurantes', amount: '- R$ 45,50', type: 'expense', date: 'Hoje', icon: 'restaurant' },
    { id: 2, title: 'Uber para o trabalho', category: 'Transporte', amount: '- R$ 22,80', type: 'expense', date: 'Hoje', icon: 'commute' },
    { id: 3, title: 'Salário Mensal', category: 'Receitas', amount: '+ R$ 2.000,00', type: 'income', date: 'Ontem', icon: 'work' },
    { id: 4, title: 'Compras no Supermercado', category: 'Mercado', amount: '- R$ 375,90', type: 'expense', date: 'Ontem', icon: 'shopping_cart' },
    { id: 5, title: 'Cinema', category: 'Lazer', amount: '- R$ 60,00', type: 'expense', date: '15 de Outubro', icon: 'theaters' },
    { id: 6, title: 'Conta de Luz', category: 'Contas', amount: '- R$ 152,40', type: 'expense', date: '15 de Outubro', icon: 'receipt_long' },
  ];

  const grouped = transactions.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {} as Record<string, typeof transactions>);

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
          <span className="material-symbols-outlined text-3xl">add_circle</span>
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
        {Object.entries(grouped).map(([date, items], groupIndex) => (
          <div key={date}>
            <h2 className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary">{date}</h2>
            {items.map((t, i) => (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 + groupIndex * 0.1 }}
                onClick={() => navigate(`/category/${t.id}`)} // Redirect to details
                className="flex items-center gap-4 px-6 py-4 hover:bg-surface-dark/30 active:bg-surface-dark/50 transition-colors cursor-pointer border-b border-surface-light/30 last:border-0"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-light text-text-primary">
                  <span className="material-symbols-outlined">{t.icon}</span>
                </div>
                <div className="flex flex-1 flex-col">
                  <p className="font-medium text-text-primary line-clamp-1">{t.title}</p>
                  <p className="text-sm text-text-secondary">{t.category}</p>
                </div>
                <p className={`font-medium ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                  {t.amount}
                </p>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Transactions;
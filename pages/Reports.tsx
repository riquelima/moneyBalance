import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Reports: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col min-h-screen p-4 pb-28 gap-8"
    >
      <header className="flex items-center justify-between sticky top-0 bg-background-dark z-10 py-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold">Relatórios</h1>
        <button className="text-primary-green font-bold text-sm bg-primary-green/10 px-3 py-1 rounded-full">Este Mês</button>
      </header>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Visão Geral das Despesas</h2>
        <div className="bg-surface-dark rounded-2xl p-6 border border-surface-light shadow-lg shadow-primary-green/5">
          <p className="text-text-secondary font-medium">Despesas por Categoria</p>
          <p className="text-3xl font-bold mt-1 text-white">R$ 2.580,00</p>
          <div className="flex items-center gap-2 mt-1 mb-6">
            <span className="text-text-secondary text-sm">Mês Atual</span>
            <span className="text-primary-green text-sm font-bold">+5.2%</span>
          </div>

          <div className="flex items-end justify-between h-40 gap-2">
            {[
                { label: 'Alim.', h: '60%' },
                { label: 'Trans.', h: '30%' },
                { label: 'Lazer', h: '20%' },
                { label: 'Moradia', h: '50%' }
            ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-2 h-full justify-end">
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: bar.h }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="w-full bg-primary-green/20 rounded-t-lg hover:bg-primary-green transition-colors cursor-pointer"
                    />
                    <span className="text-[10px] text-text-secondary font-bold uppercase">{bar.label}</span>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* Budgets */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Orçamentos</h2>
        <div className="space-y-4">
            {[
                { cat: 'Alimentação', spent: 450, total: 800, color: 'bg-primary-green' },
                { cat: 'Lazer', spent: 280, total: 300, color: 'bg-warning' },
                { cat: 'Transporte', spent: 150, total: 400, color: 'bg-primary-blue' },
            ].map((b, i) => (
                <motion.div 
                    key={b.cat}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-surface-dark rounded-xl p-4 border border-surface-light"
                >
                    <div className="flex justify-between mb-2">
                        <span className="font-semibold">{b.cat}</span>
                        <span className="text-text-secondary text-sm">R$ {b.spent} / R$ {b.total}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-light rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(b.spent / b.total) * 100}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className={`h-full ${b.color}`} 
                        />
                    </div>
                </motion.div>
            ))}
        </div>
      </section>

      {/* AI FAB */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 10 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/chat')}
        className="fixed bottom-24 right-4 h-16 w-16 rounded-full bg-primary-green text-background-dark flex items-center justify-center shadow-lg shadow-primary-green/40 z-40"
      >
        <span className="material-symbols-outlined !text-3xl">auto_awesome</span>
      </motion.button>

    </motion.div>
  );
};

export default Reports;
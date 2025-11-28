import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col p-4 pt-8 gap-6"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <motion.img 
                whileHover={{ scale: 1.1 }}
                src="https://picsum.photos/100/100" 
                alt="Profile" 
                className="h-12 w-12 rounded-full border-2 border-primary object-cover"
                onClick={() => navigate('/settings')}
            />
            <div>
                <p className="text-sm font-medium text-text-secondary">Bem-vindo(a),</p>
                <h1 className="text-xl font-bold text-text-primary">Usuário</h1>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-surface-light transition-colors">
                <span className="material-symbols-outlined text-text-secondary">notifications</span>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-background-dark"></span>
            </button>
            <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-surface-light transition-colors">
                <span className="material-symbols-outlined text-text-secondary">settings</span>
            </button>
        </div>
      </header>

      <motion.section 
        variants={itemVariants}
        className="rounded-2xl bg-surface-dark/40 p-6 border border-surface-light"
      >
        <p className="text-sm font-medium text-text-secondary mb-1">Total de Saldo</p>
        <h2 className="text-4xl font-extrabold tracking-tight text-text-primary">R$ 12.456,78</h2>
      </motion.section>

      <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
        {[
            { label: 'Entradas', value: 'R$ 5.800,00', icon: 'arrow_downward', color: 'text-success' },
            { label: 'Saídas', value: 'R$ 2.150,25', icon: 'arrow_upward', color: 'text-danger' },
            { label: 'Pendentes', value: 'R$ 345,00', icon: 'hourglass_empty', color: 'text-warning' },
            { label: 'Saldo', value: 'R$ 3.649,75', icon: 'account_balance_wallet', color: 'text-primary' },
        ].map((item, idx) => (
            <motion.div 
                key={idx}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/reports')}
                className="rounded-xl bg-surface-dark/50 p-4 border border-surface-light hover:border-text-secondary/30 transition-colors cursor-pointer"
            >
                <div className={`flex items-center gap-2 ${item.color} mb-2`}>
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <p className="text-sm font-semibold text-text-secondary">{item.label}</p>
                </div>
                <p className="text-lg font-bold text-text-primary">{item.value}</p>
            </motion.div>
        ))}
      </motion.section>

      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary">Tendências Financeiras</h3>
            <div className="flex items-center gap-1 rounded-lg bg-surface-dark p-1 border border-surface-light">
                <button className="rounded px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary">Dia</button>
                <button className="rounded px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary">Semana</button>
                <button className="rounded px-3 py-1 text-xs font-bold text-background-dark bg-primary shadow-sm">Mês</button>
            </div>
        </div>
        
        {/* Custom CSS Bar Chart simulation */}
        <div className="flex h-56 w-full flex-col justify-end rounded-xl bg-surface-dark/30 p-4 border border-surface-light relative overflow-hidden">
            <div className="flex h-full w-full items-end justify-between px-2 gap-2">
                {[40, 60, 50, 75, 85, 65, 90].map((h, i) => (
                    <motion.div 
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={`w-full rounded-t-sm ${i === 3 ? 'bg-primary shadow-metallic' : 'bg-primary/30'}`}
                    />
                ))}
            </div>
            <div className="mt-3 flex w-full justify-between border-t border-surface-light pt-2 text-xs text-text-secondary font-medium">
                <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
            </div>
        </div>
      </motion.section>
    </motion.div>
  );
};

export default Dashboard;
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: 'home', label: 'Início', path: '/' },
    { icon: 'pie_chart', label: 'Gastos', path: '/reports' },
    { icon: 'add', label: '', path: '/add-transaction', isFab: true }, // Central FAB redirects to Add Transaction page
    { icon: 'swap_horiz', label: 'Transações', path: '/transactions' },
    { icon: 'calendar_month', label: 'Agenda', path: '/calendar' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 rounded-t-2xl bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-white/20 dark:border-white/10 shadow-[0_-4px_20px_0_rgba(31,38,135,0.15)]" />
      
      <div className="relative flex items-center justify-between px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          if (item.isFab) {
             return (
                <div key={item.path + 'fab'} className="relative -top-8 mx-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(item.path)}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-xl border-4 border-white/10 dark:border-black/10 backdrop-blur-md"
                    style={{
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                    }}
                    data-onboarding="add-fab"
                    aria-label="Adicionar transação"
                  >
                    <span className="material-symbols-outlined !text-4xl">add</span>
                  </motion.button>
                </div>
             )
          }

          return (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 relative ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary/10 dark:bg-white/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className={`material-symbols-outlined text-2xl relative z-10 ${isActive ? 'fill-1' : ''}`}>
                {item.icon}
              </span>
              {isActive && <span className="text-[9px] font-bold mt-0.5 relative z-10">{item.label}</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;

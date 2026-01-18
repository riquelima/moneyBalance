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
      {/* Glassmorphism Background - Light Theme */}
      <div className="absolute inset-0 rounded-t-3xl bg-white/80 backdrop-blur-xl border-t border-white/40 shadow-[0_-4px_30px_rgba(0,0,0,0.1)]" />
      
      <div className="relative flex items-center justify-between px-4 py-2 pb-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          if (item.isFab) {
             return (
                <div key={item.path + 'fab'} className="relative -top-8 mx-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(item.path)}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg border-[6px] border-[#F3F4F6] backdrop-blur-md"
                    style={{
                        boxShadow: '0 8px 20px rgba(136, 84, 208, 0.3)',
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
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className={`material-symbols-outlined text-2xl relative z-10 ${isActive ? 'fill-1' : ''}`}>
                {item.icon}
              </span>
              {isActive && <span className="text-[10px] font-bold mt-1 relative z-10">{item.label}</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;

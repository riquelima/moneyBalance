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
    { icon: 'settings', label: 'Ajustes', path: '/settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-light bg-background-dark/95 backdrop-blur-md">
      <div className="mx-auto grid w-full grid-cols-5 items-end justify-items-center px-4 py-2 pb-4 h-20">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          if (item.isFab) {
             return (
                <motion.button
                  key={item.path + 'fab'}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate(item.path)}
                  className="flex h-14 w-14 -translate-y-4 transform items-center justify-center rounded-full border-4 border-background-dark bg-primary text-background-dark shadow-metallic"
                >
                  <span className="material-symbols-outlined !text-3xl">add</span>
                </motion.button>
             )
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <span className={`material-symbols-outlined ${isActive ? '!fill-1' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;

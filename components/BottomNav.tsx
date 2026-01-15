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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t-3 border-dark dark:border-white bg-white dark:bg-surface-dark transition-colors duration-300">
      <div className="mx-auto grid w-full grid-cols-5 items-end justify-items-center px-4 py-2 pb-4 h-20">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          if (item.isFab) {
             return (
                <motion.button
                  key={item.path + 'fab'}
                  whileTap={{ scale: 0.95, y: 0 }}
                  onClick={() => navigate(item.path)}
                  className="flex h-14 w-14 -translate-y-4 transform items-center justify-center rounded-full border-3 border-dark dark:border-white bg-primary text-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                >
                  <span className="material-symbols-outlined !text-3xl">add</span>
                </motion.button>
             )
          }

          return (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.95, y: 1 }}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary font-bold' : 'text-dark dark:text-white hover:text-primary dark:hover:text-primary'}`}
            >
              <span className={`material-symbols-outlined ${isActive ? '!fill-1' : ''} border-2 border-transparent`}>
                {item.icon}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;

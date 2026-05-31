import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'Home',
      label: 'Início',
      path: '/',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[23px] h-[23px] stroke-[1.7]">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      )
    },
    {
      id: 'Gastos',
      label: 'Gastos',
      path: '/reports',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[23px] h-[23px] stroke-[1.7]">
          <path d="M21 12a9 9 0 1 1-9-9v9h9Z" />
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
      )
    },
    {
      id: 'Add',
      label: '',
      path: '/add-transaction',
      isFab: true,
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[24px] h-[24px] stroke-[3]">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    },
    {
      id: 'Transacoes',
      label: 'Transações',
      path: '/transactions',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[23px] h-[23px] stroke-[1.7]">
          <path d="m17 3 4 4-4 4M21 7H3M7 21l-4-4 4-4M3 17h18" />
        </svg>
      )
    },
    {
      id: 'Agenda',
      label: 'Agenda',
      path: '/calendar',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[23px] h-[23px] stroke-[1.7]">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    }
  ];

  return (
    <nav
      className="fixed bottom-[9px] left-1/2 z-[50] h-[73px] w-[calc(100vw-32px)] max-w-[361px] -translate-x-1/2 grid grid-cols-5 items-center px-[17px] py-[8px] pb-[6px] rounded-[36px] transition-all duration-300"
      style={{
        background: 'var(--nav)',
        color: 'color-mix(in oklab, var(--surface), transparent 14%)',
        boxShadow: '0 18px 30px color-mix(in oklab, var(--nav), transparent 62%)'
      }}
      aria-label="Navegação principal"
    >
      {navItems.map((item) => {
        // Para a aba Início, aceitar tanto "/" quanto "/" (Dashboard)
        // Para simplificar, a verificação exata de rota ativa
        const isActive = location.pathname === item.path;

        if (item.isFab) {
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(item.path)}
              className="w-[43px] h-[43px] rounded-full grid place-items-center justify-self-center align-self-center text-[var(--nav)] transition-all duration-160 hover:-translate-y-[2px] active:scale-[0.96] cursor-pointer"
              style={{
                background: 'color-mix(in oklab, var(--surface), var(--muted) 12%)',
                boxShadow: '0 10px 22px color-mix(in oklab, var(--nav), transparent 55%)'
              }}
              data-onboarding="add-fab"
              aria-label="Adicionar transação"
            >
              {item.svg}
            </motion.button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`h-[54px] flex flex-col justify-center items-center gap-[5px] bg-transparent text-[11px] font-semibold transition-all duration-160 cursor-pointer ${
              isActive
                ? 'text-white font-bold opacity-100'
                : 'text-white/60 hover:text-white hover:-translate-y-[1px] opacity-80 hover:opacity-100'
            }`}
            data-tab={item.id}
          >
            {item.svg}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;


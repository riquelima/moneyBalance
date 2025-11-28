import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CategoryExpenses: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>('Alimentação');

  const categories = [
    { 
        id: 'Alimentação', 
        amount: 'R$ 1.250,30', 
        percent: '26%', 
        color: 'text-primary-green',
        barColor: 'bg-primary-green',
        icon: 'restaurant',
        details: [
            { label: 'Delivery', val: 'R$ 1.000,24' },
            { label: 'Mercado', val: 'R$ 125,03' },
            { label: 'Restaurante', val: 'R$ 125,03' }
        ]
    },
    { 
        id: 'Transporte', 
        amount: 'R$ 864,00', 
        percent: '18%', 
        color: 'text-primary-blue',
        barColor: 'bg-primary-blue',
        icon: 'directions_car',
        details: []
    },
    { 
        id: 'Moradia', 
        amount: 'R$ 1.680,00', 
        percent: '35%', 
        color: 'text-warning',
        barColor: 'bg-warning',
        icon: 'cottage',
        details: []
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background-dark p-4 gap-4">
      <header className="flex items-center gap-4 py-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-surface-light">
             <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10">Gastos por Categoria</h1>
      </header>
      
      <div className="flex justify-end mb-2">
         <select className="bg-surface-dark border border-surface-light rounded-lg px-3 py-1 text-sm outline-none focus:border-primary-green">
            <option>Este Mês</option>
            <option>Mês Passado</option>
         </select>
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((cat) => (
            <motion.div 
                key={cat.id}
                initial={false}
                className="bg-surface-dark rounded-2xl border border-surface-light overflow-hidden"
            >
                <button 
                    onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                    className="w-full p-4 flex flex-col gap-3"
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-surface-light flex items-center justify-center">
                                <span className={`material-symbols-outlined ${cat.color}`}>{cat.icon}</span>
                            </div>
                            <div className="text-left">
                                <p className="font-semibold">{cat.id}</p>
                                <p className="text-xs text-text-secondary">{cat.percent} do total</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">{cat.amount}</span>
                            <motion.span 
                                animate={{ rotate: expanded === cat.id ? 180 : 0 }}
                                className="material-symbols-outlined text-text-secondary"
                            >
                                expand_more
                            </motion.span>
                        </div>
                    </div>
                    <div className="w-full bg-surface-light h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${cat.barColor}`} style={{ width: cat.percent }}></div>
                    </div>
                </button>

                <AnimatePresence>
                    {expanded === cat.id && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-surface-light"
                        >
                            <div className="p-4 flex flex-col gap-4">
                                {cat.details.length > 0 ? (
                                    <>
                                        {/* Chart Placeholder */}
                                        <div className="flex items-center justify-center py-4 relative">
                                            <div className="h-40 w-40 rounded-full border-[12px] border-surface-light border-t-primary-green flex items-center justify-center relative">
                                                <div className="absolute inset-0 rounded-full border-[12px] border-transparent border-r-primary-green rotate-45"></div>
                                                <div className="text-center">
                                                    <span className="text-2xl font-bold">80%</span>
                                                    <p className="text-xs text-text-secondary">Delivery</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                            {cat.details.map((d, i) => (
                                                <div key={i} className="bg-surface-light/30 rounded-lg p-2">
                                                    <p className="text-text-secondary">{d.label}</p>
                                                    <p className="font-bold mt-1">{d.val}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <h3 className="font-bold mt-2">Transações Recentes</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-2 hover:bg-surface-light rounded-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-surface-light flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-sm">receipt</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">iFood</p>
                                                        <p className="text-xs text-text-secondary">Ontem</p>
                                                    </div>
                                                </div>
                                                <span className="text-danger text-sm font-medium">- R$ 45,90</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-center text-text-secondary text-sm py-4">Sem detalhes adicionais.</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CategoryExpenses;
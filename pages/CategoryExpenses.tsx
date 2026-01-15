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
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark p-4 gap-4 font-display">
      <header className="flex items-center gap-4 py-2 border-b-3 border-dark dark:border-white pb-4 bg-white dark:bg-surface-dark -mx-4 px-4 sticky top-0 z-50 shadow-sm">
        <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => navigate(-1)} className="rounded-sm p-2 border-2 border-dark dark:border-white hover:bg-surface-light dark:hover:bg-gray-800 shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all">
             <span className="material-symbols-outlined text-dark dark:text-white">arrow_back_ios_new</span>
        </motion.button>
        <h1 className="text-xl font-black flex-1 text-center pr-10 uppercase text-dark dark:text-white">Gastos por Categoria</h1>
      </header>
      
      <div className="flex justify-end mb-2">
         <select className="bg-white dark:bg-surface-dark border-2 border-dark dark:border-white rounded-sm px-3 py-2 text-sm font-bold uppercase outline-none focus:shadow-neo-sm dark:focus:shadow-[2px_2px_0px_0px_#ffffff] text-dark dark:text-white transition-all">
            <option>Este Mês</option>
            <option>Mês Passado</option>
         </select>
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((cat) => (
            <motion.div 
                key={cat.id}
                initial={false}
                className="bg-white dark:bg-surface-dark rounded-lg border-3 border-dark dark:border-white overflow-hidden shadow-neo dark:shadow-[4px_4px_0px_0px_#ffffff]"
            >
                <motion.button 
                    whileTap={{ scale: 0.95, y: 2 }}
                    onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                    className="w-full p-4 flex flex-col gap-3"
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-sm bg-surface-light dark:bg-background-dark border-2 border-dark dark:border-white flex items-center justify-center shadow-neo-sm dark:shadow-none">
                                <span className={`material-symbols-outlined ${cat.color}`}>{cat.icon}</span>
                            </div>
                            <div className="text-left">
                                <p className="font-black uppercase text-dark dark:text-white">{cat.id}</p>
                                <p className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">{cat.percent} do total</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-dark dark:text-white">{cat.amount}</span>
                            <motion.span 
                                animate={{ rotate: expanded === cat.id ? 180 : 0 }}
                                className="material-symbols-outlined text-dark dark:text-white"
                            >
                                expand_more
                            </motion.span>
                        </div>
                    </div>
                    <div className="w-full bg-surface-light dark:bg-background-dark h-3 rounded-none border-2 border-dark dark:border-white overflow-hidden">
                        <div className={`h-full ${cat.barColor} border-r-2 border-dark dark:border-white`} style={{ width: cat.percent }}></div>
                    </div>
                </motion.button>

                <AnimatePresence>
                    {expanded === cat.id && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t-3 border-dark dark:border-white"
                        >
                            <div className="p-4 flex flex-col gap-4 bg-surface-light/30 dark:bg-background-dark/30">
                                {cat.details.length > 0 ? (
                                    <>
                                        {/* Chart Placeholder - Neo Brutalist Style */}
                                        <div className="flex items-center justify-center py-4 relative">
                                            <div className="h-40 w-40 rounded-full border-[4px] border-dark dark:border-white flex items-center justify-center relative bg-white dark:bg-surface-dark shadow-neo dark:shadow-none">
                                                <div className="text-center z-10">
                                                    <span className="text-2xl font-black text-dark dark:text-white">80%</span>
                                                    <p className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Delivery</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                            {cat.details.map((d, i) => (
                                                <div key={i} className="bg-white dark:bg-surface-dark border-2 border-dark dark:border-white rounded-sm p-2 shadow-sm">
                                                    <p className="font-bold text-text-secondary dark:text-gray-400 uppercase">{d.label}</p>
                                                    <p className="font-black mt-1 text-dark dark:text-white">{d.val}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <h3 className="font-black uppercase text-dark dark:text-white mt-2 border-b-2 border-dark dark:border-white pb-1 inline-block w-full">Transações Recentes</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-2 bg-white dark:bg-surface-dark border-2 border-dark dark:border-white rounded-sm shadow-sm hover:translate-x-1 transition-transform">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-sm bg-surface-light dark:bg-background-dark border-2 border-dark dark:border-white flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-sm text-dark dark:text-white">receipt</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold uppercase text-dark dark:text-white">iFood</p>
                                                        <p className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Ontem</p>
                                                    </div>
                                                </div>
                                                <span className="text-danger text-sm font-black">- R$ 45,90</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-center text-text-secondary dark:text-gray-400 text-sm font-bold uppercase py-4">Sem detalhes adicionais.</p>
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

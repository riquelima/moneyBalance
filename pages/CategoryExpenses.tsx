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
    <div className="flex flex-col min-h-screen p-4 gap-4 font-display">
      <header className="flex items-center gap-4 py-2 border-b border-white/10 pb-4 backdrop-blur-xl bg-white/5 -mx-4 px-4 sticky top-0 z-50 shadow-glass">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} className="rounded-full p-2 bg-white/5 hover:bg-white/10 transition-all text-white">
             <span className="material-symbols-outlined text-white">arrow_back_ios_new</span>
        </motion.button>
        <h1 className="text-xl font-bold flex-1 text-center pr-10 text-white tracking-wide">Gastos por Categoria</h1>
      </header>
      
      <div className="flex justify-end mb-2">
         <select className="bg-white/10 border border-white/20 backdrop-blur-md rounded-xl px-4 py-2 text-sm font-bold uppercase outline-none focus:bg-white/20 text-white transition-all cursor-pointer">
            <option className="bg-[#1A1A1A]">Este Mês</option>
            <option className="bg-[#1A1A1A]">Mês Passado</option>
         </select>
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((cat) => (
            <motion.div 
                key={cat.id}
                initial={false}
                className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-glass"
            >
                <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                    className="w-full p-5 flex flex-col gap-4"
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                                <span className={`material-symbols-outlined ${cat.color}`}>{cat.icon}</span>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white text-lg">{cat.id}</p>
                                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{cat.percent} do total</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-lg">{cat.amount}</span>
                            <motion.span 
                                animate={{ rotate: expanded === cat.id ? 180 : 0 }}
                                className="material-symbols-outlined text-white/70"
                            >
                                expand_more
                            </motion.span>
                        </div>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${cat.barColor} rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]`} style={{ width: cat.percent }}></div>
                    </div>
                </motion.button>

                <AnimatePresence>
                    {expanded === cat.id && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/10"
                        >
                            <div className="p-5 flex flex-col gap-6 bg-white/5">
                                {cat.details.length > 0 ? (
                                    <>
                                        {/* Chart Placeholder - Glass Style */}
                                        <div className="flex items-center justify-center py-4 relative">
                                            <div className="h-40 w-40 rounded-full border-[6px] border-white/10 flex items-center justify-center relative bg-white/5 shadow-inner backdrop-blur-sm">
                                                <div className="text-center z-10">
                                                    <span className="text-3xl font-bold text-white block">80%</span>
                                                    <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Delivery</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                            {cat.details.map((d, i) => (
                                                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-3 shadow-sm hover:bg-white/10 transition-all">
                                                    <p className="font-bold text-white/50 uppercase text-[10px] mb-1">{d.label}</p>
                                                    <p className="font-bold text-white">{d.val}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div>
                                            <h3 className="font-bold uppercase text-white/70 text-xs tracking-widest mb-3 pl-1">Transações Recentes</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl shadow-sm hover:bg-white/10 transition-all cursor-pointer">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-sm text-white">receipt</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">iFood</p>
                                                            <p className="text-[10px] font-bold text-white/40 uppercase">Ontem</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-danger-light text-sm font-bold">- R$ 45,90</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-center text-white/40 text-sm font-bold uppercase py-4">Sem detalhes adicionais.</p>
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

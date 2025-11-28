import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [hasData, setHasData] = useState(false);
  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { setHasData(false); return; }
      const { count, error } = await supabase
        .from('user_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setHasData(!error && (count ?? 0) > 0);
    };
    load();
  }, []);

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
          {hasData ? (
            <p className="text-text-secondary">Em breve: gráficos e agregações reais por categoria.</p>
          ) : (
            <>
              <p className="text-text-secondary font-medium">Sem dados</p>
              <p className="text-3xl font-bold mt-1 text-white">R$ 0,00</p>
              <p className="mt-2 text-text-secondary">Adicione transações para visualizar seus relatórios.</p>
            </>
          )}
        </div>
      </section>

      {/* Budgets */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Orçamentos</h2>
        {hasData ? (
          <div className="rounded-xl bg-surface-dark p-4 border border-surface-light text-text-secondary">
            Em breve: criação de orçamentos por categoria.
          </div>
        ) : (
          <div className="rounded-xl bg-surface-dark p-4 border border-surface-light text-text-secondary text-center">
            Nenhum orçamento. Crie transações e categorias para começar.
          </div>
        )}
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Success: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background-dark text-text-primary p-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-32 w-32 items-center justify-center rounded-full bg-primary-blue/20"
        >
          <span className="material-symbols-outlined text-6xl text-primary-blue">check</span>
        </motion.div>
        
        <div className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 text-3xl font-bold tracking-tight text-white"
          >
            Conta Criada!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-text-secondary max-w-xs mx-auto leading-relaxed"
          >
            Sua conta foi criada com sucesso. Agora você pode fazer login usando seu nome de usuário e senha registrados.
          </motion.p>
        </div>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/login')}
        className="w-full rounded-xl bg-warning py-4 text-lg font-bold text-background-dark shadow-lg shadow-warning/20 mb-8"
      >
        Ir para o Login
      </motion.button>
    </div>
  );
};

export default Success;
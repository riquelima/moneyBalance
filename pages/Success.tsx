import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Success: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-6 font-display relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-background-dark z-0"></div>
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-20 pointer-events-none" 
           style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,214,143,0.15), transparent 70%)' }}></div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 relative z-10">
        <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-32 w-32 items-center justify-center rounded-full bg-secondary/20 border border-secondary/30 shadow-[0_0_30px_rgba(0,214,143,0.3)] backdrop-blur-md"
        >
          <span className="material-symbols-outlined text-6xl text-secondary-light">check</span>
        </motion.div>
        
        <div className="text-center max-w-sm">
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
            className="text-white/70 leading-relaxed font-medium"
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
        className="w-full max-w-sm rounded-xl bg-primary text-white py-4 text-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all mb-8 relative z-10"
      >
        Ir para o Login
      </motion.button>
    </div>
  );
};

export default Success;
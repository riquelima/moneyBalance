import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    navigate('/');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex min-h-screen w-full flex-col items-center justify-center bg-background-dark p-4 font-display"
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl bg-surface-dark/30 p-8 shadow-2xl border border-surface-light">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-background-dark text-primary shadow-metallic border border-surface-light"
        >
          <span className="material-symbols-outlined !text-5xl">trending_up</span>
        </motion.div>
        
        <h1 className="text-text-primary mb-8 text-center text-3xl font-bold leading-tight tracking-wide">
          Bem-vindo,<br/>Investidor.
        </h1>

        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-text-secondary text-sm font-medium ml-1">E-mail</label>
            <input 
              type="email" 
              placeholder="Seu e-mail seguro"
              className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-text-secondary text-sm font-medium ml-1">Senha</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Sua senha secreta"
                className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 pr-12 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-sm font-medium text-primary hover:text-primary/80 hover:underline">
              Esqueci minha senha
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-background-dark shadow-metallic hover:bg-primary/90 transition-colors"
          >
            Acessar Conta
          </motion.button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-text-secondary">
            Ainda não tem uma conta?{' '}
            <button onClick={() => navigate('/signup')} className="font-bold text-primary hover:underline">
              Criar nova conta
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Login;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, lastName, username, whatsapp }
      }
    });
    if (error) {
      setError(error.message);
      return;
    }
    if (data?.user) {
      navigate('/success');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex min-h-screen w-full flex-col bg-background-dark text-text-primary p-4"
    >
      <header className="flex items-center mb-6">
        <button onClick={() => navigate('/login')} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-light transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-xl font-bold pr-10">Criar Conta</h1>
      </header>

      <form onSubmit={handleSignup} className="flex flex-1 flex-col gap-5">
        <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary ml-1">Nome</label>
              <input 
                type="text" 
                placeholder="Insira seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 text-text-primary placeholder:text-text-secondary/50 focus:border-primary-teal focus:outline-none focus:ring-1 focus:ring-primary-teal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary ml-1">Sobrenome</label>
              <input 
                type="text" 
                placeholder="Insira seu sobrenome"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 text-text-primary placeholder:text-text-secondary/50 focus:border-primary-teal focus:outline-none focus:ring-1 focus:ring-primary-teal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary ml-1">Nome de Usuário</label>
              <input 
                type="text" 
                placeholder="Escolha um nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 text-text-primary placeholder:text-text-secondary/50 focus:border-primary-teal focus:outline-none focus:ring-1 focus:ring-primary-teal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary ml-1">Telefone</label>
              <input 
                type="tel" 
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 text-text-primary placeholder:text-text-secondary/50 focus:border-primary-teal focus:outline-none focus:ring-1 focus:ring-primary-teal"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary ml-1">E-mail</label>
              <input 
                type="email" 
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 text-text-primary placeholder:text-text-secondary/50 focus:border-primary-teal focus:outline-none focus:ring-1 focus:ring-primary-teal"
              />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary ml-1">Senha</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Crie uma senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl bg-surface-dark border border-surface-light p-4 pr-12 text-text-primary placeholder:text-text-secondary/50 focus:border-primary-teal focus:outline-none focus:ring-1 focus:ring-primary-teal"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary-teal transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility' : 'visibility_off'}
                        </span>
                    </button>
                </div>
                <p className="text-xs text-text-secondary ml-1">Mínimo 8 caracteres, 1 letra maiúscula, 1 número.</p>
            </div>
        </div>

        <div className="flex-1" />

        <div className="mt-4 flex flex-col items-center gap-4 pb-4">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full rounded-full bg-primary-teal py-4 text-lg font-bold text-background-dark shadow-lg shadow-primary-teal/20"
            >
                Cadastrar
            </motion.button>
            {error && (
              <p className="text-danger text-sm">{error}</p>
            )}
            <p className="text-sm text-text-secondary">
                Já tem uma conta?{' '}
                <button onClick={() => navigate('/login')} className="font-bold text-primary-teal hover:underline">
                    Entrar
                </button>
            </p>
        </div>
      </form>
    </motion.div>
  );
};

export default Signup;

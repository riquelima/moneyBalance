import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect x='0' y='0' width='64' height='64' rx='12' fill='#13ec5b'/><rect x='14' y='22' width='36' height='22' rx='6' fill='#8d5a3a' stroke='#2d2d2d' stroke-width='2'/><circle cx='44' cy='33' r='3' fill='#2d2d2d'/><rect x='20' y='16' width='20' height='10' rx='2' fill='#14d86a'/></svg>`;
  const fallbackLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const emailTrim = String(email).trim();
    const passTrim = String(password).trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailTrim, password: passTrim });
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('invalid login') || msg.includes('invalid_grant')) {
        const { data: created, error: signErr } = await supabase.auth.signUp({
          email: emailTrim,
          password: passTrim,
          options: { data: {} }
        });
        if (signErr) {
          setError(signErr.message);
          return;
        }
        if (created?.user) {
          const { data: after, error: afterErr } = await supabase.auth.signInWithPassword({ email: emailTrim, password: passTrim });
          if (afterErr) {
            setError(afterErr.message);
            return;
          }
          if (after?.user) {
            navigate('/');
            return;
          }
        }
      } else {
        setError(error.message);
        return;
      }
    }
    if (data?.user) {
      navigate('/');
    }
  };

  const handleReset = async () => {
    setError(null);
    const emailTrim = String(email).trim();
    if (!emailTrim) { setError('Informe seu e-mail para recuperar a senha.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, { redirectTo: window.location.origin });
    if (error) { setError(error.message); return; }
    setError('Enviamos um link de recuperação para seu e-mail.');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex min-h-screen w-full flex-col items-center justify-center bg-background-dark p-4 font-display"
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-sm bg-white p-8 shadow-neo border-3 border-dark">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mb-8 flex h-20 w-20 items-center justify-center rounded-sm bg-white shadow-neo border-2 border-dark"
        >
          <img src="https://i.imgur.com/fH0lMQq.png" alt="Money Balance" className="h-16 w-16 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackLogo; }} />
        </motion.div>
        
        <h1 
          className="text-dark mb-8 text-center text-4xl leading-tight tracking-wide font-black uppercase"
          style={{ fontFamily: '"Poetsen One", cursive' }}
        >
          Money Balance
        </h1>
        <p className="-mt-6 mb-8 text-center text-dark text-sm font-bold uppercase tracking-wider bg-accent px-2 border-2 border-dark shadow-neo-sm">
          Gestão Financeira Inteligente
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-dark text-sm font-black uppercase ml-1">E-mail</label>
            <input 
              type="email" 
              placeholder="SEU E-MAIL SEGURO"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-none bg-white border-2 border-dark p-4 text-dark placeholder:text-text-secondary/50 focus:bg-surface-light focus:outline-none focus:shadow-neo-sm shadow-none font-bold uppercase transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-dark text-sm font-black uppercase ml-1">Senha</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="SUA SENHA SECRETA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-none bg-white border-2 border-dark p-4 pr-12 text-dark placeholder:text-text-secondary/50 focus:bg-surface-light focus:outline-none focus:shadow-neo-sm shadow-none font-bold uppercase transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-dark hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={handleReset} className="text-xs font-black text-dark hover:bg-accent px-1 border-2 border-transparent hover:border-dark hover:shadow-neo-sm transition-all uppercase">
              Esqueci minha senha
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full rounded-sm bg-primary border-2 border-dark py-4 text-lg font-black text-white shadow-neo hover:bg-primary/90 active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wider"
          >
            Acessar Conta
          </motion.button>
          {error && (
            <div className="mt-2 space-y-2">
              <p className="text-danger font-bold text-sm bg-danger/10 p-2 border-2 border-danger">{error}</p>
              <button onClick={() => navigate('/settings')} className="text-xs font-bold text-dark hover:underline uppercase">
                Configurar conexão Supabase
              </button>
            </div>
          )}
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-dark font-bold">
            AINDA NÃO TEM UMA CONTA?{' '}
            <button onClick={() => navigate('/signup')} className="font-black text-primary hover:underline bg-white border-2 border-transparent hover:border-dark px-1 transition-all uppercase">
              CRIAR NOVA CONTA
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Login;

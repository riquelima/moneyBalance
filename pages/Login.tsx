import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { BiometricCapture } from '../components/BiometricCapture';
import { arrayToDescriptor, matchFace } from '../utils/faceAuth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showBiometric, setShowBiometric] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
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

  const handleBiometricLogin = async (capturedDescriptor: Float32Array) => {
    if (isVerifying) return;
    setIsVerifying(true);
    
    try {
      // Baixar descritores públicos
      const { data: biometrics, error: fetchError } = await supabase
        .from('face_biometrics')
        .select('user_id, descriptor');

      if (fetchError) throw fetchError;
      
      if (!biometrics || biometrics.length === 0) {
        setError('Nenhum dado biométrico encontrado no sistema.');
        setShowBiometric(false);
        return;
      }

      const storedDescriptors = biometrics.map(b => ({
        userId: b.user_id,
        descriptor: arrayToDescriptor(b.descriptor)
      }));

      const match = matchFace(capturedDescriptor, storedDescriptors);

      if (match) {
        // Reconhecimento bem sucedido
        // AVISO: Sem backend, não podemos gerar sessão real.
        // Vamos redirecionar, mas o dashboard pode pedir login.
        setShowBiometric(false);
        navigate('/');
      } else {
        // Não fechamos o modal imediatamente, damos chance de tentar de novo ou avisamos
        // Mas o componente BiometricCapture fica rodando.
        // Vamos apenas logar ou mostrar erro temporário?
        // Como o matchFace retorna null se não achar, o usuário continua tentando.
        // Mas o loop do componente captura pode disparar várias vezes.
        // Se falhar, vamos fechar e avisar para não ficar num loop de erro.
        setError('Rosto não reconhecido. Tente novamente ou use a senha.');
        setShowBiometric(false);
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro na validação biométrica: ' + err.message);
      setShowBiometric(false);
    } finally {
      setIsVerifying(false);
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen w-full flex-col items-center justify-center p-4 font-display relative overflow-hidden bg-gray-50"
    >
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-30 pointer-events-none" 
           style={{ background: 'radial-gradient(circle at 50% 30%, rgba(0,214,143,0.05), transparent 70%)' }}></div>
      <div className="absolute bottom-0 right-0 w-full h-full z-0 opacity-20 pointer-events-none" 
           style={{ background: 'radial-gradient(circle at 80% 80%, rgba(255,69,95,0.05), transparent 70%)' }}></div>

      {showBiometric && (
        <BiometricCapture 
          mode="login"
          onCapture={handleBiometricLogin}
          onCancel={() => setShowBiometric(false)}
          isProcessing={isVerifying}
        />
      )}

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full rounded-3xl bg-white/80 backdrop-blur-xl border border-white/40 p-8 shadow-glass-lg"
        >
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white border border-white/40 shadow-glass-sm"
            >
              <img src="https://i.imgur.com/fH0lMQq.png" alt="Money Balance" className="h-12 w-12 object-contain drop-shadow-sm" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackLogo; }} />
            </motion.div>
            
            <h1 
              className="text-gray-900 text-3xl font-bold tracking-tight mb-2 text-center"
              style={{ fontFamily: '"Poetsen One", cursive' }}
            >
              Money Balance
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest text-center">
              Gestão Financeira Inteligente
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-5">
            <div className="space-y-2">
              <label className="text-gray-500 text-xs font-bold uppercase ml-1 tracking-wider">E-mail</label>
              <input 
                type="email" 
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-gray-50 border border-gray-200 p-4 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-gray-500 text-xs font-bold uppercase ml-1 tracking-wider">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 p-4 pr-12 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </motion.button>
              </div>
            </div>

            <div className="flex justify-end">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={handleReset} className="text-xs font-medium text-gray-500 hover:text-primary transition-colors">
                Esqueci minha senha
              </motion.button>
            </div>

            <div className="space-y-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full rounded-xl bg-primary text-white py-4 text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:bg-primary/90 transition-all uppercase tracking-wider"
              >
                Acessar Conta
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowBiometric(true)}
                className="w-full rounded-xl bg-white border border-gray-200 py-4 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">face</span>
                Login Facial
              </motion.button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium text-center"
              >
                {error}
                <div className="mt-2 pt-2 border-t border-danger/10">
                  <button onClick={() => navigate('/settings')} className="underline hover:text-danger-dark transition-colors">
                    Configurar conexão
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </motion.div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Ainda não tem conta?{' '}
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/signup')} className="font-bold text-primary hover:text-primary-dark transition-colors ml-1">
              Criar agora
            </motion.button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Login;

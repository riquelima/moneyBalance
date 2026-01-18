import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { BiometricCapture } from '../components/BiometricCapture';
import { descriptorToArray } from '../utils/faceAuth';

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
  const [showBiometric, setShowBiometric] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [isSavingBiometric, setIsSavingBiometric] = useState(false);

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
      setRegisteredUserId(data.user.id);
      setShowBiometric(true);
    }
  };

  const handleBiometricCapture = async (descriptor: Float32Array) => {
    if (!registeredUserId) return;
    
    setIsSavingBiometric(true);
    try {
      const descriptorArray = descriptorToArray(descriptor);
      
      // Salvar na tabela customizada
      const { error } = await supabase
        .from('face_biometrics')
        .insert({
          user_id: registeredUserId,
          descriptor: descriptorArray
        });

      if (error) throw error;
      
      navigate('/success');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar biometria: ' + err.message);
      setIsSavingBiometric(false);
    }
  };

  const handleSkipBiometric = () => {
    navigate('/success');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen w-full flex-col items-center justify-center p-4 font-display relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-background-dark z-0"></div>
      <div className="absolute top-0 right-0 w-full h-full z-0 opacity-20 pointer-events-none" 
           style={{ background: 'radial-gradient(circle at 70% 30%, rgba(0,214,143,0.15), transparent 60%)' }}></div>
      <div className="absolute bottom-0 left-0 w-full h-full z-0 opacity-20 pointer-events-none" 
           style={{ background: 'radial-gradient(circle at 30% 70%, rgba(255,69,95,0.15), transparent 60%)' }}></div>

      {showBiometric && (
        <BiometricCapture 
          mode="enroll"
          onCapture={handleBiometricCapture}
          onCancel={handleSkipBiometric}
          isProcessing={isSavingBiometric}
        />
      )}

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex flex-col items-center mb-6">
             <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className="absolute left-6 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
             >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
             </motion.button>

            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-glass backdrop-blur-md"
            >
              <img src="https://i.imgur.com/fH0lMQq.png" alt="Money Balance" className="h-10 w-10 object-contain drop-shadow-lg" />
            </motion.div>
            
            <h1 className="text-white text-2xl font-bold tracking-tight text-center">Criar Conta</h1>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-1">Comece sua jornada financeira</p>
          </div>

          <form onSubmit={handleSignup} className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-bold uppercase ml-1 tracking-wider">Nome</label>
                  <input 
                    type="text" 
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 shadow-inner transition-all text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-bold uppercase ml-1 tracking-wider">Sobrenome</label>
                  <input 
                    type="text" 
                    placeholder="Sobrenome"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 shadow-inner transition-all text-sm"
                  />
                </div>
            </div>

            <div className="space-y-1">
              <label className="text-white/70 text-xs font-bold uppercase ml-1 tracking-wider">Nome de Usuário</label>
              <input 
                type="text" 
                placeholder="Como quer ser chamado"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 shadow-inner transition-all text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/70 text-xs font-bold uppercase ml-1 tracking-wider">Telefone (WhatsApp)</label>
              <input 
                type="tel" 
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 shadow-inner transition-all text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/70 text-xs font-bold uppercase ml-1 tracking-wider">E-mail</label>
              <input 
                type="email" 
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 shadow-inner transition-all text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/70 text-xs font-bold uppercase ml-1 tracking-wider">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Mín. 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3 pr-10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 shadow-inner transition-all text-sm"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </motion.button>
              </div>
              <p className="text-[10px] font-medium text-white/40 ml-1 uppercase">Mínimo 8 caracteres, 1 maiúscula, 1 número.</p>
            </div>

            <div className="space-y-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full rounded-xl bg-secondary text-white py-4 text-sm font-bold shadow-lg shadow-secondary/25 hover:shadow-secondary/40 hover:bg-secondary/90 transition-all uppercase tracking-wider"
              >
                Criar Conta
              </motion.button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger-light text-xs font-medium text-center"
              >
                {error}
              </motion.div>
            )}
          </form>
        </motion.div>

        <div className="mt-8 text-center pb-8">
          <p className="text-sm text-white/50 font-medium">
            Já tem uma conta?{' '}
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/login')} className="font-bold text-white hover:text-primary transition-colors ml-1">
              Fazer login
            </motion.button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Signup;

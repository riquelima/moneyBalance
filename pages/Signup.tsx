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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex min-h-screen w-full flex-col bg-white text-dark p-4"
    >
      {showBiometric && (
        <BiometricCapture 
          mode="enroll"
          onCapture={handleBiometricCapture}
          onCancel={handleSkipBiometric}
          isProcessing={isSavingBiometric}
        />
      )}

      <header className="flex items-center mb-6">
        <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => navigate('/login')} className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-dark hover:bg-surface-light transition-all active:translate-y-[2px] shadow-neo-sm active:shadow-none">
          <span className="material-symbols-outlined">arrow_back</span>
        </motion.button>
        <h1 className="flex-1 text-center text-2xl font-black uppercase pr-10">Criar Conta</h1>
      </header>

      <form onSubmit={handleSignup} className="flex flex-1 flex-col gap-5">
        <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-black uppercase text-dark ml-1">Nome</label>
              <input 
                type="text" 
                placeholder="INSIRA SEU NOME"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-none bg-white border-2 border-dark p-4 text-dark placeholder:text-text-secondary/50 focus:bg-surface-light focus:outline-none focus:shadow-neo-sm shadow-none font-bold uppercase transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black uppercase text-dark ml-1">Sobrenome</label>
              <input 
                type="text" 
                placeholder="INSIRA SEU SOBRENOME"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-none bg-white border-2 border-dark p-4 text-dark placeholder:text-text-secondary/50 focus:bg-surface-light focus:outline-none focus:shadow-neo-sm shadow-none font-bold uppercase transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black uppercase text-dark ml-1">Nome de Usuário</label>
              <input 
                type="text" 
                placeholder="ESCOLHA UM NOME DE USUÁRIO"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-none bg-white border-2 border-dark p-4 text-dark placeholder:text-text-secondary/50 focus:bg-surface-light focus:outline-none focus:shadow-neo-sm shadow-none font-bold uppercase transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black uppercase text-dark ml-1">Telefone</label>
              <input 
                type="tel" 
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-none bg-white border-2 border-dark p-4 text-dark placeholder:text-text-secondary/50 focus:bg-surface-light focus:outline-none focus:shadow-neo-sm shadow-none font-bold uppercase transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black uppercase text-dark ml-1">E-mail</label>
              <input 
                type="email" 
                placeholder="SEU E-MAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-none bg-white border-2 border-dark p-4 text-dark placeholder:text-text-secondary/50 focus:bg-surface-light focus:outline-none focus:shadow-neo-sm shadow-none font-bold uppercase transition-all"
              />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-black uppercase text-dark ml-1">Senha</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="CRIE UMA SENHA"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-none bg-white border-2 border-dark p-4 pr-12 text-dark placeholder:text-text-secondary/50 focus:bg-surface-light focus:outline-none focus:shadow-neo-sm shadow-none font-bold uppercase transition-all"
                    />
                    <motion.button
                        whileTap={{ scale: 0.95, y: 2 }}
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-dark hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility' : 'visibility_off'}
                        </span>
                    </motion.button>
                </div>
                <p className="text-xs font-bold text-text-secondary ml-1 uppercase">Mínimo 8 caracteres, 1 letra maiúscula, 1 número.</p>
            </div>
        </div>

        <div className="flex-1" />

        <div className="mt-4 flex flex-col items-center gap-4 pb-4">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95, y: 2 }}
                type="submit"
                className="w-full rounded-sm bg-secondary border-2 border-dark py-4 text-lg font-black text-white shadow-neo hover:bg-secondary/90 active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-wider"
            >
                Cadastrar
            </motion.button>
            {error && (
              <p className="text-danger font-bold text-sm bg-danger/10 p-2 border-2 border-danger w-full text-center">{error}</p>
            )}
            <p className="text-sm text-dark font-bold uppercase">
                Já tem uma conta?{' '}
                <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => navigate('/login')} className="font-black text-secondary hover:underline bg-white border-2 border-transparent hover:border-dark px-1 transition-all">
                    ENTRAR
                </motion.button>
            </p>
        </div>
      </form>
    </motion.div>
  );
};

export default Signup;

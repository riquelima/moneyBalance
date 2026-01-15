import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase, supabaseUrl, supabaseAnon } from '../supabaseClient';
import { BiometricCapture } from '../components/BiometricCapture';
import { descriptorToArray } from '../utils/faceAuth';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ name: string; lastName: string; email: string; avatarUrl: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [supabaseUrlState, setSupabaseUrl] = useState<string>('');
  const [supabaseAnonState, setSupabaseAnon] = useState<string>('');
  const [isDark, setIsDark] = useState(true);
  
  // Biometric States
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [showBiometricCapture, setShowBiometricCapture] = useState(false);
  const [isBiometricProcessing, setIsBiometricProcessing] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Load Theme
      const savedTheme = localStorage.getItem('theme');
      // Default is light unless explicitly set to 'dark'
      const isDarkTheme = savedTheme === 'dark';
      setIsDark(isDarkTheme);
      if (isDarkTheme) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      // Check Biometrics
      const { count } = await supabase
        .from('face_biometrics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (mounted) {
        setHasBiometrics(!!count && count > 0);
      }

      const email = user.email || '';
      const metaName = (user.user_metadata?.name as string) || '';
      const metaLast = (user.user_metadata?.lastName as string) || '';
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      let name = metaName;
      let lastName = metaLast;
      if (!name && prof?.display_name) {
        const parts = String(prof.display_name).split(' ');
        name = parts[0] || '';
        lastName = parts.slice(1).join(' ');
      }
      if (mounted) {
        setProfile({ name: name || email.split('@')[0], lastName: lastName || '', email, avatarUrl: (prof as any)?.avatar_url || 'https://picsum.photos/100/100' });
      }
    };
    load();
    const u = window.localStorage.getItem('SUPABASE_URL') || '';
    const k = window.localStorage.getItem('SUPABASE_ANON_KEY') || '';
    setSupabaseUrl(u || supabaseUrlState);
    setSupabaseAnon(k || supabaseAnonState);
    
    return () => { mounted = false; };
  }, []);

  const toggleTheme = () => {
    const newVal = !isDark;
    setIsDark(newVal);
    if (newVal) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleBiometricToggle = async () => {
    setBiometricError(null);
    if (hasBiometrics) {
      // Remove biometrics
      const confirmRemove = window.confirm('Deseja remover sua biometria facial? Você precisará cadastrar novamente para usar o login facial.');
      if (!confirmRemove) return;

      setIsBiometricProcessing(true);
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { error } = await supabase
          .from('face_biometrics')
          .delete()
          .eq('user_id', userData.user.id);
        
        if (!error) {
          setHasBiometrics(false);
        } else {
          setBiometricError('Erro ao remover biometria.');
        }
      }
      setIsBiometricProcessing(false);
    } else {
      // Start enrollment
      setShowBiometricCapture(true);
    }
  };

  const handleBiometricEnroll = async (descriptor: Float32Array) => {
    setIsBiometricProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Usuário não autenticado');

      const descriptorArray = descriptorToArray(descriptor);
      
      const { error } = await supabase
        .from('face_biometrics')
        .insert({
          user_id: userData.user.id,
          descriptor: descriptorArray
        });

      if (error) throw error;
      
      setHasBiometrics(true);
      setShowBiometricCapture(false);
    } catch (err: any) {
      console.error(err);
      setBiometricError('Erro ao salvar biometria: ' + err.message);
    } finally {
      setIsBiometricProcessing(false);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <h2 className="px-1 pt-6 pb-2 text-base font-black text-dark dark:text-white uppercase tracking-wider transform -rotate-1 w-fit bg-white dark:bg-dark border-2 border-dark dark:border-white px-3 py-1 shadow-neo-sm dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-3">{title}</h2>
  );

  const SettingItem = ({ icon, label, sub, trailing, color = 'bg-primary text-white', onClick }: any) => (
    <motion.button 
        whileHover={{ translate: "2px 2px", boxShadow: "0px 0px 0px 0px #000" }}
        whileTap={{ scale: 0.98, translate: "4px 4px", boxShadow: "0px 0px 0px 0px #000" }}
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-4 bg-white dark:bg-dark border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none transition-all mb-3 group"
    >
        <div className="flex items-center gap-4">
            <div className={`h-12 w-12 border-2 border-dark dark:border-white flex items-center justify-center ${color} shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all`}>
                <span className="material-symbols-outlined font-black">{icon}</span>
            </div>
            <div className="text-left">
                <p className="font-black text-dark dark:text-white uppercase text-sm">{label}</p>
                {sub && <p className="text-xs font-bold text-text-secondary uppercase">{sub}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {trailing}
            <div className="bg-dark dark:bg-white text-white dark:text-dark p-1 border-2 border-dark dark:border-white group-hover:bg-white dark:group-hover:bg-dark group-hover:text-dark dark:group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </div>
        </div>
    </motion.button>
  );

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col min-h-screen pb-24 bg-background-light dark:bg-background-dark text-dark dark:text-white font-display transition-colors duration-300"
    >
      <header className="flex items-center gap-4 p-4 sticky top-0 bg-white dark:bg-dark z-50 border-b-3 border-dark dark:border-white shadow-sm transition-colors duration-300">
         <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => navigate(-1)} className="p-2 border-2 border-dark dark:border-white bg-white dark:bg-dark shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:bg-surface-light dark:active:bg-white/10">
             <span className="material-symbols-outlined text-dark dark:text-white">arrow_back</span>
        </motion.button>
        <h1 className="text-xl font-black uppercase tracking-widest text-dark dark:text-white">Configurações</h1>
      </header>

      {showBiometricCapture && (
        <BiometricCapture 
          mode="enroll"
          onCapture={handleBiometricEnroll}
          onCancel={() => setShowBiometricCapture(false)}
          isProcessing={isBiometricProcessing}
        />
      )}

      <div className="px-4 pt-4">
        <SectionHeader title="Conta" />
        <div className="flex flex-col gap-3">
             <div className="flex items-center gap-4 p-4 bg-white dark:bg-dark border-3 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-2 transition-colors duration-300">
                <motion.button
                  whileTap={{ scale: 0.95, y: 2 }}
                  onClick={() => fileRef.current?.click()}
                  className="h-16 w-16 border-3 border-dark dark:border-white bg-surface-light dark:bg-white/10 overflow-hidden shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all relative group"
                  title="Alterar foto"
                >
                  <img src={profile?.avatarUrl || 'https://picsum.photos/100/100'} alt="Avatar" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white">edit</span>
                  </div>
                </motion.button>
                <input 
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const { data: userData } = await supabase.auth.getUser();
                    const user = userData?.user;
                    if (!user) return;
                    const ext = file.name.split('.').pop() || 'jpg';
                    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
                    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
                    if (upErr) return;
                    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
                    const url = pub?.publicUrl || '';
                    const { error: profErr } = await supabase
                      .from('user_profiles')
                      .upsert({ id: user.id, avatar_url: url }, { onConflict: 'id' });
                    if (profErr) return;
                    setProfile((p) => p ? { ...p, avatarUrl: url } : p);
                  }}
                />
                <div className="flex-1">
                  <p className="font-black text-lg text-dark dark:text-white uppercase">{[profile?.name, profile?.lastName].filter(Boolean).join(' ') || 'USUÁRIO'}</p>
                  <p className="text-xs font-bold text-text-secondary bg-surface-light dark:bg-white/10 px-2 py-1 border border-dark dark:border-white w-fit mt-1">{profile?.email || ''}</p>
                </div>
             </div>
             <SettingItem icon="person" label="Dados Pessoais" color="bg-secondary text-white" />
        </div>

        <SectionHeader title="Segurança" />
        <div className="flex flex-col">
            <SettingItem icon="lock_reset" label="Alterar Senha" color="bg-accent text-dark" />
            <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={handleBiometricToggle}
                className="w-full flex items-center justify-between px-4 py-4 bg-white dark:bg-dark border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none transition-all mb-3 group cursor-pointer"
            >
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 border-2 border-dark dark:border-white flex items-center justify-center bg-primary text-white shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
                        <span className="material-symbols-outlined font-black">fingerprint</span>
                    </div>
                    <div>
                        <p className="font-black text-dark dark:text-white uppercase text-sm">Biometria</p>
                        {biometricError && <p className="text-xs text-danger font-bold">{biometricError}</p>}
                        {isBiometricProcessing && <p className="text-xs text-primary font-bold animate-pulse">Processando...</p>}
                    </div>
                </div>
                <div className="relative inline-flex items-center cursor-pointer p-1">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={hasBiometrics} 
                        readOnly 
                    />
                    <div className="w-12 h-7 bg-surface-light dark:bg-white/10 peer-focus:outline-none border-2 border-dark dark:border-white peer peer-checked:after:translate-x-full peer-checked:after:border-dark dark:peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[6px] after:bg-dark dark:after:bg-white after:border-dark dark:after:border-white after:border-2 after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                </div>
            </motion.div>
            <SettingItem icon="shield_lock" label="Privacidade" color="bg-dark text-white dark:bg-white dark:text-dark" />
        </div>

        <SectionHeader title="Geral" />
        <div className="flex flex-col">
            <SettingItem icon="notifications" label="Notificações" color="bg-secondary text-white" />
            <div className="w-full flex items-center justify-between px-4 py-4 bg-white dark:bg-dark border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none transition-all mb-3 group cursor-pointer" onClick={toggleTheme}>
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 border-2 border-dark dark:border-white flex items-center justify-center bg-accent text-dark shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
                        <span className="material-symbols-outlined font-black">{isDark ? 'dark_mode' : 'light_mode'}</span>
                    </div>
                    <div className="text-left">
                        <p className="font-black text-dark dark:text-white uppercase text-sm">Aparência</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-dark dark:text-white bg-surface-light dark:bg-white/10 border-2 border-dark dark:border-white px-2 py-1 uppercase">{isDark ? 'Escuro' : 'Claro'}</span>
                    <div className={`relative inline-flex items-center h-7 w-12 transition-colors duration-200 focus:outline-none border-2 border-dark dark:border-white ${isDark ? 'bg-primary' : 'bg-surface-light dark:bg-white/10'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-dark dark:bg-white border-2 border-transparent transition duration-200 ease-in-out ${isDark ? 'translate-x-[22px] bg-white dark:bg-dark' : 'translate-x-[2px]'}`} />
                    </div>
                </div>
            </div>
            <SettingItem icon="paid" label="Moeda" trailing={<span className="text-xs font-bold text-dark dark:text-white bg-accent border-2 border-dark dark:border-white px-2 py-1 uppercase">BRL</span>} color="bg-primary text-white" />
        </div>

      <div className="mt-8 px-4">
          <motion.button 
              whileTap={{ scale: 0.95, y: 2 }}
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-danger text-white font-black uppercase border-2 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
          >
              <span className="material-symbols-outlined">logout</span>
              Sair
          </motion.button>
          <p className="text-center text-xs font-bold text-dark dark:text-white uppercase mt-4 bg-white dark:bg-dark border-2 border-dark dark:border-white w-fit mx-auto px-2 py-1 shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transform rotate-2">Versão 1.0.0</p>
      </div>
      </div>
    </motion.div>
  );
};

export default Settings;

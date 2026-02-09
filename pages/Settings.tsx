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

  // Biometric States
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [showBiometricCapture, setShowBiometricCapture] = useState(false);
  const [isBiometricProcessing, setIsBiometricProcessing] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Force Light Mode
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');

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
    <h2 className="px-4 pt-6 pb-2 text-sm font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">{title}</h2>
  );

  const SettingItem = ({ icon, label, sub, trailing, color = 'bg-primary text-white', onClick }: any) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-4 bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 backdrop-blur-md hover:bg-white/80 dark:hover:bg-white/10 transition-all mb-3 group rounded-2xl shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${color} shadow-lg`}>
          <span className="material-symbols-outlined font-bold text-[20px]">{icon}</span>
        </div>
        <div className="text-left">
          <p className="font-bold text-text-primary dark:text-white text-sm">{label}</p>
          {sub && <p className="text-xs font-medium text-text-secondary dark:text-gray-400">{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        <div className="text-gray-400 dark:text-gray-500 group-hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">chevron_right</span>
        </div>
      </div>
    </motion.button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen pb-24 text-text-primary dark:text-white font-display transition-colors duration-300"
    >
      <header className="flex items-center gap-4 p-4 sticky top-0 bg-white/80 dark:bg-black/60 z-50 border-b border-white/20 backdrop-blur-xl shadow-glass-sm transition-colors duration-300">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-all border border-white/20">
          <span className="material-symbols-outlined text-text-primary dark:text-white">arrow_back</span>
        </motion.button>
        <h1 className="text-lg font-bold text-text-primary dark:text-white">Configurações</h1>
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
          <div className="flex items-center gap-4 p-4 bg-white/60 border border-white/20 rounded-3xl backdrop-blur-md shadow-glass-sm mb-2 transition-colors duration-300">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fileRef.current?.click()}
              className="h-16 w-16 rounded-full border-2 border-white/50 overflow-hidden shadow-lg relative group"
              title="Alterar foto"
            >
              <img src={profile?.avatarUrl || 'https://picsum.photos/100/100'} alt="Avatar" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-sm">edit</span>
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
              <p className="font-bold text-lg text-gray-900">{[profile?.name, profile?.lastName].filter(Boolean).join(' ') || 'USUÁRIO'}</p>
              <p className="text-xs font-medium text-gray-500 bg-black/5 px-2 py-1 rounded-md w-fit mt-1">{profile?.email || ''}</p>
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
            className="w-full flex items-center justify-between px-4 py-4 bg-white/60 border border-white/20 backdrop-blur-md hover:bg-white/80 transition-all mb-3 group rounded-2xl shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary text-white shadow-lg">
                <span className="material-symbols-outlined font-bold text-[20px]">fingerprint</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Biometria</p>
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[6px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </div>
          </motion.div>
          <SettingItem icon="shield_lock" label="Privacidade" color="bg-gray-900 text-white" />
        </div>

        <SectionHeader title="Geral" />
        <div className="flex flex-col">
          <SettingItem icon="notifications" label="Notificações" color="bg-secondary text-white" />
          <SettingItem icon="paid" label="Moeda" trailing={<span className="text-xs font-bold text-gray-900 bg-accent/20 border border-accent/30 rounded-md px-2 py-1 uppercase">BRL</span>} color="bg-primary text-white" />
        </div>

        <div className="mt-8 px-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-danger/10 text-danger font-bold rounded-2xl border border-danger/20 hover:bg-danger/20 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">logout</span>
            Sair
          </motion.button>
          <p className="text-center text-xs font-medium text-gray-500 mt-6 opacity-60">Versão 1.0.0</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;

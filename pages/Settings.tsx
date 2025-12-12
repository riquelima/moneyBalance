import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase, supabaseUrl, supabaseAnon } from '../supabaseClient';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ name: string; lastName: string; email: string; avatarUrl: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseAnon, setSupabaseAnon] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
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
      setProfile({ name: name || email.split('@')[0], lastName: lastName || '', email, avatarUrl: (prof as any)?.avatar_url || 'https://picsum.photos/100/100' });
    };
    load();
    const u = window.localStorage.getItem('SUPABASE_URL') || '';
    const k = window.localStorage.getItem('SUPABASE_ANON_KEY') || '';
    setSupabaseUrl(u || supabaseUrl);
    setSupabaseAnon(k || supabaseAnon);
  }, []);

  const SectionHeader = ({ title }: { title: string }) => (
    <h2 className="px-4 pt-6 pb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">{title}</h2>
  );

  const SettingItem = ({ icon, label, sub, trailing, color = 'text-primary-teal' }: any) => (
    <motion.button 
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between px-4 py-4 bg-surface-dark border-b border-surface-light last:border-0 first:rounded-t-xl last:rounded-b-xl hover:bg-surface-light/10 transition-colors"
    >
        <div className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-lg bg-surface-light flex items-center justify-center ${color}`}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div className="text-left">
                <p className="font-medium text-text-primary">{label}</p>
                {sub && <p className="text-xs text-text-secondary">{sub}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {trailing}
            <span className="material-symbols-outlined text-text-secondary">chevron_right</span>
        </div>
    </motion.button>
  );

  return (
    <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col min-h-screen pb-24"
    >
      <header className="flex items-center gap-4 p-4 sticky top-0 bg-background-dark z-10 border-b border-surface-light">
         <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-surface-light">
             <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold">Configurações</h1>
      </header>

      <div className="px-4">
        <SectionHeader title="Conta" />
        <div className="flex flex-col rounded-xl overflow-hidden border border-surface-light">
             <div className="flex items-center gap-4 p-4 bg-surface-dark">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full overflow-hidden h-14 w-14 border border-surface-light"
                  title="Alterar foto"
                >
                  <img src={profile?.avatarUrl || 'https://picsum.photos/100/100'} alt="Avatar" className="h-14 w-14 object-cover" />
                </button>
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
                <div>
                    <p className="font-bold">{[profile?.name, profile?.lastName].filter(Boolean).join(' ') || 'Usuário'}</p>
                    <p className="text-sm text-text-secondary">{profile?.email || ''}</p>
                </div>
             </div>
        </div>

        <SectionHeader title="Segurança" />
        <div className="flex flex-col rounded-xl overflow-hidden border border-surface-light">
            <SettingItem icon="lock_reset" label="Alterar Senha" />
            <div className="w-full flex items-center justify-between px-4 py-4 bg-surface-dark border-b border-surface-light hover:bg-surface-light/10 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-surface-light flex items-center justify-center text-primary-teal">
                        <span className="material-symbols-outlined">fingerprint</span>
                    </div>
                    <p className="font-medium text-text-primary">Biometria</p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-teal"></div>
                </div>
            </div>
            <SettingItem icon="shield_lock" label="Privacidade" />
        </div>

        <SectionHeader title="Geral" />
        <div className="flex flex-col rounded-xl overflow-hidden border border-surface-light">
            <SettingItem icon="notifications" label="Notificações" />
            <SettingItem icon="dark_mode" label="Aparência" trailing={<span className="text-sm text-text-secondary">Escuro</span>} />
            <SettingItem icon="paid" label="Moeda" trailing={<span className="text-sm text-text-secondary">BRL</span>} />
        </div>

        <SectionHeader title="Conexão Supabase" />
        <div className="flex flex-col gap-3 rounded-xl border border-surface-light bg-surface-dark p-4 mx-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary ml-1">URL do Projeto</p>
            <input
              type="text"
              placeholder="https://xxxx.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full rounded-xl bg-surface-dark border border-surface-light p-3 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary ml-1">Anon Key (API)</p>
            <input
              type="password"
              placeholder="supabase anon key"
              value={supabaseAnon}
              onChange={(e) => setSupabaseAnon(e.target.value)}
              className="w-full rounded-xl bg-surface-dark border border-surface-light p-3 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                window.localStorage.setItem('SUPABASE_URL', supabaseUrl);
                window.localStorage.setItem('SUPABASE_ANON_KEY', supabaseAnon);
                (globalThis as any).__SUPABASE_URL = supabaseUrl;
                (globalThis as any).__SUPABASE_ANON_KEY = supabaseAnon;
                window.location.reload();
              }}
              className="flex-1 rounded-xl bg-primary-teal py-3 text-sm font-bold text-background-dark"
            >
              Salvar e Reiniciar
            </button>
            <button
              onClick={() => {
                window.localStorage.removeItem('SUPABASE_URL');
                window.localStorage.removeItem('SUPABASE_ANON_KEY');
                setSupabaseUrl('');
                setSupabaseAnon('');
              }}
              className="flex-1 rounded-xl bg-surface-light py-3 text-sm font-bold text-text-secondary"
            >
              Limpar
            </button>
          </div>
          <p className="text-xs text-text-secondary">As credenciais ficam salvas apenas neste dispositivo.</p>
        </div>

      <div className="mt-8 px-4">
          <button 
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl bg-surface-light text-danger font-semibold hover:bg-surface-light/80 transition-colors"
          >
              Sair
          </button>
          <p className="text-center text-xs text-text-secondary mt-4">Versão 1.0.0</p>
      </div>
      </div>
    </motion.div>
  );
};

export default Settings;

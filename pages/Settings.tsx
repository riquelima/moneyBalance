import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Settings: React.FC = () => {
  const navigate = useNavigate();

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
             <div className="flex items-center gap-4 p-4 bg-surface-dark border-b border-surface-light">
                <img src="https://picsum.photos/100/100" alt="Avatar" className="h-14 w-14 rounded-full" />
                <div>
                    <p className="font-bold">João Silva</p>
                    <p className="text-sm text-text-secondary">joao.silva@email.com</p>
                </div>
             </div>
             <SettingItem icon="workspace_premium" label="Gerenciar Assinatura" />
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
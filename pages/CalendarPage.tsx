import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import CalendarView from '../components/calendar/CalendarView';
import Header from '../components/common/Header';

const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const fetchAvatar = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Carregar avatar do perfil do cache local ou banco
      try {
        const cached = localStorage.getItem(`dashboard_cache_profile_${userData.user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.data?.avatarUrl) {
            if (mounted) setAvatarUrl(parsed.data.avatarUrl);
          }
        } else {
          const { data: prof } = await supabase.from('user_profiles').select('avatar_url').eq('id', userData.user.id).maybeSingle();
          if (prof?.avatar_url && mounted) {
            setAvatarUrl(prof.avatar_url);
          }
        }
      } catch (e) { /* ignore */ }
    };
    fetchAvatar();
    return () => { mounted = false; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen p-4 pb-24 gap-6 font-display text-gray-900 dark:text-white"
    >
      <Header
        title={
          <div className="flex flex-col items-center gap-1 py-0.5 w-full">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none select-none">Agenda</h1>
          </div>
        }
        className="!pt-4 !pb-1.5"
        leftAction={
          avatarUrl ? (
            <motion.img
              whileTap={{ scale: 0.95 }}
              src={avatarUrl}
              alt="Profile"
              className="h-10 w-10 rounded-full border border-white/40 shadow-sm object-cover cursor-pointer hover:opacity-80 transition-all"
              onClick={() => navigate('/settings')}
            />
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-white/40 shadow-sm transition-all text-gray-700"
              onClick={() => navigate('/settings')}
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </motion.button>
          )
        }
        rightAction={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-white/40 shadow-sm backdrop-blur-md transition-all text-gray-700"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-white"></span>
          </motion.button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>
    </motion.div>
  );
};

export default CalendarPage;

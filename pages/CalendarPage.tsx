import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import CalendarView from '../components/calendar/CalendarView';
import Header from '../components/common/Header';

const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Sincroniza a data da agenda quando o seletor do mês/ano mudar
  useEffect(() => {
    setCurrentDate(new Date(selectedYear, selectedMonth, 1));
    setTempYear(selectedYear);
  }, [selectedMonth, selectedYear]);

  // Sincroniza o seletor quando a currentDate mudar externamente (por exemplo, ao clicar em "ir para hoje" ou navegação interna do calendario)
  useEffect(() => {
    setSelectedMonth(currentDate.getMonth());
    setSelectedYear(currentDate.getFullYear());
  }, [currentDate]);

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
            
            {/* Filtro global 'Este Mês' no centro do header, abaixo do título */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMonthPicker(s => !s)}
              className="h-7 px-2 border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm backdrop-blur-md select-none mt-1"
            >
              <span className="material-symbols-outlined !text-[11px] leading-none">calendar_month</span>
              <span className="leading-none">
                {selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() 
                  ? 'Este Mês' 
                  : `${monthNames[selectedMonth]} ${selectedYear}`}
              </span>
            </motion.button>
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

      {/* Bottom Sheet de Seleção de Mês - Painel Arrastável com AnimatePresence */}
      <AnimatePresence>
        {showMonthPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMonthPicker(false)}
          >
            {/* Painel com animação Spring elástica e suporte a arrastar para fechar (drag="y") */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 250 }}
              dragElastic={{ top: 0.05, bottom: 0.6 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 120) {
                  setShowMonthPicker(false);
                }
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 210 }}
              className="w-full max-w-md bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl p-6 rounded-t-[2.5rem] border-t border-white/40 dark:border-white/10 shadow-glass-lg relative flex flex-col gap-4 select-none cursor-grab active:cursor-grabbing text-gray-900 dark:text-white"
              onClick={(e) => e.stopPropagation()} // Impede fechamento ao clicar no painel
            >
              {/* Indicador visual de pílula arrastável */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-2" />

              {/* Cabeçalho do seletor de Ano */}
              <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTempYear(y => y - 1)}
                  className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-all flex items-center justify-center border border-transparent active:border-black/10 dark:active:border-white/10"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </motion.button>
                
                <div className="px-6">
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{tempYear}</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTempYear(y => y + 1)}
                  className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-all flex items-center justify-center border border-transparent active:border-black/10 dark:active:border-white/10"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </motion.button>
              </div>

              {/* Seletor rápido de anos (Últimos 3 Anos) */}
              <div className="grid grid-cols-3 gap-2">
                {[tempYear - 2, tempYear - 1, tempYear].map((y) => (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={y}
                    onClick={() => setTempYear(y)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${y === tempYear ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
                  >
                    {y}
                  </motion.button>
                ))}
              </div>

              {/* Grade de meses (Botões grandes e confortáveis) */}
              <div className="grid grid-cols-4 gap-2">
                {monthNames.map((m, idx) => (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={m}
                    onClick={() => { 
                      setSelectedMonth(idx); 
                      setSelectedYear(tempYear);
                      setShowMonthPicker(false); 
                    }}
                    className={`px-2 py-3.5 rounded-xl text-xs font-black uppercase transition-all ${idx === selectedMonth && tempYear === selectedYear ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>

              {/* Botões de Ação na Base */}
              <div className="flex gap-3 mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { 
                    const d = new Date(); 
                    setSelectedYear(d.getFullYear()); 
                    setSelectedMonth(d.getMonth()); 
                    setShowMonthPicker(false); 
                  }}
                  className="flex-1 rounded-2xl bg-black/5 dark:bg-white/5 py-3.5 text-xs font-black uppercase text-gray-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5"
                >
                  Mês Atual
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMonthPicker(false)}
                  className="flex-1 rounded-2xl bg-primary py-3.5 text-xs font-black uppercase text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
                >
                  Fechar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CalendarPage;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
      className="cal-page-container min-h-screen pb-28 flex flex-col"
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Orbitron:wght@400;500;600;700&display=swap');

        :root {
          --cal-bg: #f5f6fa;
          --cal-surface: #ffffff;
          --cal-border: #f0f1f5;
          --cal-fg: #111111;
          --cal-muted: #aaaaaa;
          --cal-accent: #8854D0;
          --cal-success: #2e9e44;
          --cal-danger: #ff6b6b;
          --cal-header-bg: #ffffff;
        }

        .dark {
          --cal-bg: #0c0c0e;
          --cal-surface: #1c1c1e;
          --cal-border: #2c2c2e;
          --cal-fg: #ffffff;
          --cal-muted: #777777;
          --cal-accent: #8854D0;
          --cal-success: #40c057;
          --cal-danger: #ff6b6b;
          --cal-header-bg: #1c1c1e;
        }

        .cal-page-container {
          background-color: var(--cal-bg);
          font-family: 'Poppins', sans-serif !important;
          color: var(--cal-fg);
        }

        .cal-page-container *:not(.material-symbols-outlined) {
          font-family: 'Poppins', sans-serif !important;
        }

        /* Header */
        .cal-header {
          background: var(--cal-header-bg);
          padding: 16px 20px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          border-bottom: 1px solid var(--cal-border);
        }

        .cal-header h1 {
          font-size: 17px;
          font-weight: 600;
          color: var(--cal-fg);
          letter-spacing: -0.2px;
          margin: 0;
        }

        .cal-header-left {
          display: flex;
          align-items: center;
          min-width: 44px;
        }

        .cal-header-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
        }

        .cal-header-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-width: 44px;
        }

        /* Pílula de Data */
        .cal-period-btn {
          height: 24px;
          padding: 0 10px;
          border: 1px solid var(--cal-border);
          background: var(--cal-bg);
          border-radius: 12px;
          color: var(--cal-fg);
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        
        .cal-period-btn:hover {
          background: var(--cal-border);
        }

        .cal-profile-btn {
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cal-profile-img {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1.5px solid var(--cal-border);
          object-fit: cover;
          transition: opacity 0.2s;
        }
        .cal-profile-img:hover {
          opacity: 0.8;
        }

        .cal-profile-placeholder {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--cal-border);
          color: var(--cal-fg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid var(--cal-border);
          transition: all 0.2s;
        }
        .cal-profile-placeholder:hover {
          background: var(--cal-bg);
        }

        .cal-notif-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--cal-fg);
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: background 0.2s;
        }
        .cal-notif-btn:hover {
          background: var(--cal-border);
        }
        .cal-notif-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 6px;
          height: 6px;
          background: var(--cal-danger);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--cal-danger);
        }
      `}} />

      {/* --- Cabeçalho iOS Luxury --- */}
      <div className="cal-header">
        <div className="cal-header-left">
          {avatarUrl ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/settings')}
              className="cal-profile-btn"
            >
              <img
                src={avatarUrl}
                alt="Profile"
                className="cal-profile-img"
              />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/settings')}
              className="cal-profile-btn"
            >
              <div className="cal-profile-placeholder">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            </motion.button>
          )}
        </div>

        <div className="cal-header-center">
          <h1>Agenda</h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMonthPicker(s => !s)}
            className="cal-period-btn"
          >
            <span className="material-symbols-outlined text-[13px] leading-none">calendar_month</span>
            <span className="leading-none">
              {selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() 
                ? 'Este Mês' 
                : `${monthNames[selectedMonth]} ${selectedYear}`}
            </span>
          </motion.button>
        </div>

        <div className="cal-header-right">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/notifications')}
            className="cal-notif-btn"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="cal-notif-badge"></span>
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>

      {/* Bottom Sheet de Seleção de Mês - Painel Arrastável com AnimatePresence */}
      {createPortal(
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
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default CalendarPage;

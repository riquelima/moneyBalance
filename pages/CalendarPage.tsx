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

        /* Remap Calendar Page tokens to global --mb-* design tokens */
        :root {
          --cal-bg:        var(--mb-bg);
          --cal-surface:   var(--mb-surface);
          --cal-border:    var(--mb-border);
          --cal-fg:        var(--mb-fg);
          --cal-muted:     var(--mb-muted);
          --cal-accent:    var(--mb-accent);
          --cal-success:   var(--mb-success);
          --cal-danger:    var(--mb-danger);
          --cal-header-bg: var(--mb-surface);
        }

        /* .dark handled globally by design-tokens.css */

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
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid var(--cal-border);
          backdrop-filter: blur(20px);
          height: 60px;
          box-sizing: border-box;
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
              className="mb-sheet-overlay"
              onClick={() => setShowMonthPicker(false)}
            >
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
                className="mb-sheet-panel select-none cursor-grab active:cursor-grabbing text-gray-900 dark:text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-sheet-handle" />

                <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTempYear(y => y - 1)}
                    className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-all flex items-center justify-center border border-transparent active:border-black/10 dark:active:border-white/10"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </motion.button>
                  
                  <div className="px-6">
                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none" style={{ fontFamily: 'var(--mb-font-body)' }}>{tempYear}</p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTempYear(y => y + 1)}
                    className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-all flex items-center justify-center border border-transparent active:border-black/10 dark:active:border-white/10"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </motion.button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[tempYear - 2, tempYear - 1, tempYear].map((y) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={y}
                      onClick={() => setTempYear(y)}
                      className={`mb-grid-btn ${y === tempYear ? 'active' : ''}`}
                    >
                      {y}
                    </motion.button>
                  ))}
                </div>

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
                      className={`mb-grid-btn ${idx === selectedMonth && tempYear === selectedYear ? 'active' : ''}`}
                    >
                      {m}
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { 
                      const d = new Date(); 
                      setSelectedYear(d.getFullYear()); 
                      setSelectedMonth(d.getMonth()); 
                      setShowMonthPicker(false); 
                    }}
                    className="flex-1 mb-grid-btn py-3.5"
                  >
                    Mês Atual
                  </motion.button>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMonthPicker(false)}
                    className="flex-1 mb-grid-btn active py-3.5"
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

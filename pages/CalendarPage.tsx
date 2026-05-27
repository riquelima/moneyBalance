import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CalendarView from '../components/calendar/CalendarView';
import Header from '../components/common/Header';

const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="flex flex-col h-screen relative">
      <Header
        title="Agenda"
        leftAction={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-white/40 shadow-sm backdrop-blur-md transition-all text-gray-700"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </motion.button>
        }
        rightAction={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentDate(new Date())}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white/90 border border-white/40 shadow-sm backdrop-blur-md transition-all text-gray-700"
            title="Ir para hoje"
          >
            <span className="material-symbols-outlined text-[20px]">today</span>
          </motion.button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>
    </div>
  );
};

export default CalendarPage;

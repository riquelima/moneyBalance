import React, { useState } from 'react';
import CalendarView from '../components/calendar/CalendarView';

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="flex flex-col h-screen relative"
    >
      <header className="sticky top-0 z-50 flex items-center justify-center px-6 py-4 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-glass">
        <h1 className="text-xl font-bold tracking-wide text-white drop-shadow-sm">Agenda</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>
    </div>
  );
};

export default CalendarPage;

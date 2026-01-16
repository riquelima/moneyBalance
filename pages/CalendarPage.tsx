import React, { useState } from 'react';
import CalendarView from '../components/calendar/CalendarView';

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark relative">
      <header className="sticky top-0 z-50 flex items-center justify-center bg-white dark:bg-surface-dark p-4 border-b-3 border-dark dark:border-white shadow-sm transition-colors duration-300">
        <h1 className="text-xl font-black uppercase tracking-widest text-dark dark:text-white">AGENDA</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>
    </div>
  );
};

export default CalendarPage;

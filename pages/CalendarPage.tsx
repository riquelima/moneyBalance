import React, { useState } from 'react';
import CalendarView from '../components/calendar/CalendarView';

import Header from '../components/common/Header';

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="flex flex-col h-screen relative">
      <Header title="Agenda" />

      <div className="flex-1 overflow-y-auto">
        <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>
    </div>
  );
};

export default CalendarPage;

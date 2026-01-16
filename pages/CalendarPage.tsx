import React, { useState, useEffect, useRef } from 'react';
import CalendarView from '../components/calendar/CalendarView';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showYear, setShowYear] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowYear(!entry.isIntersecting);
      },
      { threshold: 0.2 } // Trigger when header is mostly out of view
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark relative">
      <header ref={headerRef} className="sticky top-0 z-50 flex items-center justify-center bg-white dark:bg-surface-dark p-4 border-b-3 border-dark dark:border-white shadow-sm transition-colors duration-300">
        <h1 className="text-xl font-black uppercase tracking-widest text-dark dark:text-white">AGENDA</h1>
      </header>

      {/* Sticky Year Indicator */}
      <AnimatePresence>
        {showYear && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-20 left-0 right-0 z-40 flex justify-center pointer-events-none"
          >
            <div className="bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-4 py-1 rounded-full shadow-neo-sm dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <span className="text-sm font-black text-dark dark:text-white">
                {format(currentDate, 'yyyy')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>
    </div>
  );
};

export default CalendarPage;

import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../supabaseClient';
import BottomSheet from '../ui/BottomSheet';
import { parseLocalISODate } from '../../utils/date';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  is_paid: boolean;
  category_id?: string;
}

interface CalendarViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const CalendarView: React.FC<CalendarViewProps> = ({ currentDate, setCurrentDate }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Derived dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  // Fetch transactions
  useEffect(() => {
    fetchTransactions();
  }, [currentDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = monthStart.toISOString();
      const endDate = monthEnd.toISOString();

      const { data, error } = await supabase
        .from('user_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentStatus = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from('user_transactions')
        .update({ is_paid: !transaction.is_paid })
        .eq('id', transaction.id);

      if (error) throw error;
      
      // Optimistic update
      setTransactions(prev => prev.map(t => 
        t.id === transaction.id ? { ...t, is_paid: !t.is_paid } : t
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsSheetOpen(true);
  };

  const getDayTransactions = (day: Date) => {
    return transactions.filter(t => isSameDay(parseLocalISODate(t.date), day));
  };

  const renderDay = (day: Date) => {
    const dayTransactions = getDayTransactions(day);
    const hasExpense = dayTransactions.some(t => t.type === 'expense');
    const hasIncome = dayTransactions.some(t => t.type === 'income');
    const isCurrentMonth = isSameMonth(day, monthStart);
    const isTodayDay = isToday(day);
    const isSelectedDay = selectedDate && isSameDay(day, selectedDate);

    return (
      <div
        key={day.toISOString()}
        onClick={() => handleDayClick(day)}
        className={`cal-day-cell aspect-square p-1 sm:p-2 relative cursor-pointer transition-all flex flex-col items-center justify-center gap-1 rounded-xl
          ${!isCurrentMonth ? 'opacity-25' : 'hover:bg-black/5 dark:hover:bg-white/5'}
          ${isTodayDay ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/40' : ''}
          ${isSelectedDay ? 'bg-black/5 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/20' : ''}
        `}
      >
        <span className={`cal-day-num text-xs sm:text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all
          ${isTodayDay ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-gray-700 dark:text-gray-300'}
        `}>
          {format(day, 'd')}
        </span>
        
        <div className="cal-day-dots flex gap-1 mt-0.5 items-center justify-center h-1.5">
          {hasExpense && <div className="cal-dot-expense w-1.5 h-1.5 rounded-full bg-[#FF6B6B] shadow-[0_0_6px_rgba(255,107,107,0.6)]" />}
          {hasIncome && <div className="cal-dot-income w-1.5 h-1.5 rounded-full bg-[#20BF55] shadow-[0_0_6px_rgba(32,191,85,0.6)]" />}
        </div>
      </div>
    );
  };

  const selectedTransactions = selectedDate ? getDayTransactions(selectedDate) : [];

  return (
    <div className="flex flex-col h-auto">
      <div className="cal-card border border-white/40 dark:border-white/10 rounded-3xl shadow-glass bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div className="cal-view-header flex items-center justify-between p-4 bg-gradient-to-r from-primary to-[#a55eea] text-white rounded-t-2xl">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="cal-view-nav-btn flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/10 text-white transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
          </button>
          
          <h2 className="cal-view-title text-base font-bold select-none text-white tracking-wide capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>

          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="cal-view-nav-btn flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/10 text-white transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
          </button>
        </div>

        {/* Week Days Header */}
        <div className="cal-weekdays grid grid-cols-7 border-b border-gray-100 dark:border-white/10 bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="cal-weekday-cell py-3 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 p-2 gap-1 bg-white/40 dark:bg-black/25">
          {calendarDays.map(renderDay)}
        </div>
      </div>

      {/* Details Sheet */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : ''}
      >
        <div className="space-y-4">
          {selectedTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
              <p className="text-sm font-medium">Nenhum lançamento para esta data.</p>
            </div>
          ) : (
            selectedTransactions.map(transaction => (
              <div 
                key={transaction.id}
                className={`
                  flex items-center justify-between p-4 rounded-2xl border backdrop-blur-md transition-all
                  ${transaction.type === 'expense' 
                    ? 'border-danger/20 bg-danger/5 dark:bg-danger/10 hover:bg-danger/10 dark:hover:bg-danger/20' 
                    : 'border-secondary/20 bg-secondary/5 dark:bg-secondary/10 hover:bg-secondary/10 dark:hover:bg-secondary/20'}
                `}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`
                    p-2 rounded-xl shrink-0
                    ${transaction.type === 'expense' ? 'bg-danger/10 text-danger' : 'bg-secondary/10 text-secondary'}
                  `}>
                    <span className="material-symbols-outlined text-lg">
                      {transaction.type === 'expense' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm">{transaction.description || 'Sem descrição'}</h3>
                    <p className={`text-xs font-bold ${transaction.type === 'expense' ? 'text-danger' : 'text-secondary'}`}>
                      R$ {Number(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => togglePaymentStatus(transaction)}
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-full border transition-all active:scale-95 shrink-0 ml-2
                    ${transaction.is_paid 
                      ? 'bg-secondary border-secondary text-white shadow-lg shadow-secondary/30' 
                      : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-400 hover:border-secondary hover:text-secondary'}
                  `}
                  title={transaction.is_paid ? "Pago" : "Marcar como pago"}
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                </button>
              </div>
            ))
          )}
          
          <button 
            onClick={() => setIsSheetOpen(false)}
            className="w-full py-4 mt-4 font-bold text-center text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all bg-white dark:bg-white/5 backdrop-blur-md shadow-sm"
          >
            Fechar
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default CalendarView;

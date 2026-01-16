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

    return (
      <div
        key={day.toISOString()}
        onClick={() => handleDayClick(day)}
        className={`
          aspect-square p-2 relative cursor-pointer transition-colors flex flex-col items-center justify-start gap-1
          ${!isCurrentMonth ? 'bg-gray-100/50 dark:bg-gray-900/50 text-gray-400' : 'bg-white dark:bg-surface-dark hover:bg-primary/5 dark:hover:bg-primary/10'}
          ${isToday(day) ? 'ring-inset ring-4 ring-primary bg-primary/5' : ''}
        `}
      >
        <span className={`
          text-sm font-black w-7 h-7 flex items-center justify-center rounded-full
          ${isToday(day) ? 'bg-primary text-white shadow-sm' : 'text-dark dark:text-white'}
        `}>
          {format(day, 'd')}
        </span>
        
        <div className="flex gap-1 mt-1">
          {hasExpense && (
            <div className="w-2 h-2 rounded-sm bg-danger border border-dark/20 dark:border-white/20" />
          )}
          {hasIncome && (
            <div className="w-2 h-2 rounded-sm bg-secondary border border-dark/20 dark:border-white/20" />
          )}
        </div>
      </div>
    );
  };

  const selectedTransactions = selectedDate ? getDayTransactions(selectedDate) : [];

  return (
    <div className="flex flex-col h-auto bg-background-light dark:bg-background-dark p-4">
      <div className="flex flex-col h-auto border-3 border-dark dark:border-white rounded-xl shadow-neo bg-white dark:bg-surface-dark overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white dark:bg-surface-dark border-b-3 border-dark dark:border-white">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-dark dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:translate-y-0.5 active:shadow-none shadow-neo-sm"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          
          <h2 className="text-2xl font-black uppercase tracking-tight text-dark dark:text-white">
            {format(currentDate, 'MMMM', { locale: ptBR })}
          </h2>

          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-dark dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:translate-y-0.5 active:shadow-none shadow-neo-sm"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b-3 border-dark dark:border-white bg-black dark:bg-white text-white dark:text-black">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-black uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-900 gap-0.5 border-b-2 border-dark dark:border-white">
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
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
              <p>Nenhum lançamento para esta data.</p>
            </div>
          ) : (
            selectedTransactions.map(transaction => (
              <div 
                key={transaction.id}
                className={`
                  flex items-center justify-between p-4 rounded-xl border-2 
                  ${transaction.type === 'expense' ? 'border-danger/20 bg-danger/5' : 'border-secondary/20 bg-secondary/5'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg 
                    ${transaction.type === 'expense' ? 'bg-danger text-white' : 'bg-secondary text-white'}
                  `}>
                    <span className="material-symbols-outlined">
                      {transaction.type === 'expense' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-dark dark:text-white">{transaction.description || 'Sem descrição'}</h3>
                    <p className={`text-sm font-semibold ${transaction.type === 'expense' ? 'text-danger' : 'text-secondary'}`}>
                      R$ {Number(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => togglePaymentStatus(transaction)}
                  className={`
                    p-2 rounded-full border-2 transition-all active:scale-95
                    ${transaction.is_paid 
                      ? 'bg-secondary border-secondary text-white' 
                      : 'bg-transparent border-gray-300 text-gray-400 hover:border-secondary hover:text-secondary'}
                  `}
                  title={transaction.is_paid ? "Pago" : "Marcar como pago"}
                >
                  <span className="material-symbols-outlined text-xl">check</span>
                </button>
              </div>
            ))
          )}
          
          <button 
            onClick={() => setIsSheetOpen(false)}
            className="w-full py-4 mt-4 font-bold text-center text-dark dark:text-white border-2 border-dark dark:border-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default CalendarView;

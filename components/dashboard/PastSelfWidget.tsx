import React, { useState, useEffect, useRef } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  format 
} from 'date-fns';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface ComparisonData {
  categoryName: string;
  currentAmount: number;
  previousAmount: number;
  percentageChange: number;
  difference: number;
}

const PastSelfWidget: React.FC = () => {
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.offsetWidth;
      // Calculate active index based on scroll position (assuming 85% width + gap roughly equals viewport for mobile)
      // A simple approximation is fine for dots
      const index = Math.round(scrollLeft / (width * 0.85));
      setActiveIndex(Math.min(Math.max(0, index), comparisons.length - 1));
    }
  };

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const currentStart = startOfMonth(now).toISOString();
      const currentEnd = endOfMonth(now).toISOString();
      const prevStart = startOfMonth(subMonths(now, 1)).toISOString();
      const prevEnd = endOfMonth(subMonths(now, 1)).toISOString();

      // Fetch transactions for both periods
      const { data: currentTrans, error: currErr } = await supabase
        .from('user_transactions')
        .select('amount, category_id')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', currentStart)
        .lte('date', currentEnd);

      const { data: prevTrans, error: prevErr } = await supabase
        .from('user_transactions')
        .select('amount, category_id')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', prevStart)
        .lte('date', prevEnd);

      if (currErr || prevErr) throw currErr || prevErr;

      // Aggregate totals by category
      const currentTotals: Record<string, number> = {};
      const prevTotals: Record<string, number> = {};

      currentTrans?.forEach(t => {
        if (t.category_id) {
          currentTotals[t.category_id] = (currentTotals[t.category_id] || 0) + Number(t.amount);
        }
      });

      prevTrans?.forEach(t => {
        if (t.category_id) {
          prevTotals[t.category_id] = (prevTotals[t.category_id] || 0) + Number(t.amount);
        }
      });

      // Get category IDs involved
      const categoryIds = Array.from(new Set([
        ...Object.keys(currentTotals),
        ...Object.keys(prevTotals)
      ]));

      if (categoryIds.length === 0) {
        setComparisons([]);
        return;
      }

      // Fetch category names
      const { data: categories, error: catErr } = await supabase
        .from('user_categories')
        .select('id, name')
        .in('id', categoryIds);

      if (catErr) throw catErr;

      const categoryMap = new Map(categories?.map(c => [c.id, c.name]));

      // Build comparison data
      const results: ComparisonData[] = [];

      categoryIds.forEach(id => {
        const current = currentTotals[id] || 0;
        const previous = prevTotals[id] || 0;
        
        // Skip insignificant amounts
        if (current < 10 && previous < 10) return;

        const diff = current - previous;
        let pct = 0;
        if (previous > 0) {
          pct = ((current - previous) / previous) * 100;
        } else if (current > 0) {
          pct = 100; // New expense
        }

        results.push({
          categoryName: categoryMap.get(id) || 'Outros',
          currentAmount: current,
          previousAmount: previous,
          percentageChange: pct,
          difference: diff
        });
      });

      // Sort by absolute difference to show most impactful changes
      results.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

      // Take top 3
      setComparisons(results.slice(0, 3));

    } catch (err) {
      console.error('Error fetching comparison:', err);
      setError('Não foi possível carregar os dados comparativos.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />;
  if (error) return null; // Hide on error
  if (comparisons.length === 0) return null; // Hide if no data

  return (
    <div className="space-y-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between group focus:outline-none"
        aria-expanded={isOpen}
        aria-controls="past-self-content"
      >
        <h3 className="text-lg font-black uppercase text-dark dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">history_edu</span>
          Eu do Passado
        </h3>
        <span 
          className={`material-symbols-outlined text-dark dark:text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="past-self-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="relative">
              {/* Horizontal Scroll Container */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 px-1 scrollbar-hide -mx-1"
                style={{ scrollBehavior: 'smooth' }}
              >
                {comparisons.map((item, index) => {
                  const isHigher = item.difference > 0;
                  const isLower = item.difference < 0;
                  
                  // Contextual message
                  let message = "";
                  if (isHigher) {
                    message = `Gastos com ${item.categoryName} subiram ${Math.abs(item.percentageChange).toFixed(0)}%`;
                  } else if (isLower) {
                    message = `Você economizou ${Math.abs(item.percentageChange).toFixed(0)}% em ${item.categoryName}`;
                  } else {
                    message = `Gastos com ${item.categoryName} estáveis`;
                  }

                  return (
                    <motion.div
                      key={item.categoryName}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="min-w-[85%] sm:min-w-[320px] snap-center flex-shrink-0 p-4 rounded-xl border-2 border-dark dark:border-white bg-white dark:bg-surface-dark shadow-neo-sm hover:shadow-neo transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-dark dark:text-white truncate max-w-[60%]">{item.categoryName}</span>
                        <div className={`flex items-center text-sm font-bold ${isHigher ? 'text-danger' : 'text-secondary'}`}>
                          <span className="material-symbols-outlined text-lg">
                            {isHigher ? 'trending_up' : 'trending_down'}
                          </span>
                          {Math.abs(item.percentageChange).toFixed(0)}%
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-3 h-10 line-clamp-2">
                        {message}
                      </p>
                      
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex justify-between">
                        <span>Anterior: R$ {item.previousAmount.toFixed(2)}</span>
                        <span className="font-bold">Atual: R$ {item.currentAmount.toFixed(2)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Navigation Dots */}
              {comparisons.length > 1 && (
                <div className="flex justify-center gap-2 mt-2">
                  {comparisons.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (scrollContainerRef.current) {
                          const width = scrollContainerRef.current.offsetWidth;
                          scrollContainerRef.current.scrollTo({
                            left: idx * (width * 0.85 + 16), // width + gap approximation
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === activeIndex 
                          ? 'w-6 bg-primary' 
                          : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-primary/50'
                      }`}
                      aria-label={`Ir para insight ${idx + 1}`}
                      aria-current={idx === activeIndex ? 'true' : 'false'}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PastSelfWidget;

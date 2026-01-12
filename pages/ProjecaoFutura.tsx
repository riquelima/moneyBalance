import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { categories } from '../categories';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { computeDailyRecommended, selectSingleCardIndex } from '../utils/date';

const ProjecaoFutura: React.FC = () => {
  const navigate = useNavigate();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [projectionCategories, setProjectionCategories] = useState<Array<{
    id: string;
    name: string;
    amount: number;
    description: string;
    frequency: string;
    trend: string;
    color: string;
    icon: string;
    dbId?: string; // Add database ID
  }>>([]);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState({
    description: '',
    amount: ''
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<'6meses' | '1ano' | '5anos'>('1ano');
  const [loading, setLoading] = useState(true);
  const [monthBalance, setMonthBalance] = useState(0);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [newCardName, setNewCardName] = useState('');

  // Load projections from Supabase
  useEffect(() => {
    let mounted = true;
    
    const loadProjections = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('No authenticated user');
          if (mounted) setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_projections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading projections:', error);
          if (mounted) setLoading(false);
          return;
        }

        if (mounted && data) {
          // Transform data to match component state structure
          const transformedData = data.map(item => ({
            id: item.category_id,
            name: item.category_name,
            amount: item.amount,
            description: item.description || '',
            frequency: item.frequency,
            trend: item.trend,
            color: item.color,
            icon: item.icon,
            dbId: item.id
          }));

          setProjectionCategories(transformedData);
        }
      } catch (error) {
        console.error('Error in loadProjections:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProjections();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to run only once

  const saveProjectionToDB = async (projection: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user');
        return null;
      }

      const projectionData = {
        user_id: user.id,
        category_id: projection.id,
        category_name: projection.name,
        amount: projection.amount,
        description: projection.description,
        frequency: projection.frequency,
        trend: projection.trend,
        color: projection.color,
        icon: projection.icon
      };

      let result;
      if (projection.dbId) {
        // Update existing projection
        result = await supabase
          .from('user_projections')
          .update(projectionData)
          .eq('id', projection.dbId);
      } else {
        // Insert new projection
        result = await supabase
          .from('user_projections')
          .insert(projectionData);
      }

      if (result.error) {
        console.error('Error saving projection:', result.error);
        return null;
      }

      return result.data ? result.data[0] : null;
    } catch (error) {
      console.error('Error in saveProjectionToDB:', error);
      return null;
    }
  };

  const deleteProjectionFromDB = async (dbId: string) => {
    try {
      const { error } = await supabase
        .from('user_projections')
        .delete()
        .eq('id', dbId);

      if (error) {
        console.error('Error deleting projection:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteProjectionFromDB:', error);
      return false;
    }
  };

  const getCategoryColor = (color: string) => {
    switch (color) {
      case 'purple': return { bg: 'bg-primary', text: 'text-white', gradient: 'gradPurple', stop1: '#8854D0', stop2: '#8854D0' };
      case 'orange': return { bg: 'bg-accent', text: 'text-dark', gradient: 'gradOrange', stop1: '#FFE66D', stop2: '#FFE66D' };
      case 'blue': return { bg: 'bg-blue-600', text: 'text-white', gradient: 'gradBlue', stop1: '#2563EB', stop2: '#2563EB' };
      case 'green': return { bg: 'bg-secondary', text: 'text-white', gradient: 'gradGreen', stop1: '#20BF55', stop2: '#20BF55' };
      default: return { bg: 'bg-surface-light', text: 'text-dark', gradient: 'gradGray', stop1: '#E5E7EB', stop2: '#E5E7EB' };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return { icon: 'trending_up', text: '+12% vs ano passado', className: 'text-danger bg-danger/10 px-2 py-1 rounded-sm border-2 border-danger' };
      case 'down': return { icon: 'trending_down', text: '-5% Economia', className: 'text-secondary bg-secondary/10 px-2 py-1 rounded-sm border-2 border-secondary' };
      case 'warning': return { icon: 'warning', text: 'Atenção', className: 'text-dark dark:text-black bg-accent px-2 py-1 rounded-sm border-2 border-dark dark:border-white' };
      default: return { icon: 'trending_flat', text: 'Estável', className: 'text-dark dark:text-white bg-surface-light dark:bg-surface-dark px-2 py-1 rounded-sm border-2 border-dark dark:border-white' };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const calculateProjectedAmount = (amount: number, frequency: string) => {
    let monthlyAmount = amount;
    
    // Convert to monthly amount first
    switch (frequency) {
      case 'weekly':
        monthlyAmount = amount * 4.33; // Average weeks per month
        break;
      case 'biweekly':
        monthlyAmount = amount * 2.17; // Twice a month
        break;
      case 'yearly':
        monthlyAmount = amount / 12;
        break;
    }
    
    // Calculate based on selected timeframe
    switch (selectedTimeframe) {
      case '6meses':
        return monthlyAmount * 6;
      case '1ano':
        return monthlyAmount * 12;
      case '5anos':
        return monthlyAmount * 60;
      default:
        return monthlyAmount * 12;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadMonthBalance = async () => {
      try {
        setBalanceError(null);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const now = new Date();
        const fmt = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dd}`;
        };
        const startCur = new Date(now.getFullYear(), now.getMonth(), 1);
        const endCur = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const { data, error } = await supabase
          .from('user_transactions')
          .select('amount, type, date')
          .eq('user_id', user.id)
          .gte('date', fmt(startCur))
          .lte('date', fmt(endCur));
        if (error) {
          setBalanceError('Falha ao carregar saldo do mês.');
          return;
        }
        const income = (data || []).filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
        const expense = (data || []).filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
        const balance = income - expense;
        if (!cancelled) setMonthBalance(balance);
      } catch {
        setBalanceError('Erro inesperado ao calcular saldo do mês.');
      }
    };
    loadMonthBalance();
    return () => { cancelled = true; };
  }, []);
  const generateChartData = (trend: string) => {
    switch (trend) {
      case 'up':
        return {
          path: "M0,30 C20,30 30,10 50,15 S80,5 100,2",
          fillPath: "M0,30 C20,30 30,10 50,15 S80,5 100,2 L100,40 L0,40 Z"
        };
      case 'down':
        return {
          path: "M0,35 Q30,35 40,20 T70,25 T100,5",
          fillPath: "M0,35 Q30,35 40,20 T70,25 T100,5 L100,40 L0,40 Z"
        };
      case 'warning':
        return {
          path: "M0,35 C15,35 25,20 40,25 S60,10 80,15 S100,5 100,5",
          fillPath: "M0,35 C15,35 25,20 40,25 S60,10 80,15 S100,5 100,5 L100,40 L0,40 Z"
        };
      default:
        return {
          path: "M0,22 Q25,22 50,22 T100,22",
          fillPath: "M0,22 Q25,22 50,22 T100,22 L100,40 L0,40 Z"
        };
    }
  };

  const handleCategorySelect = async (categoryName: string) => {
    // Check if category already exists
    if (projectionCategories.some(cat => cat.name === categoryName)) {
      setShowCategoryPicker(false);
      return;
    }

    // Add new category with default values
    const newCategory = {
      id: categoryName.toLowerCase().replace(/\s+/g, '-'),
      name: categoryName,
      amount: 1000, // Default amount
      description: '', // Default description
      frequency: 'monthly', // Default frequency
      trend: 'stable', // Default trend
      color: 'green', // Default color
      icon: 'payments' // Default icon
    };

    // Save to database
    const savedData = await saveProjectionToDB(newCategory);
    
    if (savedData) {
      // Add database ID to the category
      const categoryWithDbId = {
        ...newCategory,
        dbId: savedData.id
      };
      
      setProjectionCategories([...projectionCategories, categoryWithDbId]);
    } else {
      // Fallback to local state if DB save fails
      setProjectionCategories([...projectionCategories, newCategory]);
    }
    
    setShowCategoryPicker(false);
    setShowCustomCategoryInput(false);
    setCustomCategoryName('');
  };

  const handleCardClick = (categoryId: string) => {
    const category = projectionCategories.find(cat => cat.id === categoryId);
    if (category) {
      setFlippedCardId(categoryId);
      setEditingValues({
        description: category.description,
        amount: category.amount.toString()
      });
    }
  };

  const handleSaveEdit = async (categoryId: string) => {
    const updatedCategories = projectionCategories.map(cat => {
      if (cat.id === categoryId) {
        const updatedCat = {
          ...cat,
          description: editingValues.description,
          amount: parseFloat(editingValues.amount) || cat.amount
        };
        
        // Save to database
        saveProjectionToDB(updatedCat);
        
        return updatedCat;
      }
      return cat;
    });
    
    setProjectionCategories(updatedCategories);
    setFlippedCardId(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const categoryToDelete = projectionCategories.find(cat => cat.id === categoryId);
    
    if (categoryToDelete && categoryToDelete.dbId) {
      // Delete from database
      await deleteProjectionFromDB(categoryToDelete.dbId);
    }
    
    // Remove from local state
    setProjectionCategories(prev => prev.filter(cat => cat.id !== categoryId));
    setFlippedCardId(null);
  };

  const handleCancelEdit = () => {
    setFlippedCardId(null);
  };

  const handleAddNewCard = async () => {
    if (!newCardName.trim()) return;
    
    // Add new category with default values
    const newCategory = {
      id: newCardName.toLowerCase().replace(/\s+/g, '-'),
      name: newCardName.trim(),
      amount: 1000, // Default amount
      description: '', // Default description
      frequency: 'monthly', // Default frequency
      trend: 'stable', // Default trend
      color: 'green', // Default color
      icon: 'payments' // Default icon
    };

    // Save to database
    const savedData = await saveProjectionToDB(newCategory);
    
    if (savedData) {
      // Add database ID to the category
      const categoryWithDbId = {
        ...newCategory,
        dbId: savedData.id
      };
      
      setProjectionCategories([...projectionCategories, categoryWithDbId]);
    } else {
      // Fallback to local state if DB save fails
      setProjectionCategories([...projectionCategories, newCategory]);
    }
    
    // Reset form and hide it
    setNewCardName('');
    setShowAddCardForm(false);
  };

  const getTimeframeMultiplier = () => {
    switch (selectedTimeframe) {
      case '6meses': return 6;
      case '1ano': return 12;
      case '5anos': return 60;
      default: return 12;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background-dark text-text-primary">
        <div className="flex items-center justify-center h-full">
          <p className="text-dark font-black uppercase">Carregando projeções...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display pb-28">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-surface-dark border-b-3 border-dark dark:border-white shadow-sm">
        <div className="flex items-center p-4 pb-3 justify-between">
          <div className="flex size-10 shrink-0 items-center justify-start">
            <button 
              onClick={() => navigate(-1)}
              className="rounded-sm p-2 border-2 border-dark dark:border-white hover:bg-surface-light dark:hover:bg-gray-800 shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all"
            >
              <span className="material-symbols-outlined text-dark dark:text-white">arrow_back</span>
            </button>
          </div>
          <h1 className="text-dark dark:text-white text-xl font-black uppercase leading-tight tracking-wide flex-1 text-center">Projeções</h1>
          <div className="flex size-10 shrink-0 items-center justify-end">
            <button className="rounded-sm p-2 border-2 border-dark dark:border-white hover:bg-surface-light dark:hover:bg-gray-800 shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all">
              <span className="material-symbols-outlined text-dark dark:text-white">tune</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-4 pt-4">
          <div className="flex p-1 bg-white dark:bg-surface-dark rounded-sm border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-none">
            <button 
              onClick={() => setSelectedTimeframe('6meses')}
              className={`flex-1 py-2 text-xs font-black uppercase transition-all rounded-sm border-2 ${
                selectedTimeframe === '6meses' 
                  ? 'text-white bg-primary border-dark dark:border-white shadow-neo-sm dark:shadow-none -translate-y-[1px]' 
                  : 'text-dark dark:text-white border-transparent hover:bg-surface-light dark:hover:bg-gray-800'
              }`}
            >
              6 Meses
            </button>
            <button 
              onClick={() => setSelectedTimeframe('1ano')}
              className={`flex-1 py-2 text-xs font-black uppercase transition-all rounded-sm border-2 ${
                selectedTimeframe === '1ano' 
                  ? 'text-white bg-primary border-dark dark:border-white shadow-neo-sm dark:shadow-none -translate-y-[1px]' 
                  : 'text-dark dark:text-white border-transparent hover:bg-surface-light dark:hover:bg-gray-800'
              }`}
            >
              1 Ano
            </button>
            <button 
              onClick={() => setSelectedTimeframe('5anos')}
              className={`flex-1 py-2 text-xs font-black uppercase transition-all rounded-sm border-2 ${
                selectedTimeframe === '5anos' 
                  ? 'text-white bg-primary border-dark dark:border-white shadow-neo-sm dark:shadow-none -translate-y-[1px]' 
                  : 'text-dark dark:text-white border-transparent hover:bg-surface-light dark:hover:bg-gray-800'
              }`}
            >
              5 Anos
            </button>
          </div>
          
          <div className="relative overflow-hidden rounded-lg bg-white dark:bg-surface-dark p-5 border-3 border-dark dark:border-white shadow-neo dark:shadow-[4px_4px_0px_0px_#ffffff]">
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary mb-1">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="text-xs font-black uppercase tracking-wider bg-accent text-dark dark:text-black px-2 py-1 border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-none">Insights</span>
              </div>
              {(() => {
                const now = new Date();
                const res = computeDailyRecommended(monthBalance, now.getFullYear(), now.getMonth());
                const valueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(res.value || 0);
                const toneClass = (balanceError || res.error) ? 'text-danger' : 'text-dark dark:text-white';
                const boxClass = (balanceError || res.error) ? 'border-danger' : 'border-dark dark:border-white';
                return (
                  <div className={`rounded-sm p-3 border-2 ${boxClass}`}>
                    <p className={`text-lg font-black uppercase ${toneClass}`}>Seu gasto médio diário recomendado é: {valueStr}</p>
                    {(balanceError || res.error) && (
                      <p className="mt-1 text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Saldo do mês zero ou negativo. Ajuste seus gastos.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 px-1">
            <h2 className="text-xl font-black text-dark dark:text-white uppercase tracking-tight bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-2 py-1 shadow-neo-sm dark:shadow-none transform -rotate-1">Categorias</h2>
          </div>
          
          {/* Add Card Form */}
          {showAddCardForm && (
            <div className="rounded-lg border-3 border-dark dark:border-white bg-white dark:bg-surface-dark p-4 shadow-neo dark:shadow-[4px_4px_0px_0px_#ffffff]">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder="NOME DA CATEGORIA"
                  className="flex-1 rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-3 py-2 text-dark dark:text-white font-bold uppercase text-sm focus:outline-none focus:shadow-neo-sm dark:focus:shadow-[2px_2px_0px_0px_#ffffff] transition-all placeholder:text-text-secondary/50 dark:placeholder:text-gray-500"
                  autoFocus
                />
                <button
                  onClick={handleAddNewCard}
                  disabled={!newCardName.trim()}
                  className={`rounded-sm px-4 py-2 text-xs font-black uppercase border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all ${
                    newCardName.trim() 
                      ? 'bg-secondary text-white' 
                      : 'bg-surface-light dark:bg-gray-800 text-text-secondary dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Adicionar
                </button>
                <button
                  onClick={() => {
                    setShowAddCardForm(false);
                    setNewCardName('');
                  }}
                  className="rounded-sm px-3 py-2 text-dark dark:text-white border-2 border-dark dark:border-white hover:bg-surface-light dark:hover:bg-gray-800 shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-4">
            {(() => {
              const idx = selectSingleCardIndex(selectedTimeframe, projectionCategories.length);
              const single = idx >= 0 ? [projectionCategories[idx]] : [];
              return single.map((category) => {
                const colorInfo = getCategoryColor(category.color);
                const trendInfo = getTrendIcon(category.trend);
                const chartData = generateChartData(category.trend);
                const projectedAmount = calculateProjectedAmount(category.amount, category.frequency);
                const isFlipped = flippedCardId === category.id;
                
                return (
                  <div 
                    key={category.id} 
                    className="group rounded-lg border-3 border-dark dark:border-white hover:translate-y-[-2px] hover:shadow-neo dark:hover:shadow-[4px_4px_0px_0px_#ffffff] transition-all bg-white dark:bg-surface-dark overflow-visible relative"
                  >
                    <div className="relative h-64">
                    {/* Front of Card */}
                    <motion.div
                      className="absolute inset-0 p-5 flex flex-col justify-between cursor-pointer bg-white dark:bg-surface-dark rounded-lg z-10"
                      initial={false}
                      animate={{ 
                        rotateY: isFlipped ? 180 : 0,
                        opacity: isFlipped ? 0 : 1
                      }}
                      transition={{ duration: 0.3 }}
                      style={{ backfaceVisibility: 'hidden' }}
                      onClick={() => handleCardClick(category.id)}
                    >
                      <div className="flex justify-between items-start border-b-2 border-dark dark:border-white pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`size-12 rounded-sm ${colorInfo.bg} border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-none flex items-center justify-center ${colorInfo.text}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{category.icon}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-dark dark:text-white uppercase">{category.name}</h3>
                            <p className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">{category.description || 'SEM DESCRIÇÃO'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-dark dark:text-white">{formatCurrency(projectedAmount)}</p>
                          <p className={`text-[10px] font-black uppercase flex items-center justify-end gap-1 mt-1 ${trendInfo.className}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{trendInfo.icon}</span>
                            {trendInfo.text}
                          </p>
                        </div>
                      </div>
                      
                      <div className="h-24 w-full relative mt-2 bg-surface-light dark:bg-background-dark border-2 border-dark dark:border-white p-2">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                          <defs>
                            <pattern id={`hatch-${category.id}`} width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                              <line x1="0" y1="0" x2="0" y2="4" style={{stroke: colorInfo.stop1, strokeWidth: 1}} />
                            </pattern>
                          </defs>
                          {category.trend === 'stable' && (
                            <path d="M0,20 Q25,20 50,20 T100,20" fill="none" opacity="0.5" stroke={colorInfo.stop1} strokeDasharray="4 2" strokeWidth="2"></path>
                          )}
                          <path d={chartData.fillPath} fill={`url(#hatch-${category.id})`} opacity="0.3"></path>
                          <path d={chartData.path} fill="none" stroke={colorInfo.stop1} strokeLinecap="round" strokeWidth="3"></path>
                          {/* Points */}
                          <rect x="0" y={chartData.path.match(/M0,(\d+)/)?.[1] || 20} width="2" height="2" className="fill-white dark:fill-surface-dark stroke-dark dark:stroke-white" strokeWidth="1" />
                          <rect x="100" y={chartData.path.match(/.*?(\d+)$/)?.[1] || 20} width="2" height="2" className="fill-white dark:fill-surface-dark stroke-dark dark:stroke-white" strokeWidth="1" />
                        </svg>
                      </div>
                    </motion.div>
                    
                    {/* Back of Card (Edit Form) */}
                    <motion.div
                      className="absolute inset-0 p-5 flex flex-col bg-white dark:bg-surface-dark rounded-lg border-3 border-dark dark:border-white"
                      initial={false}
                      animate={{ 
                        rotateY: isFlipped ? 0 : -180,
                        opacity: isFlipped ? 1 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="flex justify-between items-center mb-4 border-b-2 border-dark dark:border-white pb-2">
                        <h3 className="text-base font-black text-dark dark:text-white uppercase">Editar {category.name}</h3>
                        <button 
                          onClick={handleCancelEdit}
                          className="text-dark dark:text-white hover:bg-surface-light dark:hover:bg-gray-800 border-2 border-transparent hover:border-dark dark:hover:border-white p-1 transition-all"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-3 flex-grow">
                        <div>
                          <label className="block text-xs font-bold text-dark dark:text-white uppercase mb-1">Descrição</label>
                          <input
                            type="text"
                            value={editingValues.description}
                            onChange={(e) => setEditingValues({...editingValues, description: e.target.value})}
                            className="w-full rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-3 py-2 text-dark dark:text-white font-bold uppercase text-sm focus:outline-none focus:shadow-neo-sm dark:focus:shadow-[2px_2px_0px_0px_#ffffff] transition-all"
                            placeholder="DESCRIÇÃO"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-dark dark:text-white uppercase mb-1">Valor Mensal</label>
                          <input
                            type="number"
                            value={editingValues.amount}
                            onChange={(e) => setEditingValues({...editingValues, amount: e.target.value})}
                            className="w-full rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-3 py-2 text-dark dark:text-white font-bold uppercase text-sm focus:outline-none focus:shadow-neo-sm dark:focus:shadow-[2px_2px_0px_0px_#ffffff] transition-all"
                            placeholder="VALOR"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="rounded-sm py-2 px-3 text-xs font-black uppercase bg-danger text-white border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => handleSaveEdit(category.id)}
                          className="flex-1 rounded-sm py-2 text-xs font-black uppercase bg-primary text-white border-2 border-dark dark:border-white shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all"
                        >
                          Salvar
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </div>
                );
              });
            })()}
            
            {/* Add Category Button */}
            <div className="flex justify-center pb-8 pt-4">
              {!showAddCardForm ? (
                <button 
                  onClick={() => setShowAddCardForm(true)}
                  className="flex items-center gap-2 text-sm font-black uppercase text-dark bg-white border-2 border-dark px-4 py-3 rounded-sm shadow-neo hover:shadow-neo-lg active:shadow-none active:translate-y-[2px] transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
                  Nova Projeção
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Picker Modal */}
      <AnimatePresence>
        {showCategoryPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowCategoryPicker(false);
              setShowCustomCategoryInput(false);
              setCustomCategoryName('');
            }}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-surface-dark p-6 border-t-4 border-x-4 border-dark dark:border-white shadow-[0_-4px_0px_0px_#000000] dark:shadow-[0_-4px_0px_0px_#ffffff]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 border-b-2 border-dark dark:border-white pb-2">
                <h3 className="text-lg font-black uppercase text-dark dark:text-white">Adicionar Categoria</h3>
                <button 
                  onClick={() => {
                    setShowCategoryPicker(false);
                    setShowCustomCategoryInput(false);
                    setCustomCategoryName('');
                  }}
                  className="text-dark dark:text-white hover:bg-surface-light dark:hover:bg-gray-800 border-2 border-transparent hover:border-dark dark:hover:border-white p-1 transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <p className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase mb-4 bg-surface-light dark:bg-gray-800 p-2 border-2 border-dark dark:border-white inline-block">Selecione uma categoria</p>
              
              {!showCustomCategoryInput ? (
                <>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {categories.map((category) => {
                      const isSelected = projectionCategories.some(cat => cat.name === category);
                      return (
                        <button
                          key={category}
                          onClick={() => handleCategorySelect(category)}
                          disabled={isSelected}
                          className={`p-3 rounded-sm text-xs font-black uppercase border-2 text-left truncate shadow-neo-sm dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all ${
                            isSelected 
                              ? 'bg-surface-light dark:bg-gray-800 border-dark dark:border-white text-text-secondary dark:text-gray-500 cursor-not-allowed shadow-none translate-y-[2px]' 
                              : 'bg-white dark:bg-surface-dark border-dark dark:border-white text-dark dark:text-white hover:bg-primary/10 dark:hover:bg-primary/20'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                    {/* Custom Category Button */}
                    <button
                      onClick={() => setShowCustomCategoryInput(true)}
                      className="p-3 rounded-sm text-xs font-black uppercase border-2 border-dashed border-dark dark:border-white text-dark dark:text-white hover:bg-surface-light dark:hover:bg-gray-800 flex flex-col items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined">add</span>
                      <span>Personalizada</span>
                    </button>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setShowCategoryPicker(false);
                        setShowCustomCategoryInput(false);
                        setCustomCategoryName('');
                      }}
                      className="flex-1 rounded-sm bg-white dark:bg-surface-dark border-2 border-dark dark:border-white py-3 font-black uppercase shadow-neo dark:shadow-none hover:bg-surface-light dark:hover:bg-gray-800 active:shadow-none active:translate-y-[2px] transition-all dark:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-dark dark:text-white uppercase mb-2">Nome da Categoria</label>
                    <input
                      type="text"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full rounded-none bg-white dark:bg-surface-dark border-2 border-dark dark:border-white px-3 py-2 text-dark dark:text-white font-bold uppercase text-sm focus:outline-none focus:shadow-neo-sm dark:focus:shadow-[2px_2px_0px_0px_#ffffff] transition-all"
                      placeholder="DIGITE O NOME"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCustomCategoryInput(false);
                        setCustomCategoryName('');
                      }}
                      className="flex-1 rounded-sm bg-white dark:bg-surface-dark border-2 border-dark dark:border-white py-3 font-black uppercase shadow-neo dark:shadow-none hover:bg-surface-light dark:hover:bg-gray-800 active:shadow-none active:translate-y-[2px] transition-all dark:text-white"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => {
                        if (customCategoryName.trim()) {
                          handleCategorySelect(customCategoryName.trim());
                        }
                      }}
                      disabled={!customCategoryName.trim()}
                      className={`flex-1 rounded-sm py-3 font-black uppercase border-2 border-dark dark:border-white shadow-neo dark:shadow-none active:shadow-none active:translate-y-[2px] transition-all ${
                        customCategoryName.trim() 
                          ? 'bg-secondary text-white' 
                          : 'bg-surface-light dark:bg-gray-800 text-text-secondary dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <BottomNav />
      </div>
    </div>
  );
};

export default ProjecaoFutura;

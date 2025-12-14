import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { categories } from '../categories';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

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

  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [newCardName, setNewCardName] = useState('');

  // Load projections from Supabase
  useEffect(() => {
    loadProjections();
  }, []);

  const loadProjections = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_projections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading projections:', error);
        return;
      }

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
    } catch (error) {
      console.error('Error in loadProjections:', error);
    } finally {
      setLoading(false);
    }
  };

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
      case 'purple': return { bg: 'bg-purple-500/20', text: 'text-purple-400', gradient: 'gradPurple', stop1: '#a855f7', stop2: '#a855f7' };
      case 'orange': return { bg: 'bg-orange-500/20', text: 'text-orange-400', gradient: 'gradOrange', stop1: '#fb923c', stop2: '#fb923c' };
      case 'blue': return { bg: 'bg-blue-500/20', text: 'text-blue-400', gradient: 'gradBlue', stop1: '#3b82f6', stop2: '#3b82f6' };
      case 'green': return { bg: 'bg-primary/20', text: 'text-primary', gradient: 'gradGreen', stop1: '#13ec5b', stop2: '#13ec5b' };
      default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', gradient: 'gradGray', stop1: '#9ca3af', stop2: '#9ca3af' };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return { icon: 'trending_up', text: '+12% vs ano passado', className: 'text-red-400' };
      case 'down': return { icon: 'trending_down', text: '-5% Economia', className: 'text-primary' };
      case 'warning': return { icon: 'warning', text: 'Atenção', className: 'text-yellow-400' };
      default: return { icon: 'trending_flat', text: 'Estável', className: 'text-primary' };
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
          <p className="text-white">Carregando projeções...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-dark text-text-primary">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-background-dark backdrop-blur-md bg-opacity-90 border-b border-surface-light">
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="flex size-12 shrink-0 items-center justify-start">
            <button 
              onClick={() => navigate(-1)}
              className="rounded-full p-2 hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-white/90">arrow_back_ios_new</span>
            </button>
          </div>
          <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Projeções Futuras</h1>
          <div className="flex size-12 shrink-0 items-center justify-end">
            <button className="rounded-full p-2 hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-white/90">tune</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="flex flex-col gap-6 px-4 pt-2">
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
            <button 
              onClick={() => setSelectedTimeframe('6meses')}
              className={`flex-1 py-2 text-sm font-medium transition-colors rounded-lg ${
                selectedTimeframe === '6meses' 
                  ? 'text-background-dark bg-primary shadow-sm shadow-primary/20 font-bold' 
                  : 'text-white/50 hover:text-white'
              }`}
            >
              6 Meses
            </button>
            <button 
              onClick={() => setSelectedTimeframe('1ano')}
              className={`flex-1 py-2 text-sm font-medium transition-colors rounded-lg ${
                selectedTimeframe === '1ano' 
                  ? 'text-background-dark bg-primary shadow-sm shadow-primary/20 font-bold' 
                  : 'text-white/50 hover:text-white'
              }`}
            >
              1 Ano
            </button>
            <button 
              onClick={() => setSelectedTimeframe('5anos')}
              className={`flex-1 py-2 text-sm font-medium transition-colors rounded-lg ${
                selectedTimeframe === '5anos' 
                  ? 'text-background-dark bg-primary shadow-sm shadow-primary/20 font-bold' 
                  : 'text-white/50 hover:text-white'
              }`}
            >
              5 Anos
            </button>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-transparent p-5 border border-white/10 shadow-lg">
            <div className="absolute -right-4 -top-4 opacity-10">
              <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>psychology</span>
            </div>
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary mb-1">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="text-xs font-bold uppercase tracking-wider">Insights Inteligentes</span>
              </div>
              <p className="text-lg font-medium leading-relaxed text-white">
                Seus gastos com <span className="text-orange-400 font-bold">Transporte</span> estão 15% acima da média projetada.
              </p>
              <p className="text-sm text-white/60 leading-relaxed">
                Considerando a tendência atual, você pode economizar R$ 2.400 este ano optando por rotas alternativas ou transporte público 2x na semana.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Categorias</h2>
            <span className="text-xs font-medium text-white/50">
              Total Projetado: {formatCurrency(
                projectionCategories.reduce((sum, cat) => 
                  sum + calculateProjectedAmount(cat.amount, cat.frequency), 0
                )
              )}
            </span>
          </div>
          
          {/* Add Card Form */}
          {showAddCardForm && (
            <div className="rounded-xl border border-white/10 bg-card-dark/50 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder="Nome da nova categoria"
                  className="flex-1 rounded-lg bg-surface-dark border border-surface-light px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button
                  onClick={handleAddNewCard}
                  disabled={!newCardName.trim()}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    newCardName.trim() 
                      ? 'bg-primary text-background-dark' 
                      : 'bg-surface-light text-text-secondary cursor-not-allowed'
                  }`}
                >
                  Adicionar
                </button>
                <button
                  onClick={() => {
                    setShowAddCardForm(false);
                    setNewCardName('');
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-4">
            {projectionCategories.map((category) => {
              const colorInfo = getCategoryColor(category.color);
              const trendInfo = getTrendIcon(category.trend);
              const chartData = generateChartData(category.trend);
              const projectedAmount = calculateProjectedAmount(category.amount, category.frequency);
              const isFlipped = flippedCardId === category.id;
              
              return (
                <div 
                  key={category.id} 
                  className="group rounded-xl border border-white/10 hover:border-white/30 transition-all bg-card-dark/50 backdrop-blur-sm overflow-hidden"
                >
                  <div className="relative h-60">
                    {/* Front of Card */}
                    <motion.div
                      className="absolute inset-0 p-5 flex flex-col justify-between cursor-pointer rounded-xl"
                      initial={false}
                      animate={{ 
                        rotateY: isFlipped ? 180 : 0,
                        opacity: isFlipped ? 0 : 1
                      }}
                      transition={{ duration: 0.3 }}
                      style={{ backfaceVisibility: 'hidden' }}
                      onClick={() => handleCardClick(category.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`size-10 rounded-full ${colorInfo.bg} flex items-center justify-center ${colorInfo.text}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{category.icon}</span>
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-white">{category.name}</h3>
                            <p className="text-xs text-white/50">{category.description || 'Sem descrição'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{formatCurrency(projectedAmount)}</p>
                          <p className={`text-xs font-medium flex items-center justify-end gap-1 ${trendInfo.className}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{trendInfo.icon}</span>
                            {trendInfo.text}
                          </p>
                        </div>
                      </div>
                      
                      <div className="h-16 w-full relative">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                          <defs>
                            <linearGradient id={colorInfo.gradient} x1="0%" x2="0%" y1="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: colorInfo.stop1, stopOpacity: '0.2' }}></stop>
                              <stop offset="100%" style={{ stopColor: colorInfo.stop2, stopOpacity: '0' }}></stop>
                            </linearGradient>
                          </defs>
                          {category.trend === 'stable' && (
                            <path d="M0,20 Q25,20 50,20 T100,20" fill="none" opacity="0.5" stroke={colorInfo.stop1} strokeDasharray="4 2" strokeWidth="2"></path>
                          )}
                          <path d={chartData.fillPath} fill={`url(#${colorInfo.gradient})`}></path>
                          <path d={chartData.path} fill="none" stroke={colorInfo.stop1} strokeLinecap="round" strokeWidth="2"></path>
                        </svg>
                      </div>
                    </motion.div>
                    
                    {/* Back of Card (Edit Form) */}
                    <motion.div
                      className="absolute inset-0 p-5 flex flex-col bg-card-dark rounded-xl"
                      initial={false}
                      animate={{ 
                        rotateY: isFlipped ? 0 : -180,
                        opacity: isFlipped ? 1 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base font-semibold text-white">Editar {category.name}</h3>
                        <button 
                          onClick={handleCancelEdit}
                          className="text-text-secondary hover:text-white"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-2 flex-grow">
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">Descrição</label>
                          <input
                            type="text"
                            value={editingValues.description}
                            onChange={(e) => setEditingValues({...editingValues, description: e.target.value})}
                            className="w-full rounded-lg bg-surface-dark border border-surface-light px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Descrição da categoria"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">Valor Mensal</label>
                          <input
                            type="number"
                            value={editingValues.amount}
                            onChange={(e) => setEditingValues({...editingValues, amount: e.target.value})}
                            className="w-full rounded-lg bg-surface-dark border border-surface-light px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Valor mensal"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 rounded-lg py-2 text-sm font-medium border border-surface-light text-text-secondary hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="rounded-lg py-2 px-4 text-sm font-medium bg-danger text-white hover:bg-danger/90 transition-colors"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => handleSaveEdit(category.id)}
                          className="flex-1 rounded-lg py-2 text-sm font-medium bg-primary text-background-dark hover:bg-primary/90 transition-colors"
                        >
                          Salvar
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </div>
              );
            })}
            
            {/* Add Category Button */}
            <div className="flex justify-center pb-8 pt-4">
              {!showAddCardForm ? (
                <button 
                  onClick={() => setShowAddCardForm(true)}
                  className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
                  Adicionar Categoria de Projeção
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
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/60"
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
              className="w-full max-w-md rounded-t-2xl bg-background-dark p-6 border border-surface-light"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Adicionar Categoria</h3>
                <button 
                  onClick={() => {
                    setShowCategoryPicker(false);
                    setShowCustomCategoryInput(false);
                    setCustomCategoryName('');
                  }}
                  className="text-text-secondary"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <p className="text-sm text-text-secondary mb-4">Selecione uma categoria para adicionar às projeções</p>
              
              {!showCustomCategoryInput ? (
                <>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {categories.map((category) => {
                      const isSelected = projectionCategories.some(cat => cat.name === category);
                      return (
                        <button
                          key={category}
                          onClick={() => handleCategorySelect(category)}
                          disabled={isSelected}
                          className={`p-3 rounded-xl text-sm border text-left truncate ${
                            isSelected 
                              ? 'bg-primary/10 border-primary text-primary cursor-not-allowed' 
                              : 'border-surface-light text-text-secondary hover:text-white hover:border-white/30'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                    {/* Custom Category Button */}
                    <button
                      onClick={() => setShowCustomCategoryInput(true)}
                      className="p-3 rounded-xl text-sm border border-dashed border-surface-light text-text-secondary hover:text-white hover:border-white/30 flex flex-col items-center justify-center"
                    >
                      <span className="material-symbols-outlined">add</span>
                      <span>Nova Categoria</span>
                    </button>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setShowCategoryPicker(false);
                        setShowCustomCategoryInput(false);
                        setCustomCategoryName('');
                      }}
                      className="flex-1 rounded-xl bg-surface-light py-3 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <div className="mb-4">
                    <label className="block text-sm text-text-secondary mb-2">Nome da Nova Categoria</label>
                    <input
                      type="text"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full rounded-lg bg-surface-dark border border-surface-light px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Digite o nome da categoria"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCustomCategoryInput(false);
                        setCustomCategoryName('');
                      }}
                      className="flex-1 rounded-xl bg-surface-light py-3 font-bold"
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
                      className={`flex-1 rounded-xl py-3 font-bold ${
                        customCategoryName.trim() 
                          ? 'bg-primary text-background-dark' 
                          : 'bg-surface-light text-text-secondary cursor-not-allowed'
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
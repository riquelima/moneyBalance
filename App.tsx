import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Success from './pages/Success';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import CategoryExpenses from './pages/CategoryExpenses';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import AddTransaction from './pages/AddTransaction';
import Notifications from './pages/Notifications';
import ProjecaoFutura from './pages/ProjecaoFutura';
import CalendarPage from './pages/CalendarPage';

// Components
import BottomNav from './components/BottomNav';

// Onboarding overlay (Dashboard only)
const OnboardingOverlay: React.FC = () => {
  const location = useLocation();
  const [step, setStep] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps = [
    { id: 'add-fab', text: 'Adicionar transação' },
    { id: 'card-entradas', text: 'Aqui estão suas entradas' },
    { id: 'saldo-total', text: 'Aqui é o seu total de saldo residual após as saídas' },
    { id: 'card-ja-pagos', text: 'Aqui está o total de suas contas pagas' },
    { id: 'card-nao-pagos', text: 'Aqui está suas contas pendentes de pagamento' },
  ];

  useEffect(() => {
    const done = localStorage.getItem('onboardingDone');
    const onDashboard = location.pathname === '/';
    setVisible(!done && onDashboard);
  }, [location.pathname]);

  useEffect(() => {
    if (!visible) return;
    const targetId = steps[step]?.id;
    const el = targetId ? document.querySelector(`[data-onboarding="${targetId}"]`) as HTMLElement | null : null;
    if (el) setRect(el.getBoundingClientRect());
    const onResize = () => {
      if (!targetId) return;
      const el2 = document.querySelector(`[data-onboarding="${targetId}"]`) as HTMLElement | null;
      if (el2) setRect(el2.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize as any);
    };
  }, [visible, step]);

  if (!visible) return null;

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const skip = () => { localStorage.setItem('onboardingDone', 'true'); setVisible(false); };
  const finish = () => { localStorage.setItem('onboardingDone', 'true'); setVisible(false); };

  const arrowVariants = {
    initial: { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.5 } }
  };

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.5 } }
  };

  const tooltipText = steps[step]?.text;
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`onboarding-${step}`}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={overlayVariants}
        className="fixed inset-0 z-[60] pointer-events-none"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {rect && (
          <>
            <div
              className="absolute border-2 border-primary shadow-[0_0_15px_rgba(0,214,143,0.5)] bg-transparent rounded-2xl pointer-events-none"
              style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
            />

            <motion.div
              variants={arrowVariants}
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                top: Math.max(12, rect.top - 48),
                left: rect.left + rect.width / 2 - 16
              }}
            >
              <span className="material-symbols-outlined text-3xl text-primary drop-shadow-md">arrow_downward</span>
            </motion.div>

            <motion.div
              variants={arrowVariants}
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                top: rect.top + rect.height + 8,
                left: rect.left + rect.width / 2 - 16
              }}
            >
              <span className="material-symbols-outlined text-3xl text-primary drop-shadow-md">arrow_upward</span>
            </motion.div>

            <motion.div
              variants={arrowVariants}
              className="absolute max-w-[80vw] bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-3xl p-6 shadow-glass pointer-events-auto"
              role="dialog"
              aria-live="polite"
              style={{
                top: rect.top - 96 > 16 ? rect.top - 110 : rect.top + rect.height + 24,
                left: Math.min(Math.max(16, rect.left), window.innerWidth - 320)
              }}
            >
              <p className="text-sm font-bold leading-relaxed">{tooltipText}</p>
              <div className="mt-4 flex items-center gap-3">
                {step > 0 && (
                  <button onClick={prev} className="px-4 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 pointer-events-auto transition-all">Anterior</button>
                )}
                {!isLast && (
                  <button onClick={next} className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 pointer-events-auto transition-all">Próximo</button>
                )}
                {isLast && (
                  <button onClick={finish} className="px-4 py-2 text-xs font-bold rounded-xl bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-secondary/90 pointer-events-auto transition-all">Finalizar</button>
                )}
                <button onClick={skip} className="ml-auto px-4 py-2 text-xs font-bold rounded-xl text-white/50 hover:text-white pointer-events-auto transition-all">Pular</button>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Layout for authenticated pages
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative flex flex-col min-h-screen pb-32">
      {children}
      <BottomNav />
      <OnboardingOverlay />
    </div>
  );
};

// Wrapper to handle animations
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/success" element={<Success />} />

        {/* App Routes */}
        <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/transactions" element={<AppLayout><Transactions /></AppLayout>} />
        <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
        <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
        <Route path="/calendar" element={<AppLayout><CalendarPage /></AppLayout>} />
        <Route path="/projecao-futura" element={<AppLayout><ProjecaoFutura /></AppLayout>} />
        
        {/* Detail Routes */}
        <Route path="/category/:id" element={<CategoryExpenses />} />
        <Route path="/chat" element={<Chat />} />
        
        {/* Full Screen Modal Routes */}
        <Route path="/add-transaction" element={<AddTransaction />} />
        <Route path="/notifications" element={<Notifications />} />
        
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  );
};

export default App;

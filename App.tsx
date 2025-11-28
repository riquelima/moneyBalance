import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

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

// Components
import BottomNav from './components/BottomNav';

// Layout for authenticated pages
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background-dark text-text-primary pb-20">
      {children}
      <BottomNav />
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

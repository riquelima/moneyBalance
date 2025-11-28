import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Olá! Como posso ajudar a organizar suas finanças hoje?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newMsg = { id: Date.now(), sender: 'user', text: inputValue };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI Response
    setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { 
            id: Date.now() + 1, 
            sender: 'ai', 
            text: 'Entendi. Analisando seus gastos, percebi que você economizou 15% a mais em lazer este mês em comparação com o mês passado. Ótimo trabalho!' 
        }]);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark">
      <header className="flex items-center justify-between p-4 border-b border-surface-light bg-background-dark z-10">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-light">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 className="font-bold text-lg">Chat com IA</h1>
        <button className="p-2 rounded-full hover:bg-surface-light">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}
          >
            {msg.sender === 'ai' && (
                <div className="h-8 w-8 rounded-full bg-primary-blue flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                </div>
            )}
            
            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-text-secondary ml-1">{msg.sender === 'ai' ? 'IA' : 'Você'}</span>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user' 
                        ? 'bg-primary-blue text-white rounded-br-none' 
                        : 'bg-surface-light text-text-primary rounded-bl-none'
                }`}>
                    {msg.text}
                </div>
            </div>

            {msg.sender === 'user' && (
                <div className="h-8 w-8 rounded-full bg-surface-light flex items-center justify-center shrink-0 overflow-hidden">
                     <span className="material-symbols-outlined">person</span>
                </div>
            )}
          </motion.div>
        ))}

        {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary-blue flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                </div>
                <div className="bg-surface-light px-4 py-3 rounded-2xl rounded-bl-none flex gap-1">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-text-secondary rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-text-secondary rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-text-secondary rounded-full" />
                </div>
            </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-background-dark border-t border-surface-light">
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
            {['Maior gasto?', 'Resumo da semana', 'Dicas'].map(chip => (
                <button 
                    key={chip} 
                    onClick={() => setInputValue(chip)}
                    className="whitespace-nowrap px-4 py-2 rounded-full bg-surface-light hover:bg-surface-light/80 text-xs font-medium border border-surface-light"
                >
                    {chip}
                </button>
            ))}
        </div>
        <div className="flex items-center gap-2">
            <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte algo..."
                className="flex-1 bg-surface-light rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50"
            />
            <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!inputValue}
                className="h-12 w-12 rounded-full bg-primary-blue flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="material-symbols-outlined">send</span>
            </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
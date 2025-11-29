import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Olá! Como posso ajudar a organizar suas finanças hoje?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchUserData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return { user: null, transactions: [], budgets: [], categories: [] } as any;
    const { data: transactions } = await supabase
      .from('user_transactions')
      .select('id, description, amount, type, date, is_paid, category_id')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300);
    const catIds = Array.from(new Set((transactions || []).map((x: any) => x.category_id).filter(Boolean)));
    const { data: categories } = catIds.length ? await supabase
      .from('user_categories')
      .select('id, name, type')
      .in('id', catIds) : { data: [] as any };
    const { data: budgets } = await supabase
      .from('user_budgets')
      .select('id, category, limit_amount')
      .eq('user_id', user.id);
    return { user, transactions: transactions || [], budgets: budgets || [], categories: categories || [] };
  };

  const askGemini = async (question: string) => {
    setError(null);
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) throw new Error('missing_api_key');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const { user, transactions, budgets, categories } = await fetchUserData();
    if (!user) return 'Faça login para que eu consiga acessar seus dados e responder.';
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const withinMonths = (d: string, n: number) => {
      const dt = new Date(d);
      const past = new Date(); past.setMonth(past.getMonth() - n);
      return dt >= past;
    };
    const recent = (transactions || []).filter((t: any) => withinMonths(t.date, 6));
    const income = recent.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const expense = recent.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const paid = recent.filter((t: any) => t.type === 'expense' && t.is_paid).reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const pending = recent.filter((t: any) => t.type === 'expense' && !t.is_paid).reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const monthIncome = recent.filter((t: any) => t.type === 'income' && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year).reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const monthExpense = recent.filter((t: any) => t.type === 'expense' && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year).reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const catMap: Record<string, string> = {};
    (categories || []).forEach((c: any) => { if (c?.id) catMap[String(c.id)] = String(c.name || 'Categoria'); });
    const topCats: Record<string, number> = {};
    recent.filter((t: any) => t.type === 'expense').forEach((t: any) => {
      const nm = t.category_id ? catMap[String(t.category_id)] || 'Categoria' : 'Sem Categoria';
      topCats[nm] = (topCats[nm] || 0) + Number(t.amount || 0);
    });
    const top = Object.entries(topCats).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const context = {
      usuario: { id: user.id, email: user.email || '' },
      resumoUltimos6Meses: { totalEntradas: income, totalSaidas: expense, totalPagos: paid, totalPendentes: pending },
      resumoMesAtual: { entradas: monthIncome, saídas: monthExpense },
      categoriasTopDespesas: top.map(([name, amount]) => ({ name, amount })),
      orcamentos: (budgets || []).map((b: any) => ({ categoria: String(b.category || ''), limite: Number(b.limit_amount || 0) })),
      amostraTransacoesRecentes: recent.slice(0, 40).map((t: any) => ({ descricao: t.description || (t.type === 'income' ? 'Entrada' : 'Despesa'), valor: Number(t.amount || 0), tipo: t.type, data: t.date, pago: !!t.is_paid, categoria: t.category_id ? (catMap[String(t.category_id)] || 'Categoria') : 'Sem Categoria' }))
    };
    const prompt = `Você é uma IA financeira. Responda em português do Brasil, usando valores em BRL.
Use apenas os dados fornecidos a seguir como base. Se algo não estiver nos dados, explique a limitação e diga o que seria necessário.
Se apropriado, mostre totais, listas, projeções simples e recomendações objetivas.
Pergunta: ${question}
Dados:
${JSON.stringify(context)}`;
    const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const txt = resp.response.text();
    return txt;
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const newMsg = { id: Date.now(), sender: 'user', text: inputValue };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);
    try {
      const answer = await askGemini(newMsg.text);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: answer }]);
    } catch (e: any) {
      const msg = e?.message === 'missing_api_key' ? 'Configure a chave da Gemini em VITE_GEMINI_API_KEY para ativar a IA.' : 'Ocorreu um erro ao processar sua pergunta.';
      setError(msg);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: msg }]);
    } finally {
      setIsTyping(false);
    }
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
        {error && (
          <p className="mt-2 text-sm text-danger">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Chat;

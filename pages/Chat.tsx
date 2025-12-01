import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import ReactMarkdown from 'react-markdown';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Olá! Como posso ajudar a organizar suas finanças hoje?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechBufferRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if ((prof as any)?.avatar_url) setAvatarUrl((prof as any).avatar_url as string);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data } = await supabase
        .from('user_chat_messages')
        .select('id, role, message, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(200);
      const arr = (data || []).map((d: any) => ({ id: d.id, sender: d.role, text: d.message }));
      if (arr.length) setMessages(arr as any);
    })();
  }, []);

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
    const resp = await fetch('https://n8n.intelektus.tech/webhook/moneyBalanceChatEntry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context })
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(errText || 'webhook_request_failed');
    }
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await resp.json();
      let txt: any = undefined;
      if (Array.isArray(data)) {
        const first = data[0] || {};
        txt = first.output ?? first.message ?? first.text ?? first.answer ?? undefined;
      } else {
        txt = data.output ?? data.message ?? data.text ?? data.answer ?? undefined;
      }
      if (typeof txt === 'string') return txt;
      return JSON.stringify(data);
    }
    return await resp.text();
  };

  const persistMessage = async (role: 'user' | 'ai', text: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    await supabase
      .from('user_chat_messages')
      .insert({ user_id: user.id, role, message: text });
  };

  const sendText = async (text: string) => {
    const question = String(text || '').trim();
    if (!question) return;
    const newMsg = { id: Date.now(), sender: 'user', text: question };
    setMessages(prev => [...prev, newMsg]);
    setIsTyping(true);
    try {
      await persistMessage('user', question);
      const answer = await askGemini(question);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: answer }]);
      await persistMessage('ai', answer);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Ocorreu um erro ao contactar o webhook.';
      setError(msg);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: msg }]);
      await persistMessage('ai', msg);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const txt = inputValue.trim();
    if (!txt) return;
    setInputValue('');
    await sendText(txt);
  };

  const startRecording = () => {
    try {
      setError(null);
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setError('Seu navegador não suporta reconhecimento de voz.');
        return;
      }
      const rec = new SR();
      recognitionRef.current = rec;
      speechBufferRef.current = '';
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event: any) => {
        let full = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          full += res[0].transcript || '';
        }
        speechBufferRef.current = full;
      };
      rec.onerror = (e: any) => {
        setError('Erro na captura de voz.');
      };
      rec.onend = () => {
        setIsRecording(false);
      };
      rec.start();
      setIsRecording(true);
    } catch {
      setError('Não foi possível iniciar a gravação.');
    }
  };

  const stopRecordingAndSend = async () => {
    try {
      const rec = recognitionRef.current;
      if (rec) {
        try { rec.stop(); } catch {}
      }
      const transcript = String(speechBufferRef.current || '').trim();
      speechBufferRef.current = '';
      setIsRecording(false);
      if (transcript) {
        await sendText(transcript);
      }
    } catch {
      // silently ignore
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
                <div className="h-8 w-8 rounded-full shrink-0 overflow-hidden bg-surface-light">
                    <img src="https://cdn-icons-png.flaticon.com/512/10881/10881863.png" alt="IA" className="h-full w-full object-cover" />
                </div>
            )}
            
            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-text-secondary ml-1">{msg.sender === 'ai' ? 'Good Money - Assitente IA' : 'Você'}</span>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed font-zain font-light ${
                    msg.sender === 'user' 
                        ? 'bg-primary-blue text-white rounded-br-none' 
                        : 'bg-surface-light text-text-primary rounded-bl-none'
                }`}>
                    {msg.sender === 'ai' ? (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                </div>
            </div>

            {msg.sender === 'user' && (
                <div className="h-8 w-8 rounded-full shrink-0 overflow-hidden bg-surface-light">
                     {avatarUrl ? (
                       <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                     ) : (
                       <span className="material-symbols-outlined">person</span>
                     )}
                </div>
            )}
          </motion.div>
        ))}

        {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-3">
                 <div className="h-8 w-8 rounded-full shrink-0 overflow-hidden bg-surface-light">
                    <img src="https://cdn-icons-png.flaticon.com/512/10881/10881863.png" alt="IA" className="h-full w-full object-cover" />
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
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar snap-x snap-mandatory">
            {[
              'Maior gasto mês atual',
              'Resumo do mês atual',
              'O que posso te perguntar?',
              'Estou dentro do meu orçamento para esse mês?',
              'Qual a soma de todas as entradas futuras recorrentes para 2026?',
              'Qual a soma de todas as saídas futuras recorrentes para 2026?',
              'Onde devo economizar?'
            ].map((chip) => (
              <div key={chip} className="shrink-0 snap-start">
                <button 
                  onClick={() => setInputValue(chip)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="no-callout select-none whitespace-nowrap px-4 py-2 rounded-full bg-surface-light hover:bg-surface-light/80 text-xs font-medium border border-surface-light"
                >
                  {chip}
                </button>
              </div>
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
              onContextMenu={(e) => e.preventDefault()}
              className="no-callout select-none h-12 w-12 rounded-full bg-primary-blue flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">send</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onPointerDown={startRecording}
              onPointerUp={stopRecordingAndSend}
              onPointerLeave={stopRecordingAndSend}
              disabled={isTyping}
              onContextMenu={(e) => e.preventDefault()}
              className={`no-callout select-none h-12 w-12 rounded-full flex items-center justify-center text-white border border-surface-light ${isRecording ? 'bg-primary-teal animate-pulse' : 'bg-surface-light hover:bg-surface-light/80'} disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Segure para falar"
            >
              <span className="material-symbols-outlined">mic</span>
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

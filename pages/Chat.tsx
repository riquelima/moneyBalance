import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { parseLocalISODate, toLocalISO } from '../utils/date';
import ReactMarkdown from 'react-markdown';

export const monthNamePT = (m: number) => (['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m - 1] || '');
export const buildMonthly2026 = (normalized: any[]) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const byMonth = months.map((m) => {
    const transacoes = normalized.filter((t: any) => {
      const d = parseLocalISODate(t.data);
      return d.getFullYear() === 2026 && (d.getMonth() + 1) === m;
    }).sort((a: any, b: any) => {
      const da = parseLocalISODate(a.data).getTime();
      const db = parseLocalISODate(b.data).getTime();
      const ta = Date.parse(String(a.timestamp || ''));
      const tb = Date.parse(String(b.timestamp || ''));
      if (da !== db) return da - db;
      if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
      return 0;
    });
    const entradas = transacoes.filter((t: any) => t.tipo === 'entrada');
    const saidas = transacoes.filter((t: any) => t.tipo === 'saída');
    const totalEntradas = entradas.reduce((s: number, t: any) => s + Number(t.valor_num || 0), 0);
    const totalSaidas = saidas.reduce((s: number, t: any) => s + Number(t.valor_num || 0), 0);
    const resumo = {
      totalEntradas: Number(totalEntradas.toFixed(2)),
      totalSaidas: Number(totalSaidas.toFixed(2)),
      saldo: Number((totalEntradas - totalSaidas).toFixed(2)),
      quantidadeTransacoes: transacoes.length
    };
    return {
      header: `${monthNamePT(m)} 2026`,
      ano: 2026,
      mes: m,
      entradas,
      saidas,
      transacoes,
      resumo
    };
  });
  return byMonth;
};
export const buildWebhookPayload = (user: any, transactions: any[], categories: any[], profile: any, chatMessages: any[]) => {
  const catMap: Record<string, string> = {};
  (categories || []).forEach((c: any) => { if (c?.id) catMap[String(c.id)] = String(c.name || 'Categoria'); });
  const normalized = (transactions || []).map((t: any) => {
    const dt = typeof t.date === 'string' ? t.date : toLocalISO(parseLocalISODate(String(t.date || '')));
    const tipo = t.type === 'income' ? 'entrada' : 'saída';
    const nome = String(t.description || (t.type === 'income' ? 'Entrada' : 'Despesa'));
    const categoria = t.category_id ? (catMap[String(t.category_id)] || 'Categoria') : 'Sem Categoria';
    const valorNum = Number(t.amount || 0);
    const valor = valorNum.toFixed(2);
    return {
      id: String(t.id || ''),
      nomeTransacao: nome,
      descricao: String(t.description || ''),
      valor,
      valor_num: Number(valor),
      data: dt,
      timestamp: String(t.created_at || ''),
      tipo,
      categoria,
      pago: !!t.is_paid
    };
  });
  const group: Record<string, any> = {};
  normalized.forEach((t: any) => {
    const d = parseLocalISODate(t.data);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!group[key]) group[key] = { ano: y, mes: m, entradas: [], saidas: [], transacoes: [], categoriasPorNome: {} as Record<string, any[]> };
    if (t.tipo === 'entrada') group[key].entradas.push(t);
    else group[key].saidas.push(t);
    group[key].transacoes.push(t);
    if (!group[key].categoriasPorNome[t.categoria]) group[key].categoriasPorNome[t.categoria] = [];
    group[key].categoriasPorNome[t.categoria].push(t);
  });
  Object.keys(group).forEach((k) => {
    const g = group[k];
    g.transacoes.sort((a: any, b: any) => {
      const da = parseLocalISODate(a.data).getTime();
      const db = parseLocalISODate(b.data).getTime();
      const ta = Date.parse(String(a.timestamp || ''));
      const tb = Date.parse(String(b.timestamp || ''));
      if (da !== db) return da - db;
      if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
      return 0;
    });
    const te = g.entradas.reduce((s: number, t: any) => s + Number(t.valor_num || 0), 0);
    const ts = g.saidas.reduce((s: number, t: any) => s + Number(t.valor_num || 0), 0);
    g.resumo = {
      totalEntradas: Number(te.toFixed(2)),
      totalSaidas: Number(ts.toFixed(2)),
      saldo: Number((te - ts).toFixed(2)),
      quantidadeTransacoes: (g.transacoes || []).length
    };
  });
  const historico = Object.values(group).sort((a: any, b: any) => {
    const da = new Date(a.ano, a.mes - 1, 1).getTime();
    const db = new Date(b.ano, b.mes - 1, 1).getTime();
    return da - db;
  });
  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mesAtual = group[nowKey] || { ano: now.getFullYear(), mes: now.getMonth() + 1, entradas: [], saidas: [], categoriasPorNome: {} };
  const nomeMeta = (user?.user_metadata?.name as string) || '';
  const lastMeta = (user?.user_metadata?.lastName as string) || '';
  const usernameMeta = (user?.user_metadata?.username as string) || '';
  const display = (profile?.display_name as string) || (nomeMeta && lastMeta ? `${nomeMeta} ${lastMeta}` : (nomeMeta || usernameMeta || user?.email || 'Usuário'));
  const cliente = {
    id: user?.id || '',
    nome: display,
    email: user?.email || '',
    avatarUrl: profile?.avatar_url || ''
  };
  const meses2026 = buildMonthly2026(normalized);
  const ano2026Meses: Record<string, any> = meses2026.reduce((acc: Record<string, any>, m: any) => {
    const key = `2026-${String(m.mes).padStart(2, '0')}`;
    acc[key] = m;
    return acc;
  }, {});
  const chatMensagens = (chatMessages || []).map((m: any) => ({
    id: String(m.id || ''),
    papel: String(m.role || ''),
    texto: String(m.message || ''),
    created_at: String(m.created_at || '')
  }));
  const payload = {
    cliente,
    historico,
    mesAtual,
    ano2026: ano2026Meses,
    meses2026,
    chatMensagens,
    metadados: {
      totalRegistros: normalized.length,
      geradoEm: toLocalISO(new Date())
    }
  };
  return payload;
};

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
    if (!user) return { user: null, transactions: [], budgets: [], categories: [], profile: null, txCount: 0, chatMessages: [], chatCount: 0 } as any;
    // Count total transactions for integrity check
    const { count: txCount } = await supabase
      .from('user_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    // Paginate all transactions in chunks of 1000
    const pageSize = 1000;
    const pages = Math.max(1, Math.ceil((txCount || 0) / pageSize));
    let all: any[] = [];
    for (let i = 0; i < pages; i++) {
      const from = i * pageSize;
      const to = from + pageSize - 1;
      const { data: chunk } = await supabase
        .from('user_transactions')
        .select('id, description, amount, type, date, is_paid, category_id, created_at')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
        .range(from, to);
      if (Array.isArray(chunk)) all = all.concat(chunk);
    }
    // Fetch all chat messages
    const { count: chatCount } = await supabase
      .from('user_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    const chatPageSize = 1000;
    const chatPages = Math.max(1, Math.ceil((chatCount || 0) / chatPageSize));
    let allMsgs: any[] = [];
    for (let i = 0; i < chatPages; i++) {
      const from = i * chatPageSize;
      const to = from + chatPageSize - 1;
      const { data: chunk } = await supabase
        .from('user_chat_messages')
        .select('id, role, message, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .range(from, to);
      if (Array.isArray(chunk)) allMsgs = allMsgs.concat(chunk);
    }
    // Fetch all categories referenced
    const catIds = Array.from(new Set((all || []).map((x: any) => x.category_id).filter(Boolean)));
    const { data: categories } = catIds.length ? await supabase
      .from('user_categories')
      .select('id, name, type')
      .in('id', catIds) : { data: [] as any };
    // Budgets (optional for context)
    const { data: budgets } = await supabase
      .from('user_budgets')
      .select('id, category, limit_amount, year, month')
      .eq('user_id', user.id);
    // Basic profile info if available
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    return { user, transactions: all, budgets: budgets || [], categories: categories || [], profile: profile || null, txCount: txCount || (all?.length || 0), chatMessages: allMsgs, chatCount: chatCount || (allMsgs?.length || 0) };
  };

  // helpers moved to top-level exports

  const askGemini = async (question: string) => {
    setError(null);
    const { user, transactions, budgets, categories, profile, txCount, chatMessages, chatCount } = await fetchUserData();
    if (!user) return 'Faça login para que eu consiga acessar seus dados e responder.';
    // Integrity validations
    if ((transactions || []).length < (txCount || 0)) {
      throw new Error('Nem todas as transações foram carregadas. Tente novamente.');
    }
    if ((chatMessages || []).length < (chatCount || 0)) {
      throw new Error('Nem todas as mensagens do chat foram carregadas.');
    }
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const withinMonths = (d: string, n: number) => {
      const dt = parseLocalISODate(d);
      const past = new Date(); past.setMonth(past.getMonth() - n);
      return dt >= past;
    };
    const recent = (transactions || []).filter((t: any) => withinMonths(t.date, 6));
    const income = recent.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const expense = recent.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const paid = recent.filter((t: any) => t.type === 'expense' && t.is_paid).reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const pending = recent.filter((t: any) => t.type === 'expense' && !t.is_paid).reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const monthIncome = recent.filter((t: any) => {
      const dt = parseLocalISODate(t.date);
      return t.type === 'income' && dt.getMonth() === month && dt.getFullYear() === year;
    }).reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
    const monthExpense = recent.filter((t: any) => {
      const dt = parseLocalISODate(t.date);
      return t.type === 'expense' && dt.getMonth() === month && dt.getFullYear() === year;
    }).reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
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
      amostraTransacoesRecentes: recent.slice(0, 40).map((t: any) => ({ descricao: t.description || (t.type === 'income' ? 'Entrada' : 'Despesa'), valor: Number(t.amount || 0), tipo: t.type, data: t.date, pago: !!t.is_paid, categoria: t.category_id ? (catMap[String(t.category_id)] || 'Categoria') : 'Sem Categoria' })),
      mesAtualDetalhado: (() => {
        const dt = new Date();
        const y = dt.getFullYear();
        const m = dt.getMonth();
        const cur = (transactions || []).filter((t: any) => {
          const d = parseLocalISODate(t.date);
          return d.getFullYear() === y && d.getMonth() === m;
        }).map((t: any) => ({
          nomeTransacao: String(t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')),
          descricao: String(t.description || ''),
          valor: Number(t.amount || 0),
          data: typeof t.date === 'string' ? t.date : toLocalISO(parseLocalISODate(String(t.date || ''))),
          tipo: t.type === 'income' ? 'entrada' : 'saída',
          categoria: t.category_id ? (catMap[String(t.category_id)] || 'Categoria') : 'Sem Categoria',
          pago: !!t.is_paid
        }));
        return cur;
      })(),
      ano2026Detalhado: (() => {
        const arr = (transactions || []).filter((t: any) => {
          const d = parseLocalISODate(t.date);
          return d.getFullYear() === 2026;
        }).map((t: any) => ({
          nomeTransacao: String(t.description || (t.type === 'income' ? 'Entrada' : 'Despesa')),
          descricao: String(t.description || ''),
          valor: Number(t.amount || 0),
          data: typeof t.date === 'string' ? t.date : toLocalISO(parseLocalISODate(String(t.date || ''))),
          tipo: t.type === 'income' ? 'entrada' : 'saída',
          categoria: t.category_id ? (catMap[String(t.category_id)] || 'Categoria') : 'Sem Categoria',
          pago: !!t.is_paid
        }));
        return arr;
      })(),
      meses2026: (() => {
        const catMapLocal: Record<string, string> = {};
        (categories || []).forEach((c: any) => { if (c?.id) catMapLocal[String(c.id)] = String(c.name || 'Categoria'); });
        const normalizedLocal = (transactions || []).map((t: any) => {
          const dt = typeof t.date === 'string' ? t.date : toLocalISO(parseLocalISODate(String(t.date || '')));
          const tipo = t.type === 'income' ? 'entrada' : 'saída';
          const nome = String(t.description || (t.type === 'income' ? 'Entrada' : 'Despesa'));
          const categoria = t.category_id ? (catMapLocal[String(t.category_id)] || 'Categoria') : 'Sem Categoria';
          const valorNum = Number(t.amount || 0);
          const valor = valorNum.toFixed(2);
          return {
            id: String(t.id || ''),
            nomeTransacao: nome,
            descricao: String(t.description || ''),
            valor,
            valor_num: Number(valor),
            data: dt,
            timestamp: String(t.created_at || ''),
            tipo,
            categoria,
            pago: !!t.is_paid
          };
        });
        return buildMonthly2026(normalizedLocal);
      })()
    };
    const payload = buildWebhookPayload(user, transactions, categories, profile, chatMessages);
    // Basic required fields validation
    if (!payload.cliente?.id || !payload.cliente?.email) {
      throw new Error('Dados cadastrais incompletos para envio ao webhook.');
    }
    if ((payload.metadados?.totalRegistros || 0) <= 0) {
      throw new Error('Nenhuma transação encontrada para envio ao webhook.');
    }
    if (!Array.isArray(payload.meses2026) || payload.meses2026.length !== 12) {
      throw new Error('Estrutura mensal de 2026 incompleta.');
    }
    const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
    payload.meses2026.forEach((m: any) => {
      const te = m.entradas.reduce((s: number, t: any) => s + Number(t.valor_num || 0), 0);
      const ts = m.saidas.reduce((s: number, t: any) => s + Number(t.valor_num || 0), 0);
      if (Number(m.resumo.totalEntradas || 0) !== Number(te.toFixed(2))) throw new Error('Total de entradas inconsistente em 2026.');
      if (Number(m.resumo.totalSaidas || 0) !== Number(ts.toFixed(2))) throw new Error('Total de saídas inconsistente em 2026.');
      m.transacoes.forEach((t: any) => {
        if (!isISODate(t.data)) throw new Error('Data fora do formato ISO.');
        if (isNaN(Date.parse(String(t.timestamp || '')))) throw new Error('Timestamp inválido.');
      });
    });
    const resp = await fetch('https://n8n.intelektus.tech/webhook/moneyBalanceChatEntry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context, meses2026: payload.meses2026, payload })
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
    <div className="flex flex-col h-screen bg-white dark:bg-background-dark relative font-display">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white dark:bg-surface-dark border-2 border-dark dark:border-white shadow-neo"
      >
        <motion.button whileTap={{ scale: 0.95, y: 2 }} onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center rounded-sm border-2 border-dark dark:border-white bg-white dark:bg-surface-dark hover:bg-surface-light dark:hover:bg-gray-800">
          <span className="material-symbols-outlined text-dark dark:text-white">arrow_back_ios_new</span>
        </motion.button>
        <h1 className="text-dark dark:text-white font-black text-lg uppercase">Chat com IA</h1>
        <motion.button whileTap={{ scale: 0.95, y: 2 }} className="h-10 w-10 flex items-center justify-center rounded-sm border-2 border-dark dark:border-white bg-white dark:bg-surface-dark hover:bg-surface-light dark:hover:bg-gray-800">
          <span className="material-symbols-outlined text-dark dark:text-white">more_vert</span>
        </motion.button>
      </motion.header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-surface-dark">
        {messages.map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}
          >
            {msg.sender === 'ai' && (
                <div className="h-8 w-8 rounded-sm shrink-0 overflow-hidden bg-white dark:bg-surface-dark border-2 border-dark dark:border-white">
                    <img src="https://cdn-icons-png.flaticon.com/512/10881/10881863.png" alt="IA" className="h-full w-full object-cover" />
                </div>
            )}
            
            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-text-secondary ml-1">{msg.sender === 'ai' ? 'Good Money - Assitente IA' : 'Você'}</span>
                {msg.sender === 'ai' ? (
                  <motion.div className="px-4 py-3 rounded-sm text-sm font-bold bg-white dark:bg-surface-dark border-2 border-dark dark:border-white text-dark dark:text-white shadow-neo-sm">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </motion.div>
                ) : (
                  <motion.div className="px-4 py-3 rounded-sm text-sm font-bold bg-white dark:bg-surface-dark border-2 border-dark dark:border-white text-dark dark:text-white shadow-neo-sm">
                    {msg.text}
                  </motion.div>
                )}
            </div>

            {msg.sender === 'user' && (
                <div className="h-8 w-8 rounded-sm shrink-0 overflow-hidden bg-white dark:bg-surface-dark border-2 border-dark dark:border-white">
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
                 <div className="h-8 w-8 rounded-sm shrink-0 overflow-hidden bg-white dark:bg-surface-dark border-2 border-dark dark:border-white">
                    <img src="https://cdn-icons-png.flaticon.com/512/10881/10881863.png" alt="IA" className="h-full w-full object-cover" />
                </div>
                <div className="bg-white dark:bg-surface-dark px-3 py-2 rounded-sm border-2 border-dark dark:border-white flex gap-1">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-text-secondary rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-text-secondary rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-text-secondary rounded-full" />
                </div>
            </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

        <div className="p-4 bg-white dark:bg-surface-dark border-t-2 border-dark dark:border-white">
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
                <motion.button 
                  whileTap={{ scale: 0.95, y: 2 }}
                  onClick={() => setInputValue(chip)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="no-callout select-none whitespace-nowrap px-4 py-2 rounded-sm bg-white dark:bg-surface-dark text-dark dark:text-white border-2 border-dark dark:border-white shadow-neo-sm hover:bg-surface-light dark:hover:bg-gray-800 text-xs font-bold uppercase"
                >
                  {chip}
                </motion.button>
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
              className="flex-1 bg-white dark:bg-surface-dark rounded-sm px-4 py-3 text-sm border-2 border-dark dark:border-white text-dark dark:text-white placeholder:text-text-secondary focus:outline-none"
            />
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!inputValue}
              onContextMenu={(e) => e.preventDefault()}
              className="no-callout select-none h-12 w-12 rounded-sm bg-primary flex items-center justify-center text-white border-2 border-dark dark:border-white shadow-neo-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">send</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, y: 2 }}
              onPointerDown={startRecording}
              onPointerUp={stopRecordingAndSend}
              onPointerLeave={stopRecordingAndSend}
              disabled={isTyping}
              onContextMenu={(e) => e.preventDefault()}
              className={`no-callout select-none h-12 w-12 rounded-sm flex items-center justify-center text-white border-2 border-dark dark:border-white relative ${isRecording ? 'bg-danger ring-4 ring-danger/40 animate-pulse' : 'bg-secondary'} shadow-neo-sm disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={isRecording ? 'Gravando, solte para enviar' : 'Segure para falar'}
            >
              <span className="material-symbols-outlined">{isRecording ? 'fiber_manual_record' : 'mic'}</span>
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

import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getChatResponse, ChatMessage } from '../../services/chatService';

export const AIChat: React.FC = () => {
  const { summary, rangeSummary, period, selectedTickers, data } = useDashboard();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getChatResponse(input, messages, {
        summary,
        rangeSummary,
        period,
        currentTickers: selectedTickers,
        chartData: data,
        language,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `${t('aiChat.errorPrefix')}: ${error?.message || t('aiChat.error')}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[400px] transition-colors duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-100 flex items-center justify-between bg-slate-950/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <h4 className="text-xs font-black text-slate-300 dark:text-slate-300 light:text-slate-900 uppercase tracking-widest">
            {t('aiChat.title')}
          </h4>
        </div>
        <span className="text-[9px] text-slate-500 font-bold uppercase">{t('aiChat.liveBadge')}</span>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-3 bg-blue-600/10 rounded-full text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 light:text-slate-400 font-medium leading-relaxed">
              {t('aiChat.emptyHint')}
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-800 dark:bg-slate-800 light:bg-slate-100 text-slate-200 dark:text-slate-200 light:text-slate-800 rounded-tl-none border border-slate-700 dark:border-slate-700 light:border-slate-200'
            }`}>
              {msg.content}
            </div>
            <span className="text-[8px] text-slate-600 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-slate-800 dark:bg-slate-800 light:bg-slate-100 p-2 rounded-2xl rounded-tl-none border border-slate-700 dark:border-slate-700 light:border-slate-200">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-slate-950/30 border-t border-slate-800 dark:border-slate-800 light:border-slate-100">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('aiChat.placeholder')}
            className="w-full bg-slate-900 dark:bg-slate-900 light:bg-slate-50 border border-slate-700 dark:border-slate-700 light:border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-xs text-slate-200 dark:text-slate-200 light:text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:text-blue-400 disabled:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </form>
    </div>
  );
};

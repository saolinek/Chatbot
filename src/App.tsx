import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings as SettingsIcon, X, User, Bot, AlertCircle, Key, Plus, Check, Search, Sparkles, Trash2, ArrowRight, MessageSquareCode, Sliders, Database, Brain, Palette, RotateCcw, SlidersHorizontal, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Settings } from './types';

const POPULAR_MODELS = [
  { id: 'openrouter/free', name: 'OpenRouter Free', provider: 'OpenRouter', tier: 'Free' },
  { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3.8B (Free)', provider: 'Meta', tier: 'Free' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', tier: 'Premium' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', tier: 'Premium' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', tier: 'Reasoning' },
];

const defaultSettings: Settings = {
  apiKey: '',
  model: 'openrouter/free',
  systemPrompt: 'You are a helpful, minimalist AI assistant. Keep responses clear and concise. Odpovídej vždy česky',
  temperature: 0.7,
  maxTokens: 2048,
  memoryMode: 'limit',
  maxHistoryMessages: 10,
  userNickname: 'Uživatel',
  aiPersonaName: 'Asistent',
  userFacts: [
    'Uživatel preferuje stručné a jasné odpovědi.',
    'Uživatel komunikuje výhradně v češtině.'
  ],
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'memory'>('general');
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [allModels, setAllModels] = useState<any[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [newFact, setNewFact] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Auto-hide toast notification
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddFact = () => {
    if (!newFact.trim()) return;
    const currentFacts = settings.userFacts || [];
    setSettings((prev) => ({
      ...prev,
      userFacts: [...currentFacts, newFact.trim()],
    }));
    setNewFact('');
  };

  const handleRemoveFact = (index: number) => {
    const currentFacts = settings.userFacts || [];
    setSettings((prev) => ({
      ...prev,
      userFacts: currentFacts.filter((_, i) => i !== index),
    }));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  // Load settings initially
  useEffect(() => {
    const savedStats = localStorage.getItem('minimal-chat-settings');
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      setSettings({ ...defaultSettings, ...parsed });
      setTempApiKey(parsed.apiKey || '');
    }
    
    const savedMessages = localStorage.getItem('minimal-chat-messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save settings on change
  useEffect(() => {
    localStorage.setItem('minimal-chat-settings', JSON.stringify(settings));
  }, [settings]);

  // Save messages on change
  useEffect(() => {
    localStorage.setItem('minimal-chat-messages', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle click outside model picker to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target as Node)) {
        setIsModelPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Soft fetch models list from OpenRouter when API Key is active
  useEffect(() => {
    if (!settings.apiKey) return;

    const fetchAllModels = async () => {
      setIsFetchingModels(true);
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result && result.data) {
            const mapped = result.data.map((m: any) => {
              if (m.id === 'openrouter/auto') {
                return { ...m, id: 'openrouter/free', name: 'OpenRouter Free' };
              }
              return m;
            });
            setAllModels(mapped);
          }
        }
      } catch (e) {
        console.error('Failed to fetch OpenRouter models:', e);
      } finally {
        setIsFetchingModels(false);
      }
    };

    fetchAllModels();
  }, [settings.apiKey]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!settings.apiKey) {
      setError('Please provide your OpenRouter API Key first.');
      return;
    }

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // 🧠 Správa paměti: V aktuálním chatu se posílá celá historie konverzace bez dodatečného omezování
      const historyToSend = [...newMessages];

      // Propojení základních instrukcí s pamětí (fakta o uživateli)
      const factsText = (settings.userFacts && settings.userFacts.length > 0)
        ? settings.userFacts.map(fact => `- ${fact}`).join('\n')
        : '';

      const memoryInsert = `\n\n[TRVALÁ PAMĚŤ (Fakta o uživateli, která musíš znát a respektovat v každé odpovědi)]:\n- Jméno uživatele: ${settings.userNickname || 'Uživatel'}${factsText ? '\n' + factsText : ''}`;

      const memoryInstructions = `\n\n[POKYNY PRO AUTOMATICKÉ UKLÁDÁNÍ PAMĚTI]:
Kdykoliv se během konverzace dozvíš novou podstatnou trvalou informaci nebo fakt o uživateli (věk, práce, zájmy, rodina, jméno, preference atd.), automaticky ji ulož tak, že na konec své odpovědi připojíš tag:
<save_fact>Stručný a jasný fakt o uživateli v češtině (např. Uživatel pracuje v marketingu)</save_fact>
Pokud tě uživatel požádá, abys nějakou dříve uloženou informaci zapomněl, nebo pokud se dříve uložený fakt změní, odstraň ho takto:
<forget_fact>Přesný text původního faktu k odstranění</forget_fact>
Tyto tagy budou aplikací před uživatelem skryty, uvidíš je jen ty v příští paměti. Ukládej pouze relevantní fakty.`;

      const dynamicSystemPrompt = settings.systemPrompt + memoryInsert + memoryInstructions;

      const messagesToSend = [
        { role: 'system', content: dynamicSystemPrompt },
        ...historyToSend,
      ];

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'Minimal Chat'
        },
        body: JSON.stringify({
          messages: messagesToSend,
          model: settings.model,
          temperature: settings.temperature ?? 0.7,
          max_tokens: settings.maxTokens ?? 2048,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to communicate with OpenRouter');
      }

      if (data.choices && data.choices[0]) {
        const assistantMessage: Message = data.choices[0].message;
        let content = assistantMessage.content || '';

        // Extract save_fact and forget_fact tags
        const saveFactRegex = /<save_fact>([\s\S]*?)<\/save_fact>/gi;
        const forgetFactRegex = /<forget_fact>([\s\S]*?)<\/forget_fact>/gi;

        const factsToAdd: string[] = [];
        let match;
        while ((match = saveFactRegex.exec(content)) !== null) {
          if (match[1].trim()) factsToAdd.push(match[1].trim());
        }

        const factsToRemove: string[] = [];
        while ((match = forgetFactRegex.exec(content)) !== null) {
          if (match[1].trim()) factsToRemove.push(match[1].trim());
        }

        // Clean content from tags
        const cleanedContent = content
          .replace(saveFactRegex, '')
          .replace(forgetFactRegex, '')
          .trim();

        const finalAssistantMessage: Message = {
          ...assistantMessage,
          content: cleanedContent
        };

        setMessages((prev) => [...prev, finalAssistantMessage]);

        // Process state updates for facts
        if (factsToAdd.length > 0 || factsToRemove.length > 0) {
          setSettings((prev) => {
            let updatedFacts = [...(prev.userFacts || [])];
            
            factsToAdd.forEach(fact => {
              if (!updatedFacts.some(f => f.toLowerCase() === fact.toLowerCase())) {
                updatedFacts.push(fact);
              }
            });

            factsToRemove.forEach(fact => {
              updatedFacts = updatedFacts.filter(f => f.toLowerCase() !== fact.toLowerCase() && !f.toLowerCase().includes(fact.toLowerCase()));
            });

            return {
              ...prev,
              userFacts: updatedFacts
            };
          });

          if (factsToAdd.length > 0) {
            setToast({
              message: `🧠 Paměť: Automaticky uloženo "${factsToAdd[0]}"`,
              type: 'success'
            });
          } else if (factsToRemove.length > 0) {
            setToast({
              message: `🧹 Paměť: Odstraněno "${factsToRemove[0]}"`,
              type: 'info'
            });
          }
        }
      } else {
        throw new Error('Unexpected API response structure.');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempApiKey.trim()) {
      setSettings(prev => ({ ...prev, apiKey: tempApiKey.trim() }));
      setError(null);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem('minimal-chat-messages');
    setError(null);
  };

  // Filter models shown in the list
  const filteredModels = allModels.length > 0 && modelSearch.trim()
    ? allModels.filter(m => 
        m.name?.toLowerCase().includes(modelSearch.toLowerCase()) || 
        m.id?.toLowerCase().includes(modelSearch.toLowerCase())
      ).slice(0, 8)
    : POPULAR_MODELS.filter(m => 
        m.name.toLowerCase().includes(modelSearch.toLowerCase()) || 
        m.id.toLowerCase().includes(modelSearch.toLowerCase())
      );

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 text-gray-900 font-sans selection:bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-950 text-white rounded-xl hover:bg-gray-800 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Nový chat"
          >
            <Plus size={13} />
            <span>Nový chat</span>
          </button>
        </div>
        
        <div 
          onClick={() => setIsModelPickerOpen(true)}
          className="hidden sm:block text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors font-mono cursor-pointer select-none"
        >
          {settings.model}
        </div>
        
        <div className="relative flex items-center gap-2">
          <span 
            onClick={() => setIsModelPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white border border-gray-200/80 text-gray-700 hover:bg-gray-50 transition-all cursor-pointer select-none shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span>{settings.model.split('/').pop()}</span>
          </span>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all rounded-xl active:scale-95"
            title="Nastavení"
          >
            <SettingsIcon size={16} />
          </button>

          {/* Floating Model Picker Popover */}
          <AnimatePresence>
            {isModelPickerOpen && (
              <motion.div
                ref={modelPickerRef}
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                className="absolute top-12 right-0 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30"
              >
                <div className="p-3 border-b border-gray-150 bg-gray-50 flex items-center gap-2">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Hledat modely..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="w-full bg-transparent border-none text-xs focus:outline-none placeholder:text-gray-400 font-sans text-gray-800"
                    autoFocus
                  />
                  {modelSearch && (
                    <button onClick={() => setModelSearch('')} className="p-0.5 hover:bg-gray-200 rounded-full">
                      <X size={10} className="text-gray-400" />
                    </button>
                  )}
                </div>
                
                <div className="max-h-60 overflow-y-auto p-1.5">
                  <div className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase px-2.5 py-1">
                    {allModels.length > 0 && modelSearch ? 'Výsledky hledání' : 'Systémové modely'}
                  </div>
                  
                  {filteredModels.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      Žádné modely nenalezeny
                    </div>
                  ) : (
                    filteredModels.map((m) => {
                      const isSelected = settings.model === (m.id || m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSettings(prev => ({ ...prev, model: m.id }));
                            setIsModelPickerOpen(false);
                          }}
                          className="w-full flex items-center justify-between text-left px-2.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {m.name || m.id.split('/').pop()}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate font-mono">
                              {m.id}
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={14} className="text-gray-900 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Container */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center select-none my-auto">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20 }}
                  className="w-16 h-16 rounded-3xl bg-gray-950 text-white flex items-center justify-center mb-6 shadow-xl shadow-gray-900/10 border border-gray-800"
                >
                  <Bot className="w-7 h-7 text-white" />
                </motion.div>
                <motion.h1 
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-[20px] font-bold text-gray-900 tracking-tight"
                >
                  Jak vám dnes mohu pomoci?
                </motion.h1>
                {!settings.apiKey && (
                  <motion.button
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => setIsSettingsOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-gray-950 text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-all border border-gray-950/20 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Key size={14} />
                    <span>Zadat API klíč v nastavení</span>
                  </motion.button>
                )}
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${msg.role === 'user' ? 'bg-gray-950 text-white border-gray-950' : 'bg-white text-gray-700 border-gray-200'}`}>
                    {msg.role === 'user' ? (
                      <User size={13} />
                    ) : (
                      <Bot size={13} />
                    )}
                  </div>
                  
                  <div
                    className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-[0_2px_12px_rgba(0,0,0,0.01)] whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gray-950 text-white rounded-tr-none font-sans font-normal'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow-sm text-gray-500">
                  <Bot size={13} />
                </div>
                <div className="px-5 py-3.5 bg-transparent text-gray-400 text-sm flex gap-1 items-center h-[46px]">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="flex flex-col gap-3 p-4 bg-red-50/45 border border-red-200/60 rounded-2xl mx-auto w-full max-w-xl shadow-[0_4px_20px_rgba(239,68,68,0.06)] shrink-0"
              >
                <div className="flex gap-2.5 items-start">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="text-left space-y-1">
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">Chyba při komunikaci / Poskytovatel modelu</h4>
                    <p className="text-[12px] text-red-600 font-medium leading-relaxed">{error}</p>
                    <p className="text-[10px] text-gray-500 font-normal leading-relaxed">
                      Zpráva "Provider Error" znamená, že konkrétní server či poskytovatel vybraného modelu na OpenRouteru je momentálně nedostupný nebo přetížený. Výběr modelu můžete změnit dole.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200/20 mt-1">
                  {!settings.apiKey ? (
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      Otevřít nastavení a zadat API klíč
                    </button>
                  ) : (
                    <>
                      {settings.model !== 'openrouter/free' && (
                        <button
                          onClick={() => {
                            setSettings(prev => ({ ...prev, model: 'openrouter/free' }));
                            setError(null);
                            setToast({ message: '🧠 Přepnuto na univerzální OpenRouter Free', type: 'success' });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Použít OpenRouter Free</span>
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setError(null)}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 rounded-xl text-xs font-semibold transition-all cursor-pointer ml-auto"
                  >
                    Skrýt chybu
                  </button>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} className="h-4 shrink-0" />
          </main>

          {/* Interactive Input Area */}
          <footer className="p-4 sm:p-6 bg-white border-t border-gray-200 shrink-0">
            <div className="max-w-4xl mx-auto relative">
              
              {/* Chat Input Text Area */}
              <div className="flex items-end gap-2.5">
                <div className="relative flex-1 bg-gray-50 border border-gray-200 rounded-2xl flex items-center pr-3 overflow-hidden focus-within:ring-2 focus-within:ring-gray-950/5 focus-within:border-gray-400 transition-all min-h-[52px]">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder=""
                    rows={1}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="sentences"
                    spellCheck="false"
                    data-form-type="other"
                    name="chat-message-input-no-autofill"
                    className="w-full bg-transparent border-none py-3.5 pl-4 pr-16 text-sm resize-none focus:outline-none text-gray-800 placeholder:text-gray-400 max-h-[200px] chat-textarea"
                    style={{ 
                      height: input ? 'auto' : '44px',
                    }}
                  />
                  
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 bottom-2 p-2.5 bg-gray-950 text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm cursor-pointer"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
            
          </footer>

      {/* Full screen Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-50 flex flex-col md:flex-row font-sans text-gray-900 selection:bg-gray-100 overflow-hidden"
          >
            {/* Sidebar navigation */}
            <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200/60 flex flex-col p-6 shrink-0 justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gray-950 text-white rounded-xl shadow-sm">
                      <SettingsIcon size={18} />
                    </div>
                    <span className="font-semibold tracking-tight text-gray-900 text-sm">Nastavení</span>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-905 hover:bg-gray-200 rounded-lg md:hidden cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'general'
                        ? 'bg-gray-950 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <Sliders size={15} />
                    <span>Obecné</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('memory')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-semibold tracking-tight transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'memory'
                        ? 'bg-gray-950 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <Brain size={15} />
                    <span>Správa paměti</span>
                  </button>
                </nav>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="hidden md:flex items-center justify-center gap-2 w-full py-3 bg-gray-950 text-white hover:bg-gray-800 transition-all rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
              >
                <span>Uložit a zavřít</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Content panel */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="hidden md:flex items-center justify-between pb-4 border-b border-gray-150/60">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                      {activeTab === 'general' && 'Obecné nastavení'}
                      {activeTab === 'memory' && 'Pokročilá správa paměti'}
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {activeTab === 'general' && 'Základní konfigurace, přístupový API klíč a instrukce.'}
                      {activeTab === 'memory' && 'Uchovávání trvalých faktů o vás pro chytřejší odpovědi.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all rounded-full cursor-pointer"
                    title="Uložit a zavřít"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-6 pt-2">
                  {/* GENERAL TAB */}
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">OpenRouter API Key</label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={settings.apiKey}
                            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                            placeholder="sk-or-v1-..."
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-950/5 focus:border-gray-900 transition-all text-xs font-mono text-gray-800"
                          />
                          {settings.apiKey && (
                            <button
                              onClick={() => {
                                setSettings(prev => ({ ...prev, apiKey: '' }));
                                setTempApiKey('');
                              }}
                              className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Odpojit klíč
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Vaše přezdívka</label>
                        <input
                          type="text"
                          value={settings.userNickname ?? 'Uživatel'}
                          onChange={(e) => setSettings({ ...settings, userNickname: e.target.value })}
                          placeholder="Napište své jméno"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-950/5 focus:border-gray-900 transition-all text-xs font-semibold text-gray-800"
                        />
                      </div>

                      {/* System Prompt Instructions */}
                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-semibold">System prompt</label>
                        <textarea
                          value={settings.systemPrompt}
                          onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                          rows={4}
                          placeholder="Jsi užitečný minimalistický asistent..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-950/5 focus:border-gray-400 transition-all resize-none text-xs text-gray-800 font-mono leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* MEMORY TAB (Správa paměti) */}
                  {activeTab === 'memory' && (
                    <div className="space-y-4">
                      {/* Virtual core memory system */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Trvalá fakta</label>

                        {/* Facts list */}
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {(!settings.userFacts || settings.userFacts.length === 0) ? (
                            <div className="text-center py-6 px-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                              <p className="text-xs text-gray-400">Žádná uložená fakta. Přidejte informace níže.</p>
                            </div>
                          ) : (
                            settings.userFacts.map((fact, index) => (
                              <div 
                                key={index}
                                className="flex items-start justify-between gap-3 p-3 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-700 leading-relaxed font-medium hover:bg-white hover:border-gray-300 transition-all"
                              >
                                <span className="flex-1">{fact}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFact(index)}
                                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all shrink-0 cursor-pointer"
                                  title="Odebrat fakt"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add fact field */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newFact}
                            onChange={(e) => setNewFact(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddFact();
                              }
                            }}
                            placeholder="Přidat nové trvalé info (např. Chci tykat / Jsem programátor...)"
                            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-950/5 focus:border-gray-400 transition-all text-xs text-gray-800"
                          />
                          <button
                            type="button"
                            onClick={handleAddFact}
                            className="px-4 py-2.5 bg-gray-950 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            <Plus size={14} />
                            <span>Přidat</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Mobile action bar sticky to bottom */}
            <div className="p-4 border-t border-gray-200/60 bg-gray-50 md:hidden flex justify-end shrink-0">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-3 bg-gray-950 text-white hover:bg-gray-800 transition-all rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-gray-900/10 active:scale-95"
              >
                <span>Dokončit</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification for Memory Updates */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold leading-normal ${
              toast.type === 'success'
                ? 'bg-emerald-100/90 border-emerald-250 text-emerald-900 bg-emerald-50/95 border-emerald-200/80 shadow-[0_4px_25px_rgba(16,185,129,0.12)]'
                : 'bg-indigo-50/95 border-indigo-200/80 text-indigo-900 shadow-[0_4px_25px_rgba(99,102,241,0.12)]'
            }`}
          >
            <Sparkles size={14} className={toast.type === 'success' ? 'text-emerald-500' : 'text-indigo-500'} />
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-0.5 hover:bg-black/5 rounded-full shrink-0 ml-1 cursor-pointer">
              <X size={12} className="opacity-60" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


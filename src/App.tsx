import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings as SettingsIcon, X, User, Bot, AlertCircle, Key, Plus, Check, Search, Sparkles, Trash2, ArrowRight, MessageSquareCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Settings } from './types';

const POPULAR_MODELS = [
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', tier: 'Premium' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', tier: 'Premium' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', tier: 'Reasoning' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', tier: 'Premium' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', tier: 'Fast' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', tier: 'Standard' },
  { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash (Free)', provider: 'Google', tier: 'Free' },
  { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3.8B (Free)', provider: 'Meta', tier: 'Free' },
];

const defaultSettings: Settings = {
  apiKey: '',
  model: 'anthropic/claude-3.7-sonnet',
  systemPrompt: 'You are a helpful, minimalist AI assistant. Keep responses clear and concise.',
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [allModels, setAllModels] = useState<any[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  // Load settings initially
  useEffect(() => {
    const savedStats = localStorage.getItem('minimal-chat-settings');
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      setSettings(parsed);
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
            setAllModels(result.data);
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
      const messagesToSend = [
        { role: 'system', content: settings.systemPrompt },
        ...newMessages,
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to communicate with OpenRouter');
      }

      if (data.choices && data.choices[0]) {
        const assistantMessage: Message = data.choices[0].message;
        setMessages((prev) => [...prev, assistantMessage]);
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
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-950 text-white rounded-xl hover:bg-gray-800 transition-all shadow-sm cursor-pointer"
            title="Start a new chat session"
          >
            <Plus size={13} />
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {settings.apiKey && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {settings.model.split('/').pop()}
            </span>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all rounded-full"
            title="System Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      {!settings.apiKey ? (
        /* Welcome & API Key Entry View */
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-gray-100"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-950 text-white flex items-center justify-center mb-6 shadow-sm">
              <Key className="w-5 h-5 text-white" />
            </div>
            
            <h2 className="text-xl font-medium tracking-tight text-gray-900 mb-2">Connect to OpenRouter</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              To host and run this chat securely on GitHub Pages, enter your OpenRouter API Key below. Your key is stored exclusively in your local browser storage.
            </p>

            <form onSubmit={handleApiKeySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">OpenRouter API Key</label>
                <input
                  type="password"
                  required
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-950/5 focus:border-gray-900 transition-all text-sm font-mono text-gray-800"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  referrerPolicy="no-referrer" 
                  className="hover:text-gray-900 underline transition-colors"
                >
                  Get your OpenRouter key here
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-gray-950 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm mt-4 cursor-pointer"
              >
                <span>Continue to Chat</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        /* The Actual Chat Workspace */
        <>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 select-none">
                <Bot className="w-8 h-8 text-gray-300 mb-2 animate-pulse" />
                <p className="text-xs text-gray-400 font-mono">Select a model with + and type a message to start</p>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow-sm text-gray-505">
                  <Bot size={13} />
                </div>
                <div className="px-5 py-3.5 bg-transparent text-gray-400 text-sm flex gap-1 items-center">
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
                className="flex gap-3 justify-center items-center text-red-500 text-xs px-4 py-3.5 bg-red-55/10 rounded-2xl mx-auto max-w-lg text-center border border-red-200/20 shadow-sm"
              >
                <AlertCircle size={14} className="shrink-0" />
                <p className="font-medium">{error}</p>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} className="h-4 shrink-0" />
          </main>

          {/* Interactive Input Area */}
          <footer className="p-4 sm:p-6 bg-white border-t border-gray-200 shrink-0">
            <div className="max-w-4xl mx-auto relative">
              
              {/* Floating Model Picker Popover (Toggled by +) */}
              <AnimatePresence>
                {isModelPickerOpen && (
                  <motion.div
                    ref={modelPickerRef}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute bottom-16 left-0 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30"
                  >
                    <div className="p-3 border-b border-gray-150 bg-gray-50 flex items-center gap-2">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search models..."
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
                        {allModels.length > 0 && modelSearch ? 'Search Results' : 'System Models'}
                      </div>
                      
                      {filteredModels.length === 0 ? (
                        <div className="p-4 text-center text-xs text-none text-gray-400">
                          No models matched your search
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

              {/* Chat Input Text Area */}
              <div className="flex items-end gap-2.5">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl flex items-center pr-3 focus-within:ring-2 focus-within:ring-gray-950/5 focus-within:border-gray-400 transition-all min-h-[52px]">
                  
                  {/* Plus Button inside Chatbox */}
                  <button
                    onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
                    className={`p-3 self-end text-gray-400 hover:text-gray-900 transition-colors hover:bg-gray-150/40 rounded-full m-1 cursor-pointer flex items-center justify-center ${isModelPickerOpen ? 'bg-gray-100 text-gray-900' : ''}`}
                    title="Choose AI Model"
                    type="button"
                  >
                    <Plus size={18} className={`transition-transform duration-200 ${isModelPickerOpen ? 'rotate-45' : ''}`} />
                  </button>
                  
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${settings.model.split('/').pop()}...`}
                    rows={1}
                    className="w-full bg-transparent border-none py-3.5 pl-1 pr-14 text-sm resize-none focus:outline-none text-gray-800 placeholder:text-gray-400 max-h-[200px]"
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
        </>
      )}

      {/* Settings Modal (Mainly for system prompt and clearing API Key) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-xl z-50 overflow-hidden border border-gray-100"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-base font-medium text-gray-900">Configure Settings</h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 -mr-1 text-gray-400 hover:text-gray-900 transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-5 text-sm">
                <div className="space-y-2">
                  <label className="font-medium text-gray-700">OpenRouter API Key</label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder="sk-or-v1-..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all font-mono text-xs text-gray-800"
                  />
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400">Stored only in your browser storage</span>
                    {settings.apiKey && (
                      <button 
                        onClick={() => {
                          setSettings(prev => ({ ...prev, apiKey: '' }));
                          setTempApiKey('');
                        }}
                        className="text-red-500 hover:underline"
                      >
                        Disconnect Key
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="font-medium text-gray-700">System Instructions</label>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                    rows={4}
                    placeholder="E.g., You are a direct, precise coder..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all resize-none text-xs text-gray-800"
                  />
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                 <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-850 rounded-xl transition-colors shadow-sm cursor-pointer"
                 >
                    Done
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


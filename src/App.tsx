import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings as SettingsIcon, X, User, Bot, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Settings } from './types';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedStats = localStorage.getItem('minimal-chat-settings');
    if (savedStats) {
      setSettings(JSON.parse(savedStats));
    }
  }, []);

  useEffect(() => {
    if (settings.apiKey || settings.model) {
      localStorage.setItem('minimal-chat-settings', JSON.stringify(settings));
    }
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

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

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          model: settings.model,
          providedKey: settings.apiKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to communicate with OpenRouter');
      }

      const assistantMessage: Message = data.choices[0].message;
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message);
      // Remove the user message if it failed or keep it so they can retry? Let's keep it but show an error.
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

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-sm font-medium tracking-tight text-gray-800">Minimal Chat</h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 -mr-2 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-50"
          aria-label="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
                <Bot className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                <h2 className="text-gray-700 font-medium mb-2">Welcome to Minimal Chat</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                   A clean UI powered by OpenRouter. Ensure you have configured your API key in settings or as an environment variable to start.
                </p>
                <div className="flex gap-3 justify-center">
                   <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors rounded-lg"
                   >
                      Configure Settings
                   </button>
                </div>
             </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow-sm">
                {msg.role === 'user' ? (
                  <User size={14} className="text-gray-500" />
                ) : (
                  <Bot size={14} className="text-gray-500" />
                )}
              </div>
              
              <div
                className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gray-900 text-white rounded-tr-none'
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
             <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow-sm">
                <Bot size={14} className="text-gray-500" />
             </div>
             <div className="px-5 py-3.5 bg-transparent text-gray-400 text-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
             </div>
           </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-center items-center text-red-500 text-xs px-4 py-3 bg-red-50 rounded-xl mx-auto max-w-lg text-center border border-red-100">
            <AlertCircle size={14} className="shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} className="h-2 shrink-0" />
      </main>

      {/* Input Area */}
      <footer className="p-4 sm:p-6 bg-white border-t border-gray-200 shrink-0">
        <div className="max-w-4xl mx-auto flex items-end gap-3 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-5 pr-14 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all text-gray-800 placeholder:text-gray-400 min-h-[52px] max-h-[200px]"
            style={{ 
               height: input ? 'auto' : '52px',
               // extremely basic auto-grow strategy, in a real app would use a ref and scrollHeight
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors shadow-sm"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-3 tracking-wide uppercase font-medium">Design focused minimal chat</p>
      </footer>

      {/* Settings Modal */}
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-xl z-50 overflow-hidden border border-gray-100"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-base font-medium text-gray-900">Settings</h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 -mr-1 text-gray-400 hover:text-gray-900 transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-5 text-sm">
                <div className="space-y-2">
                  <label className="font-medium text-gray-700">OpenRouter API Key (Optional)</label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder="sk-or-v1-..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all font-mono text-xs"
                  />
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Leave blank if configured securely via server <code className="bg-gray-100 p-0.5 rounded font-mono text-[10px]">.env</code>. Saved locally to your browser.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-gray-700">Model</label>
                  <input
                    type="text"
                    value={settings.model}
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                    placeholder="anthropic/claude-3.7-sonnet"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all font-mono text-xs"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="font-medium text-gray-700">System Prompt</label>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all resize-none text-sm"
                  />
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                 <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors shadow-sm"
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

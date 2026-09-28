import React, { FormEvent, useEffect, useRef, useState } from 'react';

interface MemoryItem { text: string; }
interface Message { id: string; sender: 'user' | 'ai'; text: string; memories?: MemoryItem[]; timestamp: string; }
interface Conversation { id: string; title: string; updatedAt: string; }
interface User { id: string; name: string; email: string; }

type SpeechRecognitionConstructor = new () => SpeechRecognition;
declare global {
  interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor; }
  interface SpeechRecognition extends EventTarget { continuous: boolean; interimResults: boolean; lang: string; start(): void; stop(): void; onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror: ((event: any) => void) | null; }
}

const api = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('devmemory_token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};

function AuthScreen({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      localStorage.setItem('devmemory_token', data.token); onLogin(data.user, data.token);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };
  return <div className="auth-page"><div className="auth-card">
    <div className="auth-logo">🧠</div><h1>DevMemory AI</h1><p className="auth-subtitle">Your developer assistant that remembers what matters.</p>
    <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button></div>
    <form onSubmit={submit} className="auth-form">
      {mode === 'register' && <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" />}
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" autoComplete="email" required />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (6+ characters)" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
      {error && <div className="auth-error">{error}</div>}
      <button className="primary-btn" disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Login to DevMemory' : 'Create account'}</button>
    </form>
    <p className="auth-note">Your chats and memories are separated by your account.</p>
  </div></div>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState(''); const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); const [searchResults, setSearchResults] = useState<MemoryItem[] | null>(null); const [isSearching, setIsSearching] = useState(false); const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); const [isListening, setIsListening] = useState(false); const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null); const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('devmemory_token'); if (!token) return;
    api('/api/auth/me').then(data => setUser(data.user)).catch(() => { localStorage.removeItem('devmemory_token'); });
  }, []);
  useEffect(() => { if (user) loadConversations(); }, [user]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const loadConversations = async () => { try { const data = await api('/api/conversations'); setConversations(data.conversations); } catch (e: any) { setErrorMessage(e.message); } };
  const newChat = () => { setConversationId(''); setMessages([]); setInputMessage(''); setErrorMessage(null); setShowSearch(false); setSidebarOpen(false); };
  const loadConversation = async (id: string) => { try { const data = await api(`/api/conversations/${id}/messages`); setConversationId(id); setMessages(data.messages.map((m: any) => ({ id: m.id, sender: m.sender, text: m.text, memories: m.memories, timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))); setSidebarOpen(false); } catch (e: any) { setErrorMessage(e.message); } };

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault(); const trimmed = inputMessage.trim(); if (!trimmed || isLoading) return;
    setErrorMessage(null); setMessages(prev => [...prev, { id: `local-${Date.now()}`, sender: 'user', text: trimmed, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); setInputMessage(''); setIsLoading(true);
    try {
      const data = await api('/api/chat', { method: 'POST', body: JSON.stringify({ message: trimmed, conversationId }) });
      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, sender: 'ai', text: data.answer || 'No response returned.', memories: data.memories || [], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      loadConversations();
    } catch (err: any) { setErrorMessage(err.message); setMessages(prev => prev.filter(m => !m.id.startsWith('local-'))); } finally { setIsLoading(false); }
  };

  const searchMemories = async (e: FormEvent) => { e.preventDefault(); const q = searchQuery.trim(); if (!q) return; setIsSearching(true); try { const data = await api(`/api/memories?query=${encodeURIComponent(q)}`); setSearchResults(data.memories || []); } catch (e: any) { setErrorMessage(e.message); } finally { setIsSearching(false); } };

  const toggleVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setErrorMessage('Voice input is not supported by this browser. Try Chrome or Edge.'); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const recognition = new Recognition(); recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; setInputMessage(prev => `${prev} ${transcript}`.trim()); };
    recognition.onend = () => setIsListening(false); recognition.onerror = () => { setIsListening(false); setErrorMessage('Voice input could not be started. Please check microphone permission.'); };
    recognitionRef.current = recognition; recognition.start(); setIsListening(true);
  };
  const speak = (id: string, text: string) => { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); if (speakingId === id) { setSpeakingId(null); return; } const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 1; utterance.onend = () => setSpeakingId(null); window.speechSynthesis.speak(utterance); setSpeakingId(id); };
  const logout = () => { window.speechSynthesis?.cancel(); localStorage.removeItem('devmemory_token'); setUser(null); setMessages([]); setConversations([]); };

  if (!user) return <AuthScreen onLogin={(u) => setUser(u)} />;

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-top"><div className="brand-small"><span>🧠</span><strong>DevMemory AI</strong></div><button className="icon-btn mobile-only" onClick={() => setSidebarOpen(false)}>✕</button></div>
      <button className="new-chat-btn" onClick={newChat}>＋ New Chat</button>
      <div className="history-title">Recent chats</div>
      <div className="history-list">{conversations.length === 0 ? <div className="history-empty">No conversations yet.</div> : conversations.map(c => <button key={c.id} className={`history-item ${c.id === conversationId ? 'selected' : ''}`} onClick={() => loadConversation(c.id)}>{c.title}</button>)}</div>
      <div className="sidebar-bottom"><div className="user-card"><div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.email}</span></div></div><button className="logout-btn" onClick={logout}>Log out</button></div>
    </aside>

    <div className="app-layout">
      <header className="app-header"><button className="icon-btn mobile-only" onClick={() => setSidebarOpen(true)}>☰</button><div className="brand"><div className="brand-logo">🧠</div><div><h1 className="brand-title">DevMemory AI</h1><p className="brand-subtitle">Developer memory powered by Hindsight</p></div></div><div className="header-actions"><button className="action-btn" onClick={() => setShowSearch(!showSearch)}>🔍 Memories</button><span className="badge">Hindsight + Groq</span></div></header>
      {showSearch && <section className="memory-search-panel"><div className="search-header"><h3>Inspect your Hindsight memories</h3><button className="close-btn" onClick={() => setShowSearch(false)}>✕</button></div><form onSubmit={searchMemories} className="search-form"><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" placeholder="Search what DevMemory remembers..."/><button className="search-btn" disabled={isSearching}>{isSearching ? 'Searching...' : 'Recall'}</button></form>{searchResults && <div className="search-results">{searchResults.length ? searchResults.map((m, i) => <div className="search-item" key={i}>🧠 <span>{m.text}</span></div>) : <p className="empty-hint">No matching memories found.</p>}</div>}</section>}

      <main className="chat-container">
        {messages.length === 0 ? <div className="empty-state"><div className="empty-icon">🧠</div><h2>What are you building today?</h2><p>Ask a development question or teach DevMemory AI something about your project. Your useful context is remembered for future chats.</p></div> : <div className="messages-list">{messages.map(msg => <div key={msg.id} className={`message-row ${msg.sender === 'user' ? 'message-user' : 'message-ai'}`}><div className="message-avatar">{msg.sender === 'user' ? '👤' : '🧠'}</div><div className="message-bubble"><div className="message-meta"><span className="message-sender">{msg.sender === 'user' ? 'You' : 'DevMemory AI'}</span><span className="message-time">{msg.timestamp}</span></div><div className="message-body">{msg.text}</div>{msg.sender === 'ai' && <div className="message-tools"><button onClick={() => speak(msg.id, msg.text)}>{speakingId === msg.id ? '⏹ Stop' : '🔊 Speak'}</button></div>}{msg.sender === 'ai' && !!msg.memories?.length && <div className="used-memories-card"><div className="used-memories-header">🧠 <strong>Memories used</strong></div><ul>{msg.memories.map((m, i) => <li key={i}>{m.text}</li>)}</ul></div>}</div></div>)}{isLoading && <div className="message-row message-ai"><div className="message-avatar">🧠</div><div className="message-bubble loading-bubble"><div className="loading-dots"><span/><span/><span/></div><span className="loading-text">Recalling memory and thinking...</span></div></div>}<div ref={messagesEndRef}/></div>}
      </main>
      {errorMessage && <div className="error-banner"><span>⚠️ {errorMessage}</span><button onClick={() => setErrorMessage(null)}>✕</button></div>}
      <footer className="chat-footer"><form onSubmit={sendMessage} className="chat-input-form"><input className="chat-input" value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Ask or teach DevMemory AI..." disabled={isLoading} autoFocus/><button type="button" className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={toggleVoice} title="Voice input">{isListening ? '⏹' : '🎙️'}</button><button className="send-button" disabled={isLoading || !inputMessage.trim()}>{isLoading ? 'Thinking...' : 'Send'}</button></form><div className="footer-note">Press Enter to send · Your account keeps your chats and memories separate</div></footer>
    </div>
  </div>;
}

export default App;

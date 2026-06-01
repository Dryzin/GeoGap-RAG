import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Bot, 
  User, 
  Send, 
  Sun, 
  Moon, 
  RefreshCw, 
  Database, 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  Info, 
  HelpCircle,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [activeSources, setActiveSources] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://geogap-rag.onrender.com';

  // Verificar status da API no carregamento
  useEffect(() => {
    if (!import.meta.env.VITE_BACKEND_URL) {
      console.warn('VITE_BACKEND_URL não definido. Usando fallback local.');
    }
    checkBackendStatus();
    // Iniciar com uma mensagem de boas-vindas amigável
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Olá! Sou o **GeoGap**, seu assistente de análise socioespacial e geomarketing. Vou ajudar você a avaliar viabilidade de negócios, localização de franquias e oportunidades comerciais com base em dados reais. 😊',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: []
      }
    ]);
  }, []);

  // Rolar para a última mensagem automaticamente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Verificar status do servidor backend
  const checkBackendStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/status`);
      if (res.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (err) {
      setBackendStatus('offline');
    }
  };

  // Enviar pergunta ao backend
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    // Adicionar mensagem do usuário
    const userMsgId = Date.now().toString();
    const newUserMessage = {
      id: userMsgId,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: []
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor.');
      }

      const data = await response.json();
      
      const newBotMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || []
      };

      setMessages(prev => [...prev, newBotMessage]);
      
      // Atualizar o RAG Inspector do painel direito com as fontes dessa resposta
      if (data.sources && data.sources.length > 0) {
        setActiveSources(data.sources);
      } else {
        setActiveSources([]);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorBotMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Desculpe, encontrei um problema ao me conectar com o meu servidor RAG. Por favor, certifique-se de que o backend Flask está rodando e tente novamente.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: [],
        isError: true
      };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
      // Focar de volta no input
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  };

  // Reconstruir banco de dados de vetores (Embeddings)
  const handleRebuildDatabase = async () => {
    if (isLoading) return;
    setIsLoading(true);
    alert('Iniciando regeneração dos embeddings. Isso pode levar alguns segundos...');
    try {
      const res = await fetch(`${BACKEND_URL}/api/rebuild-db`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert('Sucesso! O ChromaDB foi reconstruído a partir do CSV local.');
        checkBackendStatus();
      } else {
        alert('Erro ao reconstruir banco de dados: ' + data.message);
      }
    } catch (err) {
      alert('Erro de conexão ao tentar reconstruir banco de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  // Alternar entre temas escuro e claro
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Parser de Markdown simples para renderizar as tags de texto
  const parseMarkdown = (text) => {
    if (!text) return { __html: "" };
    
    // Escapar HTML básico
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    // Títulos h3 (###)
    html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
    // Títulos h2 (##)
    html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
    // Títulos h1 (#)
    html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");
    
    // Negrito (**)
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Itálico (*)
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    
    // Itens de lista (-)
    html = html.replace(/^\s*-\s+(.*?)$/gm, "<li>$1</li>");
    
    // Links ([texto](url))
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1 <span style="font-size: 0.75rem; vertical-align: middle;">🔗</span></a>');
    
    // Código (`code`)
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    
    // Quebras de linha
    html = html.replace(/\n/g, "<br />");
    
    return { __html: html };
  };

  // Chips de perguntas frequentes
  const suggestions = [
    "Qual região é mais indicada para abrir um comércio de alimentação rápida?",
    "Existe saturação de franquias de sorveteria no Centro?",
    "Onde há maior fluxo de estudantes em Machado?",
    "Qual área tem melhor potencial para um mercado de bairro?",
    "Há oportunidades para um ponto de venda perto do terminal rodoviário?",
    "Que tipo de negócio funciona bem na região do Lago do Parque?"
  ];

  // Controle de clique nas mensagens do bot para carregar as fontes no Inspetor
  const handleInspectMessage = (msg) => {
    if (msg.sender === 'bot' && msg.sources && msg.sources.length > 0) {
      setActiveSources(msg.sources);
    }
  };

  // Submissão do formulário
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  // Prevenir quebra de linha com enter simples, mas aceitar shift+enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="app-container">
      
      {/* 1. SEÇÃO DO CHAT (LADO ESQUERDO) */}
      <section className="chat-section">
        
        {/* HEADER */}
        <header className="app-header">
          <div className="header-brand">
            <div className="brand-avatar">
              <Bot size={24} />
              <span className={`status-badge ${backendStatus}`}></span>
            </div>
            <div className="brand-info">
              <h1>GeoGap</h1>
              <span>
                <Sparkles size={10} style={{ color: 'var(--color-primary)' }} />
                RAG Inteligente • GeoGap
              </span>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="icon-btn" 
              onClick={checkBackendStatus} 
              title="Verificar Conexão da API"
            >
              <RefreshCw size={16} />
            </button>
            <button 
              className="icon-btn" 
              onClick={handleRebuildDatabase} 
              title="Administrador: Recarregar Embeddings no ChromaDB"
            >
              <Database size={16} />
            </button>
            <button 
              className="icon-btn" 
              onClick={toggleTheme} 
              title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* CONTAINER DE MENSAGENS */}
        <div className="messages-container">
          
          {messages.length <= 1 && (
            <div className="welcome-container">
              <div className="welcome-logo">
                <Bot size={36} />
              </div>
              <h2>Olá! Eu sou o GeoGap</h2>
              <p>
                Seu assistente virtual de geo-análise para pequenos empreendedores e franqueados.
                Pergunte sobre viabilidade de pontos comerciais, localização e perfil socioeconômico da região.
              </p>
              
              <div className="suggestions-grid">
                {suggestions.map((sug, idx) => (
                  <button 
                    key={idx} 
                    className="suggestion-card"
                    onClick={() => handleSendMessage(sug)}
                    disabled={isLoading}
                  >
                    <HelpCircle size={14} />
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 1 && messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const hasSources = msg.sources && msg.sources.length > 0;
            
            return (
              <div 
                key={msg.id} 
                className={`message-row ${msg.sender}`}
                onClick={() => handleInspectMessage(msg)}
                style={{ cursor: hasSources ? 'pointer' : 'default' }}
              >
                <div className="message-bubble">
                  {msg.isError ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-red)' }}>
                      <ShieldAlert size={18} />
                      <div className="markdown-body" dangerouslySetInnerHTML={parseMarkdown(msg.text)} />
                    </div>
                  ) : (
                    <div className="markdown-body" dangerouslySetInnerHTML={parseMarkdown(msg.text)} />
                  )}
                  
                  {/* Fontes Inline para telas menores (Responsivas) */}
                  {hasSources && (
                    <div className="mobile-only" style={{ marginTop: '0.75rem' }}>
                      <details className="inline-sources-details" style={{ fontSize: '0.8rem' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontWeight: '600' }}>
                          Ver fontes ({msg.sources.length})
                        </summary>
                        <div className="inline-sources-content">
                          {msg.sources.map((src, sIdx) => (
                            <div key={sIdx} className="inline-source-item">
                              <div className="inline-source-title">{src.title}</div>
                              <div className="inline-source-text">{src.content}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                  
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}

          {/* INDICADOR DE DIGITAÇÃO */}
          {isLoading && (
            <div className="message-row bot">
              <div className="typing-bubble">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT DE MENSAGENS */}
        <footer className="input-section">
          <form onSubmit={handleSubmit} className="input-container">
            <input 
              ref={chatInputRef}
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "GeoGap está gerando sua resposta..." : "Pergunte algo sobre viabilidade local ou localização comercial..."}
              className="chat-input"
              disabled={isLoading}
              maxLength={200}
            />
            <div className="input-actions">
              <button 
                type="submit" 
                className="send-btn" 
                disabled={isLoading || !input.trim()}
                title="Enviar Mensagem"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
          
          <div className="footer-text">
            Chatbot RAG Funcional • Desenvolvido para Atividade de RAG • <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub <ExternalLink size={8} style={{ verticalAlign: 'middle' }} /></a>
          </div>
        </footer>

      </section>

      {/* 2. INSPECTOR RAG (LADO DIREITO - DESKTOP ONLY) */}
      <section className="rag-inspector-section">
        <div className="rag-header">
          <Database size={18} />
          <h2>Inspetor RAG (ChromaDB)</h2>
        </div>
        
        <div className="rag-content">
          <div className="rag-info-box">
            <p>
              <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--color-primary)' }} />
              Esta barra lateral exibe os <strong>documentos de contexto</strong> recuperados do 
              banco de dados vetorial <strong>ChromaDB</strong> por meio de busca semântica (embeddings). 
              Eles são os dados reais que sustentam a inteligência do GeoGap.
            </p>
            {activeSources.length > 0 && (
              <p style={{ marginTop: '0.5rem', color: 'var(--text-main)' }}>
                Exibindo fontes da <strong>última resposta</strong> gerada.
              </p>
            )}
          </div>

          {activeSources.length === 0 ? (
            <div className="rag-info-box" style={{ background: 'transparent', borderStyle: 'dashed', textAlign: 'center', padding: '2rem 1rem' }}>
              <Database size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.8rem' }}>Nenhuma consulta ativa no momento.</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Envie uma pergunta ou clique em uma resposta do bot para inspecionar os fragmentos de dados utilizados!</p>
            </div>
          ) : (
            activeSources.map((src, idx) => (
              <div key={idx} className="source-card">
                <div className="source-badge">
                  Trecho {idx + 1}
                </div>
                <div className="source-title">{src.title}</div>
                <div className="source-body">"{src.content}"</div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}

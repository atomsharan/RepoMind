import React, { useState, useRef, useEffect } from 'react';
import { analysisService } from '../../services/api';
import type { RepositoryAnalysis, ChatResponse } from '../../types';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle2, 
  FileText,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  analysis: RepositoryAnalysis;
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  response?: ChatResponse;
}

// Simple helper to parse backticks in text and render them as code blocks
const formatMessageContent = (text: string) => {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-xs border border-white/5 select-all">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const AskSection: React.FC<Props> = ({ analysis }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'bot',
      content: `Hello! I've analyzed the knowledge structure of ${analysis.repository_name}. Ask me anything about the software architecture, engineering memory, entry points, or priorities.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Where should a new developer start?",
    "How does authentication work?",
    "What are the highest-priority risks?",
    "What should the team work on next?"
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await analysisService.askQuestion(analysis.analysis_id, text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.answer,
        response: response
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Failed to get response", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "Sorry, I encountered an issue querying the intelligence engine. Please make sure the backend is active."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1 mb-6">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">Ask RepoMind</h3>
        <p className="text-muted-foreground">Ask questions grounded in repository intelligence and reconstructed knowledge.</p>
      </div>

      <div className="flex-1 flex flex-col bg-card border border-white/5 rounded-3xl overflow-hidden relative shadow-2xl">
        {/* Chat History */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 sm:gap-6 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center border shrink-0 ${
                msg.type === 'bot' 
                  ? 'bg-white/5 border-white/10 text-foreground' 
                  : 'bg-foreground border-transparent text-background'
              }`}>
                {msg.type === 'bot' ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
              </div>

              {/* Message bubble & Metadata */}
              <div className={`flex flex-col gap-3 max-w-[80%] ${msg.type === 'user' ? 'items-end' : ''}`}>
                <div className={`p-4 sm:p-5 rounded-3xl leading-relaxed text-xs sm:text-sm ${
                  msg.type === 'bot' 
                    ? 'bg-white/[0.02] border border-white/5 text-muted-foreground' 
                    : 'bg-foreground text-background font-medium'
                }`}>
                  {formatMessageContent(msg.content)}
                </div>

                {/* Evidence Panel (if returned by AI response) */}
                {msg.response && msg.type === 'bot' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 w-full"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Evidence Card */}
                      <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-2.5">
                        <div className="flex items-center gap-2 text-foreground/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Grounding Evidence</span>
                        </div>
                        <ul className="space-y-2">
                          {msg.response.evidence.map((ev, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground leading-normal italic pl-2 border-l border-white/10">
                              "{ev}"
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Related Files Card */}
                      <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-foreground/80">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Related Code Files</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.response.related_files.map((file, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-mono text-muted-foreground hover:text-foreground cursor-pointer">
                              {file}
                            </span>
                          ))}
                        </div>
                        <div className="pt-2 flex justify-between items-center text-[9px] text-muted-foreground uppercase font-bold opacity-50 border-t border-white/5">
                          <span>Confidence Score</span>
                          <span className="font-mono">{(msg.response.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-4 sm:gap-6">
              <div className="w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center bg-white/5 border border-white/10 text-foreground shrink-0">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider italic animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                RepoMind is investigating files...
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 sm:p-8 bg-background/50 border-t border-white/5 backdrop-blur-sm">
          {/* Render Quick Prompts if no user message yet */}
          {!messages.some(m => m.type === 'user') && (
            <div className="flex flex-wrap gap-2 mb-6">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground hover:border-white/20 transition-all text-left"
                >
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                  {q}
                </button>
              ))}
            </div>
          )}

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative flex items-center group"
          >
            <div className="absolute left-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none">
              <Sparkles className="w-5 h-5 opacity-60" />
            </div>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about the repository..."
              className="w-full h-14 pl-12 pr-16 bg-secondary text-foreground text-sm placeholder:text-muted-foreground/60 rounded-2xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-3 bg-foreground text-background rounded-xl disabled:opacity-50 hover:opacity-90 disabled:cursor-not-allowed transition-all active:scale-[0.96]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AskSection;

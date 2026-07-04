import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, Brain, Rocket } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const navigate = useNavigate();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      // Basic github url validation check or cleanup
      let cleanUrl = repoUrl.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      navigate('/analyze', { state: { repoUrl: cleanUrl } });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      
      {/* Grid background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none" />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-extrabold tracking-tighter text-sm">
            RM
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">RepoMind</span>
        </div>
        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#product" className="hover:text-foreground transition-colors">Product</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-5xl mx-auto text-center relative z-10 py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Hackathon MVP v1.0 Live</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Your repository has code.<br />
          <span className="text-muted-foreground">RepoMind finds the knowledge behind it.</span>
        </h1>
        
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-12 leading-relaxed">
          RepoMind investigates software repositories to reconstruct architecture, 
          recover project context, identify evidence-backed risks, and create 
          actionable continuity plans.
        </p>

        <form onSubmit={handleAnalyze} className="w-full max-w-2xl relative group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl blur-md opacity-25 group-focus-within:opacity-100 transition duration-500"></div>
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-1.5 bg-card/60 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3 pl-4 py-2 sm:py-0 flex-1">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                required
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground text-sm"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm shrink-0 shadow-lg"
            >
              Analyze Repository
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-muted-foreground/60">
          Works with public GitHub repositories.
        </p>

        {/* Features Column */}
        <div id="how-it-works" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-28 w-full max-w-4xl px-4">
          <div className="flex flex-col items-center text-center p-6 bg-card/30 border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white mb-4 border border-white/5">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-foreground">UNDERSTAND</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Reconstruct project architecture, components, dependencies, and technology choices.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-card/30 border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white mb-4 border border-white/5">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-foreground">REMEMBER</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Recover important project changes and engineering context from repository history.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-card/30 border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white mb-4 border border-white/5">
              <Rocket className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-foreground">CONTINUE</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Identify technical risks and generate a prioritized roadmap for the next developer.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-white/5 text-[11px] text-muted-foreground/60 relative z-10 bg-background/50">
        © 2026 RepoMind • Agentic Project Intelligence Platform • Built for the Hackathon
      </footer>
    </div>
  );
};

export default LandingPage;

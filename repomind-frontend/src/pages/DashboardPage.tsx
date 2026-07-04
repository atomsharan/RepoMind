import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  History, 
  AlertTriangle, 
  Compass, 
  MessageSquare,
  GitBranch,
  ChevronRight,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { analysisService } from '../services/api';
import type { RepositoryAnalysis } from '../types';
import OverviewSection from '../components/dashboard/OverviewSection';
import ArchitectureSection from '../components/dashboard/ArchitectureSection';
import MemorySection from '../components/dashboard/MemorySection';
import RisksSection from '../components/dashboard/RisksSection';
import ContinuitySection from '../components/dashboard/ContinuitySection';
import AskSection from '../components/dashboard/AskSection';

const DashboardPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const analysisId = location.state?.analysisId || 'repo-123';
  
  const [activeSection, setActiveSection] = useState('overview');
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const data = await analysisService.getAnalysis(analysisId);
        setAnalysis(data);
      } catch (error) {
        console.error("Failed to fetch analysis", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [analysisId]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'architecture', label: 'Architecture', icon: Layers },
    { id: 'memory', label: 'Project Memory', icon: History },
    { id: 'risks', label: 'Risks', icon: AlertTriangle },
    { id: 'continuity', label: 'Continuity Plan', icon: Compass },
    { id: 'ask', label: 'Ask RepoMind', icon: MessageSquare },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin"></div>
          <p className="text-xs text-muted-foreground animate-pulse font-mono uppercase tracking-wider">Loading intelligence...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <h2 className="text-lg font-bold">Analysis Not Found</h2>
          <p className="text-sm text-muted-foreground">We couldn't retrieve intelligence records for this repository.</p>
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 bg-foreground text-background text-xs font-semibold rounded-xl"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col bg-card/40 backdrop-blur-md shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-black text-[10px] font-black tracking-tighter">
              RM
            </div>
            <span className="font-bold tracking-tight text-sm text-foreground">RepoMind</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all border ${
                  activeSection === item.id 
                    ? 'bg-white/5 text-foreground font-semibold border-white/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.02] border-transparent'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Workspace</p>
            <div className="flex items-center gap-2 overflow-hidden">
              <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs font-mono truncate text-foreground/90">{analysis.repository_name}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/5 hover:border-white/10 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.98] font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Analyze New Repo
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-background/50">
        <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{analysis.repository_name}</h2>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
              <span className="capitalize font-semibold text-foreground/75">{activeSection}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
              <span className="font-mono">{analysis.repository_url}</span>
              <a href={analysis.repository_url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3 h-3 hover:text-foreground cursor-pointer transition-colors" />
              </a>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold tracking-wider uppercase border border-green-500/20">
              Live Analysis
            </div>
          </div>
        </header>

        <div className="p-8 pb-16 max-w-6xl w-full mx-auto flex-1">
          {activeSection === 'overview' && <OverviewSection analysis={analysis} />}
          {activeSection === 'architecture' && <ArchitectureSection analysis={analysis} />}
          {activeSection === 'memory' && <MemorySection analysis={analysis} />}
          {activeSection === 'risks' && <RisksSection analysis={analysis} />}
          {activeSection === 'continuity' && <ContinuitySection analysis={analysis} />}
          {activeSection === 'ask' && <AskSection analysis={analysis} />}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;

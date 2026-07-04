import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analysisService, USE_MOCK_DATA } from '../services/api';

const STAGES = [
  { id: 'connect', label: 'Repository connected' },
  { id: 'discover', label: 'File structure discovered' },
  { id: 'tech', label: 'Technology stack identified' },
  { id: 'arch', label: 'Investigating architecture' },
  { id: 'risks', label: 'Analyzing technical risks' },
  { id: 'memory', label: 'Reconstructing project memory' },
  { id: 'roadmap', label: 'Building continuity roadmap' },
];

const MESSAGES = [
  "Examining dependency configuration...",
  "Identifying application entry points...",
  "Mapping project components...",
  "Searching repository history...",
  "Evaluating technical risks...",
  "Cross-referencing commit patterns...",
  "Synthesizing architectural insights...",
];

const AnalysisLoadingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const repoUrl = location.state?.repoUrl || 'https://github.com/unknown/repo';
  const repoName = repoUrl.split('/').pop() || 'Repository';

  const [analysisId, setAnalysisId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Progress states
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing RepoMind analysis...');
  const [currentStageId, setCurrentStageId] = useState<string>('connect');
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  
  const pollingTimerRef = useRef<any>(null);
  const simulationTimerRef = useRef<any>(null);
  const messageTimerRef = useRef<any>(null);

  // 1. Initialize analysis task
  const initAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analysisService.startAnalysis(repoUrl);
      setAnalysisId(res.analysis_id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start repository analysis. Please check the URL and try again.');
      setLoading(false);
    }
  }, [repoUrl]);

  useEffect(() => {
    initAnalysis();
    
    // Cycle helper status messages periodically
    let msgIdx = 0;
    messageTimerRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % MESSAGES.length;
      if (USE_MOCK_DATA) {
        setStatusMessage(MESSAGES[msgIdx]);
      }
    }, 2500);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      if (messageTimerRef.current) clearInterval(messageTimerRef.current);
    };
  }, [repoUrl, initAnalysis]);

  // 2. Drive loading progress based on analysisId
  useEffect(() => {
    if (!analysisId) return;

    if (USE_MOCK_DATA) {
      // Simulate progress for 5-7 seconds
      setLoading(false);
      let simulatedProgress = 0;
      
      simulationTimerRef.current = setInterval(() => {
        simulatedProgress += Math.floor(Math.random() * 8) + 12; // 12-20% increments
        
        if (simulatedProgress >= 100) {
          simulatedProgress = 100;
          if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
          if (messageTimerRef.current) clearInterval(messageTimerRef.current);
          setStatusMessage("Analysis complete. Redirecting...");
          
          setTimeout(() => {
            navigate('/dashboard', { state: { repoUrl, analysisId } });
          }, 800);
        }
        
        setProgress(simulatedProgress);
        
        // Map progress to stages
        const stageIndex = Math.min(
          Math.floor((simulatedProgress / 100) * STAGES.length),
          STAGES.length - 1
        );
        setCurrentStageId(STAGES[stageIndex].id);
        
        // Complete previous stages
        const done = STAGES.slice(0, stageIndex).map(s => s.id);
        setCompletedStages(done);
      }, 900);

    } else {
      // Real backend polling logic
      setLoading(false);
      
      const pollStatus = async () => {
        try {
          const statusRes = await analysisService.getStatus(analysisId);
          
          setProgress(statusRes.progress);
          setStatusMessage(statusRes.message);
          
          // Map backend current_stage to local stages if possible
          // If stage format differs, we can fallback to progress-based mapping
          const serverStage = statusRes.current_stage?.toLowerCase() || '';
          
          let matchedStageId = STAGES[0].id;
          if (statusRes.progress >= 95) matchedStageId = 'roadmap';
          else if (statusRes.progress >= 80 || serverStage.includes('road') || serverStage.includes('continuity')) matchedStageId = 'roadmap';
          else if (statusRes.progress >= 65 || serverStage.includes('mem') || serverStage.includes('hist')) matchedStageId = 'memory';
          else if (statusRes.progress >= 50 || serverStage.includes('risk')) matchedStageId = 'risks';
          else if (statusRes.progress >= 35 || serverStage.includes('arch')) matchedStageId = 'arch';
          else if (statusRes.progress >= 20 || serverStage.includes('tech') || serverStage.includes('stack')) matchedStageId = 'tech';
          else if (statusRes.progress >= 10 || serverStage.includes('stru') || serverStage.includes('file')) matchedStageId = 'discover';
          
          setCurrentStageId(matchedStageId);
          
          const stageIndex = STAGES.findIndex(s => s.id === matchedStageId);
          if (stageIndex !== -1) {
            setCompletedStages(STAGES.slice(0, stageIndex).map(s => s.id));
          }

          if (statusRes.status === 'completed' || statusRes.progress >= 100) {
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            if (messageTimerRef.current) clearInterval(messageTimerRef.current);
            setStatusMessage("Syncing final report...");
            setTimeout(() => {
              navigate('/dashboard', { state: { repoUrl, analysisId } });
            }, 800);
          } else if (statusRes.status === 'failed') {
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            setError("The backend reported a failure while analyzing this repository.");
          }
        } catch (err: any) {
          console.error("Polling error:", err);
          // Don't kill polling on single error, let it retry, but keep track
        }
      };

      // Run immediately then poll every 1.5s
      pollStatus();
      pollingTimerRef.current = setInterval(pollStatus, 1500);
    }
  }, [analysisId, repoUrl, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden px-4">
      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="w-full max-w-lg relative z-10">
        {/* Loading/Error state views */}
        {loading && (
          <div className="text-center py-12 space-y-4 bg-card border border-white/5 rounded-3xl p-8">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mx-auto" />
            <h1 className="text-xl font-bold">Contacting RepoMind Engine</h1>
            <p className="text-xs text-muted-foreground">Initializing analysis tasks for {repoName}...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12 space-y-6 bg-card border border-destructive/20 rounded-3xl p-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <div>
              <h1 className="text-xl font-bold">Analysis Terminated</h1>
              <p className="text-sm text-muted-foreground mt-2 px-4 leading-relaxed">{error}</p>
            </div>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => navigate('/')} 
                className="px-4 py-2 border border-white/15 rounded-xl text-xs hover:bg-white/5 transition-colors"
              >
                Back to URL input
              </button>
              <button 
                onClick={initAnalysis} 
                className="px-4 py-2 bg-foreground text-background font-semibold rounded-xl text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Analysis
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8 bg-card/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md">
            <div className="text-center pb-4 border-b border-white/5">
              <h1 className="text-2xl font-bold tracking-tight">Investigating Repository</h1>
              <p className="text-muted-foreground font-mono text-xs mt-1 truncate max-w-xs mx-auto">{repoName}</p>
              
              {/* Progress bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 px-1 font-mono">
                  <span>Progress</span>
                  <span className="font-semibold text-foreground">{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-foreground" 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            </div>

            {/* Stages list */}
            <div className="space-y-4 relative pl-3">
              {/* Vertical line connecting stages */}
              <div className="absolute left-[23px] top-3 bottom-3 w-[1px] bg-white/5 z-0"></div>

              {STAGES.map((stage) => {
                const isCompleted = completedStages.includes(stage.id);
                const isCurrent = currentStageId === stage.id && progress < 100;

                return (
                  <div key={stage.id} className="flex items-center gap-4 relative z-10 py-0.5">
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-foreground fill-foreground/5" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-foreground animate-spin" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/30 fill-transparent" />
                      )}
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isCurrent ? 'text-foreground font-semibold' : 
                      isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/45'
                    }`}>
                      {stage.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Context message block */}
            <div className="h-8 text-center text-xs text-muted-foreground border-t border-white/5 pt-4 font-medium italic">
              <AnimatePresence mode="wait">
                <motion.p
                  key={statusMessage}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  {statusMessage}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisLoadingPage;

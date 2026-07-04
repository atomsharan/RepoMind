import React, { useState } from 'react';
import type { ArchitectureAnalysis, ArchitectureComponent } from '../../types';
import { 
  Box, 
  ArrowRight, 
  FileCode, 
  Info, 
  ChevronRight,
  Database,
  Globe,
  Lock,
  Server,
  Cpu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  analysis: {
    architecture: ArchitectureAnalysis;
  };
}

const ArchitectureSection: React.FC<Props> = ({ analysis }) => {
  const [selectedComponent, setSelectedComponent] = useState<ArchitectureComponent | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);

  // Group components for easier rendering in our topology tree
  const components = analysis.architecture.components;
  const frontend = components.find(c => c.id === 'comp-1');
  const backend = components.find(c => c.id === 'comp-2');
  const infraComponents = components.filter(c => ['comp-3', 'comp-4', 'comp-5'].includes(c.id));

  const getIcon = (name: string) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('frontend')) return <Globe className="w-5 h-5" />;
    if (lowercaseName.includes('api') || lowercaseName.includes('backend')) return <Server className="w-5 h-5" />;
    if (lowercaseName.includes('auth')) return <Lock className="w-5 h-5" />;
    if (lowercaseName.includes('db') || lowercaseName.includes('database')) return <Database className="w-5 h-5" />;
    return <Cpu className="w-5 h-5" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">Architecture Intelligence</h3>
        <p className="text-muted-foreground">How the project is structured and how its components interact.</p>
      </div>

      {/* Meta Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-white/5 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Architecture Pattern</p>
          <p className="text-lg font-bold text-foreground">{analysis.architecture.pattern}</p>
        </div>
        <div className="p-6 rounded-2xl bg-card border border-white/5 md:col-span-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Primary Entry Points</p>
          <div className="flex flex-wrap gap-2">
            {analysis.architecture.entry_points.map((entry, i) => (
              <span key={i} className="px-2.5 py-1 rounded bg-secondary text-[10px] font-mono text-muted-foreground border border-white/5">
                {entry}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Component Relationship Visualizer */}
      <div className="bg-card border border-white/5 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.01] pointer-events-none">
          <Box className="w-64 h-64" />
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">System Dependency Topology</h4>
          <span className="text-[10px] text-muted-foreground">Click any component to inspect metadata</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          {/* Level 1: Frontend Client */}
          {frontend && (
            <div 
              className="w-full max-w-sm"
              onMouseEnter={() => setHoveredComponentId(frontend.id)}
              onMouseLeave={() => setHoveredComponentId(null)}
            >
              <TopologyCard 
                component={frontend} 
                getIcon={getIcon} 
                onClick={() => setSelectedComponent(frontend)}
                isHovered={hoveredComponentId === frontend.id || hoveredComponentId === backend?.id}
              />
            </div>
          )}

          {/* Connection L1 -> L2 */}
          <div className="h-10 w-px bg-gradient-to-b from-white/20 to-white/10 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>

          {/* Level 2: API/Backend */}
          {backend && (
            <div 
              className="w-full max-w-sm"
              onMouseEnter={() => setHoveredComponentId(backend.id)}
              onMouseLeave={() => setHoveredComponentId(null)}
            >
              <TopologyCard 
                component={backend} 
                getIcon={getIcon} 
                onClick={() => setSelectedComponent(backend)}
                isHovered={hoveredComponentId === backend.id || hoveredComponentId === frontend?.id || infraComponents.some(c => c.id === hoveredComponentId)}
              />
            </div>
          )}

          {/* Connection L2 -> Infrastructure (Branching on desktop, vertical on mobile) */}
          <div className="w-full max-w-4xl hidden md:flex flex-col items-center">
            {/* Trunk */}
            <div className="h-6 w-px bg-white/10" />
            {/* Horizontal branch */}
            <div className="h-px bg-white/10 w-[66%]" />
            {/* Leaves */}
            <div className="flex justify-between w-[66%] h-6">
              <div className="w-px bg-white/10 h-full" />
              <div className="w-px bg-white/10 h-full" />
              <div className="w-px bg-white/10 h-full" />
            </div>
          </div>
          <div className="h-8 w-px bg-white/10 md:hidden" />

          {/* Level 3: Infrastructure Stack (Auth, Database, Orchestrator) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-2 md:mt-0">
            {infraComponents.map((comp) => (
              <div 
                key={comp.id}
                onMouseEnter={() => setHoveredComponentId(comp.id)}
                onMouseLeave={() => setHoveredComponentId(null)}
              >
                <TopologyCard 
                  component={comp} 
                  getIcon={getIcon} 
                  onClick={() => setSelectedComponent(comp)}
                  isHovered={hoveredComponentId === comp.id || hoveredComponentId === backend?.id}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side Panel for Component Details */}
      <AnimatePresence>
        {selectedComponent && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedComponent(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-white/10 z-50 p-8 overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => setSelectedComponent(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mt-8 space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground">
                      {getIcon(selectedComponent.name)}
                    </div>
                    <span className="text-[10px] font-bold font-mono tracking-widest text-muted-foreground uppercase">{selectedComponent.technology}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{selectedComponent.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedComponent.purpose}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/80 flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    Responsibilities
                  </h4>
                  <ul className="space-y-2">
                    {selectedComponent.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/80 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-muted-foreground" />
                    Related Files
                  </h4>
                  <div className="bg-secondary/40 rounded-2xl p-4 border border-white/5 space-y-1.5">
                    {selectedComponent.related_files.map((file, i) => (
                      <div key={i} className="text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer select-all truncate">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Code Evidence</h4>
                  <p className="text-xs italic text-muted-foreground leading-relaxed p-4 bg-white/[0.01] border-l border-white/20 rounded-r-2xl">
                    "{selectedComponent.evidence}"
                  </p>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <div className="flex-1 p-4 rounded-2xl bg-secondary/20 border border-white/5">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Architecture Tier</p>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedComponent.id === 'comp-1' ? 'Client' : selectedComponent.id === 'comp-2' ? 'API Gateway' : 'Infrastructure'}
                    </p>
                  </div>
                  <div className="flex-1 p-4 rounded-2xl bg-secondary/20 border border-white/5">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Dependencies</p>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedComponent.dependencies.length > 0 ? selectedComponent.dependencies.join(', ') : 'None'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CardProps {
  component: ArchitectureComponent;
  getIcon: (name: string) => React.ReactNode;
  onClick: () => void;
  isHovered: boolean;
}

const TopologyCard: React.FC<CardProps> = ({ component, getIcon, onClick, isHovered }) => {
  return (
    <div 
      onClick={onClick}
      className={`group p-5 rounded-2xl bg-card border cursor-pointer transition-all hover:bg-white/[0.01] ${
        isHovered ? 'border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.02)]' : 'border-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:scale-105 transition-all">
          {getIcon(component.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-xs text-foreground truncate">{component.name}</h5>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{component.purpose}</p>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureSection;

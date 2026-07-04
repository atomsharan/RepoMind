import React, { useState } from 'react';
import type { ProjectMemoryEvent } from '../../types';
import { 
  History, 
  GitCommit, 
  Calendar, 
  ChevronDown,
  Info,
  Files
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  analysis: {
    memory: ProjectMemoryEvent[];
  };
}

const MemorySection: React.FC<Props> = ({ analysis }) => {
  // Track expanded state of timeline events, default first event to expanded
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({
    'mem-1': true
  });

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">Project Memory</h3>
        <p className="text-muted-foreground">Reconstructed engineering context from repository activity and historical changes.</p>
      </div>

      <div className="relative mt-8">
        {/* Timeline vertical track line */}
        <div className="absolute left-[23px] top-6 bottom-6 w-px bg-white/5 z-0" />
        
        <div className="space-y-8">
          {analysis.memory.map((event) => {
            const isExpanded = !!expandedEvents[event.id];

            return (
              <div key={event.id} className="relative pl-12 group z-10">
                {/* Timeline node icon */}
                <div 
                  onClick={() => toggleExpand(event.id)}
                  className="absolute left-0 top-1 w-12 h-12 rounded-2xl bg-card border border-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer hover:border-white/20 transition-all active:scale-95"
                >
                  <History className="w-5 h-5" />
                </div>

                {/* Timeline Card */}
                <div className="p-6 rounded-3xl bg-card border border-white/5 hover:border-white/10 transition-colors">
                  {/* Card Header (clickable to expand) */}
                  <div 
                    onClick={() => toggleExpand(event.id)}
                    className="flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold font-mono tracking-widest text-muted-foreground uppercase mb-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span>{event.date}</span>
                      </div>
                      <h4 className="text-base font-bold text-foreground hover:text-foreground/90 transition-colors">
                        {event.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {event.evidence.commit && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-mono text-muted-foreground">
                          <GitCommit className="w-3 h-3" />
                          {event.evidence.commit}
                        </div>
                      )}
                      <div className={`p-1.5 rounded-full hover:bg-white/5 text-muted-foreground transition-all ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details Container */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-6 mt-4 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Explanation Column */}
                          <div className="space-y-4">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {event.summary}
                            </p>
                            
                            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                              <div className="flex items-center gap-2 mb-2 text-foreground/80">
                                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Why It Matters</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed italic">
                                {event.why_it_matters}
                              </p>
                            </div>
                          </div>

                          {/* Evidence Files Column */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-foreground/80">
                              <Files className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Indexed Evidence Files</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {event.evidence.files.map((file, i) => (
                                <span 
                                  key={i} 
                                  className="px-2.5 py-1 rounded bg-secondary/50 border border-white/5 text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer select-all"
                                >
                                  {file}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MemorySection;

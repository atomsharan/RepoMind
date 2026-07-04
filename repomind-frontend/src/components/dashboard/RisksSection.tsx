import React from 'react';
import type { TechnicalRisk } from '../../types';
import { 
  ShieldAlert, 
  FileWarning,
  ExternalLink,
  CheckCircle,
  Clock,
  Code
} from 'lucide-react';

interface Props {
  analysis: {
    risks: TechnicalRisk[];
  };
}

const RisksSection: React.FC<Props> = ({ analysis }) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': 
        return 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)]';
      case 'HIGH': 
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'MEDIUM': 
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'LOW': 
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: 
        return 'bg-muted/10 text-muted border-muted/20';
    }
  };

  const getBorderColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-white/10';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">Evidence-Backed Risks</h3>
        <p className="text-muted-foreground">Technical risks identified through repository investigation and static heuristic checks.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {analysis.risks.map((risk) => (
          <div 
            key={risk.id} 
            className="group p-6 sm:p-8 rounded-3xl bg-card border border-white/5 hover:border-white/10 transition-all flex flex-col lg:flex-row gap-8 relative overflow-hidden"
          >
            {/* Color Accent Indicator Strip */}
            <div className={`absolute top-0 left-0 w-1 h-full transition-all ${getBorderColor(risk.severity)}`} />

            {/* Left Column: Metadata & Overview */}
            <div className="lg:w-1/3 space-y-5">
              <div className="flex items-center gap-4">
                <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold tracking-widest border uppercase ${getSeverityStyle(risk.severity)}`}>
                  {risk.severity}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Detected 2h ago
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-foreground mb-2 group-hover:text-foreground/90 transition-colors">
                  {risk.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {risk.description}
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Affected Files</h5>
                <div className="flex flex-wrap gap-1.5">
                  {risk.affected_files.map((file, i) => (
                    <span 
                      key={i} 
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-secondary/50 border border-white/5 text-[9px] font-mono text-muted-foreground hover:text-foreground cursor-default transition-colors"
                    >
                      <FileWarning className="w-3 h-3 opacity-50 shrink-0" />
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Code/Impact Details */}
            <div className="lg:w-2/3 flex flex-col gap-6 bg-white/[0.01] p-6 rounded-2xl border border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Potential Impact</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {risk.potential_impact}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4 opacity-80" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Recommended Action</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    {risk.recommended_action}
                  </p>
                </div>
              </div>

              {/* Prominent Evidence Code Block */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Window Controls Dots */}
                    <div className="flex gap-1.5 mr-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <Code className="w-3 h-3 text-muted-foreground" />
                      {risk.affected_files[0] || 'analysis_log'}
                    </span>
                  </div>
                  
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                    Evidence Match
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>

                <div className="text-[11px] font-mono text-muted-foreground bg-[#0a0d12]/50 p-4 rounded-xl border border-white/5 select-all overflow-x-auto leading-relaxed">
                  <span className="text-white font-bold select-none mr-2">»</span>
                  {risk.evidence}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RisksSection;

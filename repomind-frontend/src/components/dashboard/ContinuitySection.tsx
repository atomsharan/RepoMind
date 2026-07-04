import React from 'react';
import type { ContinuityPlan, RoadmapItem } from '../../types';
import { 
  Zap, 
  Calendar, 
  Target, 
  Clock,
  Sparkles,
  Flag
} from 'lucide-react';

interface Props {
  analysis: {
    continuity_plan: ContinuityPlan;
  };
}

const ContinuitySection: React.FC<Props> = ({ analysis }) => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">Continuity Plan</h3>
        <p className="text-muted-foreground">A prioritized roadmap for developers continuing this project based on reconstructed context.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <PlanGroup 
          title="First 24 Hours" 
          subtitle="Immediate onboarding & stability" 
          items={analysis.continuity_plan.first_24_hours} 
          icon={Zap}
          accentColor="text-orange-400 bg-orange-500/10 border-orange-500/20"
        />
        <PlanGroup 
          title="First Week" 
          subtitle="Deep dives & infrastructure" 
          items={analysis.continuity_plan.first_week} 
          icon={Calendar}
          accentColor="text-blue-400 bg-blue-500/10 border-blue-500/20"
        />
        <PlanGroup 
          title="Next Priorities" 
          subtitle="Scaling & future roadmap" 
          items={analysis.continuity_plan.next_priorities} 
          icon={Target}
          accentColor="text-purple-400 bg-purple-500/10 border-purple-500/20"
        />
      </div>
    </div>
  );
};

const PlanGroup = ({ title, subtitle, items, icon: Icon, accentColor }: any) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-blue-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${accentColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-foreground">{title}</h4>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item: RoadmapItem) => (
          <div 
            key={item.id} 
            className="p-6 rounded-3xl bg-card border border-white/5 hover:border-white/10 hover:bg-white/[0.01] transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <Flag className={`w-3.5 h-3.5 ${getPriorityColor(item.priority)}`} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {item.priority} Priority
                  </span>
               </div>
               <Sparkles className="w-3.5 h-3.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <h5 className="font-bold text-xs text-foreground group-hover:text-foreground/90 transition-colors mb-3 leading-snug">
              {item.action}
            </h5>
            
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground/80 font-semibold italic">Rationale:</span> {item.reason}
              </p>
              
              <div className="flex items-center gap-2 pt-3 border-t border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium text-muted-foreground">
                  Expected Impact: <span className="text-foreground">{item.expected_impact}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {item.related_files.slice(0, 3).map((file, i) => (
                  <span 
                    key={i} 
                    className="text-[9px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5 hover:text-foreground cursor-pointer"
                  >
                    {file}
                  </span>
                ))}
                {item.related_files.length > 3 && (
                  <span className="text-[9px] font-mono text-muted-foreground/60 flex items-center">
                    +{item.related_files.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContinuitySection;

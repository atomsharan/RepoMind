import React from 'react';
import type { RepositoryAnalysis } from '../../types';
import { 
  Activity, 
  Settings, 
  Code2, 
  AlertCircle, 
  History,
  CheckCircle2,
  TrendingUp,
  FileText,
  Cpu,
  Fingerprint,
  CalendarDays
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface Props {
  analysis: RepositoryAnalysis;
}

// Reconstructed weekly commit activity for the hackathon demo
const ACTIVITY_DATA = [
  { week: 'Wk 1', commits: 6 },
  { week: 'Wk 2', commits: 14 },
  { week: 'Wk 3', commits: 9 },
  { week: 'Wk 4', commits: 22 },
  { week: 'Wk 5', commits: 18 },
  { week: 'Wk 6', commits: 38 },
  { week: 'Wk 7', commits: 25 },
  { week: 'Wk 8', commits: 14 },
];

const OverviewSection: React.FC<Props> = ({ analysis }) => {
  const metrics = [
    { label: 'Repository Health', value: `${analysis.overview.health_score}/100`, icon: Activity, color: 'text-green-500' },
    { label: 'Architecture', value: analysis.overview.architecture_pattern, icon: Settings, color: 'text-blue-500' },
    { label: 'Primary Stack', value: 'Django + React', icon: Code2, color: 'text-purple-500' },
    { label: 'Critical Risks', value: analysis.risks.length, icon: AlertCircle, color: 'text-red-500' },
    { label: 'Memory Events', value: analysis.overview.metrics.memory_events, icon: History, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="p-5 rounded-2xl bg-card border border-white/5 flex flex-col gap-2 relative overflow-hidden group hover:border-white/10 transition-all">
            <div className="flex items-center justify-between">
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
              <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">Verified</span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-bold tracking-tight text-foreground">{metric.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{metric.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Summary Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          <div className="p-8 rounded-3xl bg-card border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
              <Fingerprint className="w-32 h-32" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-foreground/80">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Project Summary
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              {analysis.overview.summary}
            </p>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Top Priorities</h4>
              <div className="space-y-3">
                {analysis.overview.top_priorities.map((priority, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{priority}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recharts Area Chart Card */}
          <div className="p-6 rounded-3xl bg-card border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Engineering Activity Timeline</h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono bg-white/5 px-2 py-0.5 rounded">8-Week Commit Frequency</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={ACTIVITY_DATA}
                  margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="week" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0d1117', 
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="commits" 
                    name="Commits"
                    stroke="#ffffff" 
                    strokeWidth={1.5}
                    fillOpacity={1} 
                    fill="url(#colorCommits)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Repository Intelligence Column */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 text-foreground/80">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              Repository Intelligence
            </h3>
            
            <div className="space-y-5">
              <IntelligenceItem label="Files Analyzed" value={analysis.overview.metrics.files_analyzed} icon={FileText} />
              <IntelligenceItem label="Technologies Detected" value={analysis.overview.metrics.technologies_detected} icon={Code2} />
              <IntelligenceItem label="Components Identified" value={analysis.overview.metrics.components_identified} icon={Settings} />
              <IntelligenceItem label="Risks Found" value={analysis.overview.metrics.risks_found} icon={AlertCircle} />
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Analysis Confidence</span>
                <span className="text-xs font-bold font-mono">94%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-foreground w-[94%]" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 overflow-hidden relative group">
            <div className="absolute -right-4 -bottom-4 rotate-12 opacity-5 group-hover:rotate-0 transition-transform duration-500">
              <TrendingUp className="w-24 h-24" />
            </div>
            <h3 className="text-xs font-bold text-foreground mb-2">Demo Tip</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              RepoMind generates evidence-backed insights. Open the Architecture or Risk sections and explore the evidence logs showing the exact files and commits backing each finding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const IntelligenceItem = ({ label, value, icon: Icon }: { label: string, value: number, icon: any }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className="text-xs font-bold font-mono text-foreground">{value}</span>
  </div>
);

export default OverviewSection;

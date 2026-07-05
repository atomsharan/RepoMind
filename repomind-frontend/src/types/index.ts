export interface RepositoryAnalysis {
  analysis_id: string;
  repository_name: string;
  repository_url: string;
  status: 'processing' | 'completed' | 'failed';
  overview: ProjectOverview;
  architecture: ArchitectureAnalysis;
  memory: ProjectMemoryEvent[];
  risks: TechnicalRisk[];
  continuity_plan: ContinuityPlan;
}

export interface ProjectOverview {
  health_score: number;
  architecture_pattern: string;
  primary_stack: string[];
  summary: string;
  top_priorities: string[];
  metrics: {
    files_analyzed: number;
    technologies_detected: number;
    components_identified: number;
    risks_found: number;
    memory_events: number;
  };
}

export interface ArchitectureAnalysis {
  pattern: string;
  technology_stack: string[];
  entry_points: string[];
  components: ArchitectureComponent[];
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  purpose: string;
  technology: string;
  related_files: string[];
  responsibilities: string[];
  dependencies: string[];
  evidence: string;
}

export interface ProjectMemoryEvent {
  id: string;
  title: string;
  date: string;
  summary: string;
  why_it_matters: string;
  evidence: {
    commit?: string;
    files: string[];
  };
}

export interface TechnicalRisk {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affected_files: string[];
  evidence: string;
  potential_impact: string;
  recommended_action: string;
}

export interface ContinuityPlan {
  first_24_hours: RoadmapItem[];
  first_week: RoadmapItem[];
  next_priorities: RoadmapItem[];
}

export interface RoadmapItem {
  id: string;
  action: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  related_files: string[];
  expected_impact: string;
}

export interface AnalysisStatus {
  status: 'processing' | 'completed' | 'failed';
  current_stage: string;
  progress: number;
  message: string;
  error?: string;
}

export interface ChatQuestion {
  question: string;
}

export interface ChatResponse {
  answer: string;
  evidence: string[];
  related_files: string[];
  confidence: number;
}

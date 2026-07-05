import axios from 'axios';
import { MOCK_ANALYSIS } from '../data/mock';
import type { 
  RepositoryAnalysis, 
  AnalysisStatus, 
  ChatResponse 
} from '../types';

export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const describeApiError = (error: unknown, fallback: string): Error => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    const message =
      data?.error ||
      data?.detail ||
      Object.values(data || {}).flat().join(' ') ||
      error.message;

    return new Error(message || fallback);
  }

  return error instanceof Error ? error : new Error(fallback);
};

const textFromEvidence = (evidence: unknown): string => {
  if (typeof evidence === 'string') return evidence;
  if (evidence && typeof evidence === 'object') {
    const item = evidence as Record<string, unknown>;
    const file = typeof item.file === 'string' ? item.file : '';
    const reference = typeof item.reference === 'string' ? item.reference : '';
    const description = typeof item.description === 'string' ? item.description : '';
    return [file || reference, description].filter(Boolean).join(': ');
  }
  return String(evidence ?? '');
};

const filesFromEvidence = (evidence: unknown): string[] => {
  if (!Array.isArray(evidence)) return [];
  return evidence
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return typeof record.file === 'string' ? record.file : '';
      }
      return '';
    })
    .filter(Boolean);
};

const normalizeChatResponse = (data: any): ChatResponse => ({
  answer: String(data?.answer ?? ''),
  evidence: Array.isArray(data?.evidence) ? data.evidence.map(textFromEvidence) : [],
  related_files: Array.isArray(data?.related_files) ? data.related_files : [],
  confidence: Number(data?.confidence ?? 0),
});

const normalizeAnalysis = (data: any): RepositoryAnalysis => {
  const repository = data?.repository ?? {};
  const overview = data?.overview ?? {};
  const architecture = data?.architecture ?? {};
  const risks = Array.isArray(data?.risks) ? data.risks : [];
  const memory = Array.isArray(data?.project_memory) ? data.project_memory : data?.memory;

  return {
    analysis_id: String(data?.analysis_id ?? ''),
    repository_name: String(data?.repository_name ?? repository.name ?? ''),
    repository_url: String(data?.repository_url ?? repository.url ?? ''),
    status: data?.status ?? 'completed',
    overview: {
      health_score: Number(overview.health_score ?? 0),
      architecture_pattern: String(overview.architecture_pattern ?? architecture.pattern ?? 'Unknown'),
      primary_stack: Array.isArray(overview.primary_stack) ? overview.primary_stack : [],
      summary: String(overview.summary ?? ''),
      top_priorities: Array.isArray(overview.top_priorities)
        ? overview.top_priorities.map((priority: any) => (
            typeof priority === 'string'
              ? priority
              : [priority?.action, priority?.reason].filter(Boolean).join(' - ')
          ))
        : [],
      metrics: {
        files_analyzed: Number(overview.metrics?.files_analyzed ?? overview.files_analyzed ?? 0),
        technologies_detected: Number(overview.metrics?.technologies_detected ?? overview.technologies_detected ?? 0),
        components_identified: Number(overview.metrics?.components_identified ?? overview.components_identified ?? 0),
        risks_found: Number(overview.metrics?.risks_found ?? overview.risks_found ?? risks.length),
        memory_events: Number(overview.metrics?.memory_events ?? overview.memory_events ?? (Array.isArray(memory) ? memory.length : 0)),
      },
    },
    architecture: {
      pattern: String(architecture.pattern ?? 'Unknown'),
      technology_stack: Array.isArray(architecture.technology_stack)
        ? architecture.technology_stack
        : Array.isArray(architecture.technologies)
          ? architecture.technologies
          : [],
      entry_points: Array.isArray(architecture.entry_points) ? architecture.entry_points : [],
      components: Array.isArray(architecture.components)
        ? architecture.components.map((component: any, index: number) => ({
            id: component?.id?.startsWith?.('comp-') ? component.id : `comp-${index + 1}`,
            name: String(component?.name ?? 'Unnamed Component'),
            purpose: String(component?.purpose ?? ''),
            technology: Array.isArray(component?.technology)
              ? component.technology.join(', ')
              : String(component?.technology ?? ''),
            related_files: Array.isArray(component?.related_files) ? component.related_files : [],
            responsibilities: Array.isArray(component?.responsibilities) ? component.responsibilities : [],
            dependencies: Array.isArray(component?.dependencies) ? component.dependencies : [],
            evidence: Array.isArray(component?.evidence)
              ? component.evidence.map(textFromEvidence).join(' ')
              : textFromEvidence(component?.evidence),
          }))
        : [],
    },
    memory: Array.isArray(memory)
      ? memory.map((event: any, index: number) => ({
          id: String(event?.id ?? `mem-${index + 1}`),
          title: String(event?.title ?? 'Project Event'),
          date: String(event?.date ?? ''),
          summary: String(event?.summary ?? ''),
          why_it_matters: String(event?.why_it_matters ?? ''),
          evidence: {
            commit: Array.isArray(event?.evidence)
              ? event.evidence.find((item: any) => item?.type === 'commit')?.reference
              : event?.evidence?.commit,
            files: Array.isArray(event?.evidence?.files)
              ? event.evidence.files
              : filesFromEvidence(event?.evidence),
          },
        }))
      : [],
    risks: risks.map((risk: any, index: number) => ({
      id: String(risk?.id ?? `risk-${index + 1}`),
      title: String(risk?.title ?? 'Technical Risk'),
      severity: risk?.severity ?? 'LOW',
      description: String(risk?.description ?? ''),
      affected_files: Array.isArray(risk?.affected_files) ? risk.affected_files : [],
      evidence: Array.isArray(risk?.evidence)
        ? risk.evidence.map(textFromEvidence).join(' ')
        : textFromEvidence(risk?.evidence),
      potential_impact: String(risk?.potential_impact ?? ''),
      recommended_action: String(risk?.recommended_action ?? ''),
    })),
    continuity_plan: {
      first_24_hours: (data?.continuity_plan?.first_24_hours ?? []).map((item: any, index: number) => ({
        ...item,
        id: String(item?.id ?? `first-24-${index + 1}`),
      })),
      first_week: (data?.continuity_plan?.first_week ?? []).map((item: any, index: number) => ({
        ...item,
        id: String(item?.id ?? `first-week-${index + 1}`),
      })),
      next_priorities: (data?.continuity_plan?.next_priorities ?? []).map((item: any, index: number) => ({
        ...item,
        id: String(item?.id ?? `next-${index + 1}`),
      })),
    },
  };
};

export const analysisService = {
  async startAnalysis(repoUrl: string): Promise<{ analysis_id: string; repository_name: string }> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        analysis_id: MOCK_ANALYSIS.analysis_id,
        repository_name: MOCK_ANALYSIS.repository_name,
      };
    }
    try {
      const response = await api.post('/analysis/', { repository_url: repoUrl });
      return response.data;
    } catch (error) {
      throw describeApiError(error, 'Failed to start repository analysis.');
    }
  },

  async getStatus(analysisId: string): Promise<AnalysisStatus> {
    if (USE_MOCK_DATA) {
      // This is handled by the loading page component's local state for the demo
      return {
        status: 'completed',
        current_stage: 'completed',
        progress: 100,
        message: 'Analysis complete',
      };
    }
    try {
      const response = await api.get(`/analysis/${analysisId}/status/`);
      return response.data;
    } catch (error) {
      throw describeApiError(error, 'Failed to fetch analysis status.');
    }
  },

  async getAnalysis(analysisId: string): Promise<RepositoryAnalysis> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return MOCK_ANALYSIS;
    }
    try {
      const response = await api.get(`/analysis/${analysisId}/`);
      return normalizeAnalysis(response.data);
    } catch (error) {
      throw describeApiError(error, 'Failed to fetch repository analysis.');
    }
  },

  async askQuestion(analysisId: string, question: string): Promise<ChatResponse> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const q = question.toLowerCase();
      
      if (q.includes('start') || q.includes('developer') || q.includes('onboard')) {
        return {
          answer: "A new developer should start by exploring the Frontend Client setup in `package.json` and checking `manage.py` on the backend. The first roadmap task is 'Review authentication architecture' located in `auth/` and `settings.py` to understand user context flow. There are 2 entry point files for the backend and 1 for the frontend client.",
          evidence: [
            "Roadmap task rp-1: Understand authentication architecture",
            "Entry points: manage.py, src/main.tsx, core/settings.py"
          ],
          related_files: ["src/main.tsx", "manage.py", "core/settings.py"],
          confidence: 0.91
        };
      }
      
      if (q.includes('auth') || q.includes('jwt') || q.includes('login') || q.includes('token')) {
        return {
          answer: "Authentication is implemented using stateless JSON Web Tokens (JWT) via SimpleJWT. The main configurations reside in `core/settings.py` under the REST_FRAMEWORK and SIMPLE_JWT settings blocks. Request credentials are verified in `auth/middleware.py` and endpoints are exposed in `api/views/auth.py`.",
          evidence: [
            "Import of rest_framework_simplejwt.authentication.JWTAuthentication in settings.py",
            "JWT token endpoints registered in api/urls.py"
          ],
          related_files: ["core/settings.py", "api/views/auth.py", "auth/middleware.py"],
          confidence: 0.95
        };
      }
      
      if (q.includes('risk') || q.includes('security') || q.includes('vulnerabilit')) {
        return {
          answer: "There are 3 risks identified. The highest priority is a CRITICAL risk of Hardcoded API Credentials (specifically an OpenAI API key in settings.py). There is also a HIGH risk where development configuration (DEBUG=True) is active in production files, and a MEDIUM risk of outdated Celery (4.x) dependencies.",
          evidence: [
            "OpenAI API key literal Sk-proj-... found in settings.py",
            "Outdated Celery 4.x requirement in requirements.txt"
          ],
          related_files: ["core/settings.py", "core/orchestrator.py", "requirements.txt"],
          confidence: 0.98
        };
      }
      
      if (q.includes('work on') || q.includes('next') || q.includes('priorit') || q.includes('roadmap')) {
        return {
          answer: "Immediate priorities are outlined in the Continuity Plan: 1) Secure the authentication configuration (First 24 Hours). 2) Upgrade Celery from 4.x to 5.x to apply security patches. 3) Implement comprehensive logging in the AST extraction files (First Week) to assist with diagnostics.",
          evidence: [
            "Outdated celery requirement in requirements.txt",
            "Lack of log outputs in extractors/ base class files"
          ],
          related_files: ["core/settings.py", "requirements.txt", "extractors/"],
          confidence: 0.89
        };
      }

      // Default fallback response
      return {
        answer: `I have analyzed ${analysisId === 'repo-123' ? 'RepoMind-Engine' : 'the repository'}. The project uses a Modular Monolith pattern built on Django (DRF) and React. It contains 5 major components (Frontend Client, Backend API, Auth Middleware, Database Layer, and Celery worker). Please ask me a specific question about authentication, risks, onboarding, or the roadmap.`,
        evidence: [
          "Identified 5 components in project topology",
          "Analyzed 142 codebase files"
        ],
        related_files: ["core/settings.py", "src/App.tsx", "package.json"],
        confidence: 0.85
      };
    }
    try {
      const response = await api.post(`/analysis/${analysisId}/ask/`, { question });
      return normalizeChatResponse(response.data);
    } catch (error) {
      throw describeApiError(error, 'Failed to ask RepoMind a question.');
    }
  }
};

import axios from 'axios';
import { MOCK_ANALYSIS } from '../data/mock';
import type { 
  RepositoryAnalysis, 
  AnalysisStatus, 
  ChatResponse 
} from '../types';

export const USE_MOCK_DATA = true;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analysisService = {
  async startAnalysis(repoUrl: string): Promise<{ analysis_id: string; repository_name: string }> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        analysis_id: MOCK_ANALYSIS.analysis_id,
        repository_name: MOCK_ANALYSIS.repository_name,
      };
    }
    const response = await api.post('/analysis/', { repository_url: repoUrl });
    return response.data;
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
    const response = await api.get(`/analysis/${analysisId}/status/`);
    return response.data;
  },

  async getAnalysis(analysisId: string): Promise<RepositoryAnalysis> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return MOCK_ANALYSIS;
    }
    const response = await api.get(`/analysis/${analysisId}/`);
    return response.data;
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
    const response = await api.post(`/analysis/${analysisId}/ask/`, { question });
    return response.data;
  }
};

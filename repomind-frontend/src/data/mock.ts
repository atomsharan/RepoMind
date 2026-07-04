import type { RepositoryAnalysis } from "../types";

export const MOCK_ANALYSIS: RepositoryAnalysis = {
  analysis_id: "repo-123",
  repository_name: "RepoMind-Engine",
  repository_url: "https://github.com/repomind/engine",
  status: 'completed',
  overview: {
    health_score: 72,
    architecture_pattern: "Modular Monolith",
    primary_stack: ["Django", "React", "TypeScript", "PostgreSQL", "Redis", "Celery", "OpenAI"],
    summary: "This repository is the core intelligence engine for RepoMind. It uses Django REST Framework for backend services and integrates multiple AI models for repository analysis. The application follows a modular architecture with clear separation between analysis orchestrators, knowledge extractors, and API layers.",
    top_priorities: [
      "Review authentication configuration for production environment.",
      "Update outdated dependencies (celery, redis-py).",
      "Improve API documentation for the intelligence endpoints."
    ],
    metrics: {
      files_analyzed: 142,
      technologies_detected: 12,
      components_identified: 5,
      risks_found: 3,
      memory_events: 14
    }
  },
  architecture: {
    pattern: "Modular Monolith",
    technology_stack: ["Django", "React", "TypeScript", "PostgreSQL", "Redis", "Celery"],
    entry_points: ["manage.py", "src/main.tsx", "core/settings.py", "api/urls.py"],
    components: [
      {
        id: "comp-1",
        name: "Frontend Application",
        purpose: "Handles user interaction, analysis visualizations, and real-time polling.",
        technology: "React + TypeScript + Vite + Tailwind CSS",
        related_files: ["src/App.tsx", "src/pages/DashboardPage.tsx", "package.json"],
        responsibilities: [
          "State management for dashboards",
          "API requests using Axios",
          "Visualizing architecture components and repository risks"
        ],
        dependencies: ["Backend API"],
        evidence: "Vite dev server and React routing configurations detected in src/ directory."
      },
      {
        id: "comp-2",
        name: "Backend API",
        purpose: "Exposes REST endpoints for analysis status, project overview, risks, and Q&A.",
        technology: "Django REST Framework (DRF) + Python",
        related_files: ["api/views.py", "api/urls.py", "core/settings.py"],
        responsibilities: [
          "Triggering and orchestrating repository analysis tasks",
          "Serializing database records for frontend clients",
          "Parsing search queries for LLM-grounded Q&A"
        ],
        dependencies: ["Authentication Service", "Database Layer", "Analysis Orchestrator"],
        evidence: "Django REST Framework urlpatterns and class-based views in api/urls.py."
      },
      {
        id: "comp-3",
        name: "Authentication Service",
        purpose: "Validates user session identity and issues token credentials.",
        technology: "SimpleJWT + Django Auth",
        related_files: ["core/settings.py", "api/views/auth.py", "auth/middleware.py"],
        responsibilities: [
          "Stateless token-based authentication (JWT)",
          "Restricting API endpoints to authorized users",
          "Refreshing authentication tokens"
        ],
        dependencies: ["Database Layer"],
        evidence: "SimpleJWT configuration and JWTAuthentication middleware registered in settings.py."
      },
      {
        id: "comp-4",
        name: "Database Layer",
        purpose: "Maintains records of analyzed projects, security findings, and token listings.",
        technology: "PostgreSQL + Redis",
        related_files: ["core/settings.py", "db/models.py"],
        responsibilities: [
          "Persisting analyzed repository data",
          "Storing temporary Q&A conversation memory",
          "Brokering Celery task distribution via Redis queues"
        ],
        dependencies: [],
        evidence: "DATABASES setting pointing to postgresql backend and django_redis configurations."
      },
      {
        id: "comp-5",
        name: "Analysis Orchestrator",
        purpose: "Asynchronously coordinates extractors, AST code parsers, and LLM summaries.",
        technology: "Python + Celery + OpenAI API",
        related_files: ["core/orchestrator.py", "tasks/analysis.py"],
        responsibilities: [
          "Spawning background tasks for file system parsing",
          "Analyzing commit logs and authorship activity",
          "Calling OpenAI API for summarizing design decisions"
        ],
        dependencies: ["Database Layer"],
        evidence: "Celery app integration in core/celery.py and task decorators in tasks/analysis.py."
      }
    ]
  },
  memory: [
    {
      id: "mem-1",
      title: "JWT Authentication Introduced",
      date: "2024-02-12",
      summary: "Authentication was migrated from session-based to token-based access using SimpleJWT.",
      why_it_matters: "This enabled stateless API authentication, which was necessary for the new mobile client and CLI tool.",
      evidence: {
        commit: "a82fd1",
        files: ["core/settings.py", "api/views/auth.py"]
      }
    },
    {
      id: "mem-2",
      title: "Asynchronous Analysis Tasks",
      date: "2024-02-19",
      summary: "Long-running analysis jobs were moved to background workers using Celery and Redis.",
      why_it_matters: "Prevented API timeouts and improved user experience during large repository analysis.",
      evidence: {
        commit: "b91ce2",
        files: ["core/celery.py", "tasks/repo_tasks.py"]
      }
    },
    {
      id: "mem-3",
      title: "OpenAI GPT-4 Integration",
      date: "2024-03-05",
      summary: "Analysis summarization was upgraded from GPT-3.5 to GPT-4 to extract deeper architectural patterns.",
      why_it_matters: "Improved the accuracy of risk identification and quality of generated project summaries.",
      evidence: {
        commit: "e92ff8",
        files: ["core/orchestrator.py", "requirements.txt"]
      }
    },
    {
      id: "mem-4",
      title: "Database Migration to PostgreSQL",
      date: "2024-01-15",
      summary: "Switched local SQLite database to PostgreSQL for production parity.",
      why_it_matters: "Ensures storage scalability for indexed repository tokens and concurrent workspace runs.",
      evidence: {
        commit: "c3d2e1",
        files: ["core/settings.py", "db/migrations/"]
      }
    }
  ],
  risks: [
    {
      id: "risk-1",
      title: "Authentication Configuration Risk",
      severity: "HIGH",
      description: "Production authentication configuration may expose security weaknesses.",
      affected_files: ["settings.py", "auth/middleware.py"],
      evidence: "Development-oriented security configuration (DEBUG=True) detected in settings.py.",
      potential_impact: "Improper production configuration may weaken application security and expose sensitive data.",
      recommended_action: "Review environment-specific authentication and secret management. Ensure DEBUG=False in production."
    },
    {
      id: "risk-2",
      title: "Outdated Dependency",
      severity: "MEDIUM",
      description: "Critical dependencies are lagging behind major versions.",
      affected_files: ["requirements.txt"],
      evidence: "Celery version 4.x detected while 5.x is current.",
      potential_impact: "Missed security patches and performance improvements.",
      recommended_action: "Update requirements.txt and test task execution with Celery 5.x."
    },
    {
      id: "risk-3",
      title: "Hardcoded API Credentials",
      severity: "CRITICAL",
      description: "Sensitive API keys or credentials found hardcoded in setting templates.",
      affected_files: ["core/settings.py", "core/orchestrator.py"],
      evidence: "OpenAI API Key set to a literal string value 'sk-proj-u0gB...' inside settings.py.",
      potential_impact: "Unauthorized usage of AI backend quotas and billing exploitation if keys are committed.",
      recommended_action: "Migrate all secret keys to environment variables and utilize a library like django-environ."
    }
  ],
  continuity_plan: {
    first_24_hours: [
      {
        id: "rp-1",
        action: "Review authentication architecture",
        reason: "Authentication is a central dependency used across multiple application modules.",
        priority: "HIGH",
        related_files: ["auth/", "middleware/", "settings.py"],
        expected_impact: "Better understanding of security boundaries and user context flow."
      }
    ],
    first_week: [
      {
        id: "rp-2",
        action: "Implement comprehensive logging",
        reason: "Current logging is sparse in the extraction layer.",
        priority: "MEDIUM",
        related_files: ["extractors/"],
        expected_impact: "Easier debugging of failed analysis runs."
      }
    ],
    next_priorities: [
      {
        id: "rp-3",
        action: "Support multi-cloud deployments",
        reason: "Clients are requesting AWS and GCP support beyond current Heroku setup.",
        priority: "LOW",
        related_files: ["docker/", "scripts/"],
        expected_impact: "Wider market reach and better deployment flexibility."
      }
    ]
  }
};

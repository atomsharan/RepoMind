"""
V1 mock generators. These match the exact JSON contract the real
LLM-driven pipeline will produce in V2, so the frontend can be built
against realistic shapes before any GitHub/Gemini integration exists.
"""


def build_mock_final_analysis(analysis) -> dict:
    return {
        "analysis_id": str(analysis.id),
        "repository": {
            "name": analysis.repository_name,
            "owner": analysis.repository_owner,
            "url": analysis.repository_url,
        },
        "overview": {
            "summary": f"{analysis.repository_name} is a modular backend service with a clearly separated API layer, business logic, and data access components.",
            "health_score": 72,
            "architecture_pattern": "Modular Monolith",
            "primary_stack": ["Django", "PostgreSQL", "React"],
            "critical_risks": 1,
            "memory_events": 3,
            "files_analyzed": 25,
            "technologies_detected": 8,
            "components_identified": 2,
            "risks_found": 3,
            "top_priorities": [
                {
                    "priority": 1,
                    "action": "Review authentication configuration",
                    "reason": "Hardcoded secret key detected in settings.",
                },
                {
                    "priority": 2,
                    "action": "Add automated test coverage for the payments module",
                    "reason": "No test files were found for critical billing logic.",
                },
            ],
        },
        "architecture": {
            "pattern": "Modular Monolith",
            "summary": "The application is organized into distinct layers for API routing, business services, and data models, deployed as a single Django application.",
            "entry_points": ["manage.py", "config/wsgi.py"],
            "technologies": ["Django", "Django REST Framework", "SQLite", "React"],
            "components": [
                {
                    "id": "auth-service",
                    "name": "Authentication Service",
                    "purpose": "Handles user login, token issuance, and session management.",
                    "technology": ["Django", "DRF"],
                    "responsibilities": ["User authentication", "Token management"],
                    "dependencies": ["User Service"],
                    "related_files": ["auth/views.py", "auth/serializers.py"],
                    "evidence": [
                        {"file": "auth/views.py", "description": "Defines login and token refresh endpoints."}
                    ],
                },
                {
                    "id": "api-layer",
                    "name": "API Layer",
                    "purpose": "Exposes REST endpoints consumed by the frontend.",
                    "technology": ["Django REST Framework"],
                    "responsibilities": ["Request validation", "Response serialization"],
                    "dependencies": ["Business Services"],
                    "related_files": ["config/urls.py"],
                    "evidence": [
                        {"file": "config/urls.py", "description": "Registers all API route groups."}
                    ],
                },
            ],
        },
        "risks": [
            {
                "id": "risk-secret-key",
                "title": "Hardcoded Secret Key",
                "severity": "HIGH",
                "description": "A Django secret key appears to be committed directly in settings rather than loaded from an environment variable.",
                "affected_files": ["config/settings.py"],
                "evidence": [
                    {"file": "config/settings.py", "description": "SECRET_KEY is assigned a literal string value."}
                ],
                "potential_impact": "Compromise of the secret key could allow session or signed-token forgery.",
                "recommended_action": "Move SECRET_KEY to an environment variable and rotate the existing value.",
                "confidence": 0.9,
            },
            {
                "id": "risk-missing-tests",
                "title": "Limited Automated Test Coverage",
                "severity": "MEDIUM",
                "description": "Several core modules do not appear to have corresponding test files.",
                "affected_files": ["payments/services.py"],
                "evidence": [
                    {"file": "payments/services.py", "description": "No matching test_services.py found in the same app."}
                ],
                "potential_impact": "Regressions in billing logic may go undetected before release.",
                "recommended_action": "Add unit tests for payment calculation and edge cases.",
                "confidence": 0.75,
            },
            {
                "id": "risk-dependency-pinning",
                "title": "Unpinned Dependency Versions",
                "severity": "LOW",
                "description": "Some dependencies in the manifest do not specify exact versions.",
                "affected_files": ["requirements.txt"],
                "evidence": [
                    {"file": "requirements.txt", "description": "Several packages are listed without version pins."}
                ],
                "potential_impact": "Future installs may pull breaking changes unexpectedly.",
                "recommended_action": "Pin dependency versions and use a lockfile.",
                "confidence": 0.65,
            },
        ],
        "project_memory": [
            {
                "id": "memory-auth-introduced",
                "title": "Token Authentication Introduced",
                "date": "2026-01-12",
                "summary": "A commit modified the authentication middleware and added token issuance logic.",
                "why_it_matters": "This is likely when the project moved from session-based to token-based authentication.",
                "evidence": [
                    {"type": "commit", "reference": "a82fd1", "description": "Modified auth/middleware.py and added auth/tokens.py."}
                ],
            },
            {
                "id": "memory-payments-module-added",
                "title": "Payments Module Added",
                "date": "2026-02-03",
                "summary": "A new payments app was introduced with models for transactions and invoices.",
                "why_it_matters": "This marks when the project took on billing responsibilities, raising the stakes of regressions here.",
                "evidence": [
                    {"type": "commit", "reference": "f19b3c", "description": "Added payments/models.py and payments/services.py."}
                ],
            },
            {
                "id": "memory-large-refactor",
                "title": "Large Serializer Refactor",
                "date": "2026-03-21",
                "summary": "Multiple serializer files were restructured in a single commit touching over 15 files.",
                "why_it_matters": "Wide-reaching commits like this are common points where undocumented behavior changes are introduced.",
                "evidence": [
                    {"type": "commit", "reference": "9c4e21", "description": "Commit touched 17 files across 5 Django apps."}
                ],
            },
        ],
        "continuity_plan": {
            "first_24_hours": [
                {
                    "action": "Move SECRET_KEY out of source control",
                    "reason": "This is the highest-severity risk identified and is low-effort to fix.",
                    "priority": "HIGH",
                    "related_files": ["config/settings.py"],
                    "expected_impact": "Removes an immediate security exposure.",
                }
            ],
            "first_week": [
                {
                    "action": "Add unit tests for the payments module",
                    "reason": "Billing logic currently has no automated safety net.",
                    "priority": "MEDIUM",
                    "related_files": ["payments/services.py"],
                    "expected_impact": "Reduces risk of undetected billing regressions.",
                }
            ],
            "next_priorities": [
                {
                    "action": "Pin dependency versions",
                    "reason": "Prevents unexpected breaking changes from transitive updates.",
                    "priority": "LOW",
                    "related_files": ["requirements.txt"],
                    "expected_impact": "More predictable and reproducible builds.",
                }
            ],
        },
    }


def build_mock_answer(question: str, analysis) -> dict:
    return {
        "answer": (
            f"Based on the analysis of {analysis.repository_name}, a new developer should start "
            "with the Authentication Service in auth/views.py, since most other components depend "
            "on it, then review the API layer in config/urls.py."
        ),
        "evidence": [
            {"file": "auth/views.py", "description": "Defines the core authentication endpoints referenced throughout the codebase."}
        ],
        "related_files": ["auth/views.py", "config/urls.py"],
        "confidence": 0.8,
    }
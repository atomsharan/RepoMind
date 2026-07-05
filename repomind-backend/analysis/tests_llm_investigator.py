from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from analysis.llm.client import try_create_llm_client
from analysis.llm.investigator import answer_with_llm, enrich_analysis_with_llm
from analysis.repository_analyzer import answer_question


SAMPLE_ANALYSIS = {
    "repository": {"name": "sample-app", "owner": "example", "description": "Demo repo"},
    "overview": {
        "summary": "Static overview.",
        "health_score": 72,
        "architecture_pattern": "Django Application",
        "primary_stack": ["Python", "Django"],
        "top_priorities": [{"priority": 1, "action": "Add tests", "reason": "Few tests found."}],
        "files_analyzed": 12,
        "components_identified": 2,
        "risks_found": 1,
        "memory_events": 1,
    },
    "architecture": {
        "pattern": "Django Application",
        "summary": "Static architecture summary.",
        "entry_points": ["manage.py"],
        "technologies": ["Python", "Django"],
        "components": [
            {
                "id": "component-1",
                "name": "Config",
                "purpose": "Static purpose.",
                "related_files": ["config/settings.py"],
                "dependencies": [],
            }
        ],
    },
    "risks": [
        {
            "title": "Debug Mode Enabled",
            "severity": "HIGH",
            "description": "Debug appears enabled.",
            "affected_files": ["config/settings.py"],
            "recommended_action": "Disable debug in production.",
        }
    ],
    "project_memory": [
        {
            "id": "memory-1",
            "title": "Initial scaffold",
            "date": "2026-07-01",
            "summary": "Static memory summary.",
            "why_it_matters": "Static why.",
            "evidence": [{"type": "commit", "reference": "abc1234", "description": "Initial scaffold"}],
        }
    ],
    "continuity_plan": {
        "first_24_hours": [{"action": "Review settings.py", "reason": "Debug risk", "priority": "HIGH"}],
        "first_week": [],
        "next_priorities": [],
    },
}


class FakeLLMClient:
    def generate_json(self, prompt, **kwargs):
        if "developer's question" in prompt:
            return {
                "answer": "Start with manage.py and review config/settings.py because debug mode is enabled.",
                "evidence": ["config/settings.py: Debug appears enabled."],
                "related_files": ["manage.py", "config/settings.py"],
                "confidence": 0.91,
            }
        return {
            "overview_summary": "LLM overview grounded in Django evidence.",
            "architecture_summary": "LLM architecture summary for a Django app.",
            "memory_events": [
                {
                    "id": "memory-1",
                    "summary": "LLM memory summary for the initial scaffold commit.",
                    "why_it_matters": "Shows the latest project direction.",
                }
            ],
            "component_notes": [
                {
                    "id": "component-1",
                    "purpose": "LLM component purpose tied to settings.py.",
                }
            ],
        }


class LLMInvestigatorTests(SimpleTestCase):
    @override_settings(GEMINI_API_KEY="", LLM_PROVIDER="gemini")
    def test_try_create_llm_client_returns_none_without_api_key(self):
        self.assertIsNone(try_create_llm_client())

    def test_enrich_analysis_with_llm_updates_narrative_fields(self):
        enriched = enrich_analysis_with_llm(SAMPLE_ANALYSIS.copy(), llm_client=FakeLLMClient())

        self.assertEqual(enriched["overview"]["summary"], "LLM overview grounded in Django evidence.")
        self.assertEqual(enriched["architecture"]["summary"], "LLM architecture summary for a Django app.")
        self.assertEqual(enriched["project_memory"][0]["summary"], "LLM memory summary for the initial scaffold commit.")
        self.assertEqual(enriched["architecture"]["components"][0]["purpose"], "LLM component purpose tied to settings.py.")

    def test_enrich_analysis_leaves_static_analysis_when_llm_unavailable(self):
        with patch("analysis.llm.investigator.try_create_llm_client", return_value=None):
            enriched = enrich_analysis_with_llm(SAMPLE_ANALYSIS.copy())

        self.assertEqual(enriched["overview"]["summary"], "Static overview.")

    def test_answer_with_llm_returns_structured_response(self):
        answer = answer_with_llm("Where should a new developer start?", SAMPLE_ANALYSIS, llm_client=FakeLLMClient())

        self.assertIn("manage.py", answer["answer"])
        self.assertEqual(answer["confidence"], 0.91)
        self.assertIn("config/settings.py", answer["related_files"])

    def test_answer_question_prefers_llm_when_available(self):
        with patch("analysis.repository_analyzer.answer_with_llm", return_value={
            "answer": "Use the LLM answer.",
            "evidence": ["manage.py"],
            "related_files": ["manage.py"],
            "confidence": 0.88,
        }):
            result = answer_question("Where should I start?", SAMPLE_ANALYSIS)

        self.assertEqual(result["answer"], "Use the LLM answer.")

    def test_answer_question_falls_back_to_rules_when_llm_returns_none(self):
        with patch("analysis.repository_analyzer.answer_with_llm", return_value=None):
            result = answer_question("What are the security risks?", SAMPLE_ANALYSIS)

        self.assertIn("Debug Mode Enabled", result["answer"])

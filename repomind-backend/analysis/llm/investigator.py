import json
import logging
from typing import Any, Optional

from django.conf import settings

from .base import LLMConfigurationError, LLMError
from .client import LLMClient, try_create_llm_client
from .prompts import build_json_prompt

logger = logging.getLogger(__name__)

ENRICHMENT_OUTPUT_SCHEMA = """{
  "overview_summary": "2-3 sentence project overview grounded in evidence",
  "architecture_summary": "1-2 sentence architecture description grounded in evidence",
  "memory_events": [
    {
      "id": "memory-1",
      "summary": "What changed and why it matters",
      "why_it_matters": "Why a new developer should care"
    }
  ],
  "component_notes": [
    {
      "id": "component-1",
      "purpose": "Clear purpose statement tied to listed files"
    }
  ]
}"""

QA_OUTPUT_SCHEMA = """{
  "answer": "Direct answer using only provided evidence",
  "evidence": ["short evidence bullet", "another bullet"],
  "related_files": ["path/from/evidence"],
  "confidence": 0.85
}"""


def enrich_analysis_with_llm(analysis: dict, llm_client: LLMClient | None = None) -> dict:
    if not getattr(settings, "LLM_ENRICHMENT_ENABLED", True):
        return analysis

    client = llm_client or try_create_llm_client()
    if client is None:
        return analysis

    evidence = _compact_analysis_evidence(analysis)
    prompt = build_json_prompt(
        task=(
            "Rewrite the repository intelligence narrative for RepoMind. "
            "Improve overview_summary, architecture_summary, memory event summaries, "
            "and component purpose notes. Keep factual claims tied to the evidence. "
            "Do not invent files, commits, risks, or technologies that are not listed."
        ),
        evidence=json.dumps(evidence, indent=2),
        output_schema=ENRICHMENT_OUTPUT_SCHEMA,
    )

    try:
        enrichment = client.generate_json(prompt, temperature=0.2, max_output_tokens=1200)
    except LLMError as exc:
        logger.warning("LLM enrichment skipped: %s", exc)
        return analysis

    return _merge_enrichment(analysis, enrichment)


def answer_with_llm(question: str, analysis: dict, llm_client: LLMClient | None = None) -> dict | None:
    if not getattr(settings, "LLM_ENRICHMENT_ENABLED", True):
        return None

    client = llm_client or try_create_llm_client()
    if client is None:
        return None

    evidence = _compact_analysis_evidence(analysis)
    evidence["question"] = question
    prompt = build_json_prompt(
        task=(
            "Answer the developer's question about this repository using only the evidence. "
            "If the evidence is insufficient, say so in the answer and keep confidence below 0.5."
        ),
        evidence=json.dumps(evidence, indent=2),
        output_schema=QA_OUTPUT_SCHEMA,
    )

    try:
        payload = client.generate_json(prompt, temperature=0.2, max_output_tokens=700)
    except LLMError as exc:
        logger.warning("LLM Q&A fallback triggered: %s", exc)
        return None

    return _normalize_qa_response(payload)


def _merge_enrichment(analysis: dict, enrichment: Any) -> dict:
    if not isinstance(enrichment, dict):
        return analysis

    overview = analysis.setdefault("overview", {})
    architecture = analysis.setdefault("architecture", {})

    overview_summary = _clean_text(enrichment.get("overview_summary"))
    if overview_summary:
        overview["summary"] = overview_summary

    architecture_summary = _clean_text(enrichment.get("architecture_summary"))
    if architecture_summary:
        architecture["summary"] = architecture_summary

    memory_updates = {
        item.get("id"): item
        for item in enrichment.get("memory_events", [])
        if isinstance(item, dict) and item.get("id")
    }
    for event in analysis.get("project_memory", []):
        patch = memory_updates.get(event.get("id"))
        if not patch:
            continue
        summary = _clean_text(patch.get("summary"))
        why = _clean_text(patch.get("why_it_matters"))
        if summary:
            event["summary"] = summary
        if why:
            event["why_it_matters"] = why

    component_updates = {
        item.get("id"): item
        for item in enrichment.get("component_notes", [])
        if isinstance(item, dict) and item.get("id")
    }
    for component in architecture.get("components", []):
        patch = component_updates.get(component.get("id"))
        if not patch:
            continue
        purpose = _clean_text(patch.get("purpose"))
        if purpose:
            component["purpose"] = purpose

    return analysis


def _normalize_qa_response(payload: Any) -> dict | None:
    if not isinstance(payload, dict):
        return None

    answer = _clean_text(payload.get("answer"))
    if not answer:
        return None

    evidence = [
        _clean_text(item)
        for item in payload.get("evidence", [])
        if _clean_text(item)
    ]
    related_files = [
        _clean_text(item)
        for item in payload.get("related_files", [])
        if _clean_text(item)
    ]

    try:
        confidence = float(payload.get("confidence", 0.75))
    except (TypeError, ValueError):
        confidence = 0.75
    confidence = max(0.0, min(1.0, confidence))

    return {
        "answer": answer,
        "evidence": evidence[:6],
        "related_files": related_files[:8],
        "confidence": confidence,
    }


def _compact_analysis_evidence(analysis: dict) -> dict:
    repository = analysis.get("repository", {})
    overview = analysis.get("overview", {})
    architecture = analysis.get("architecture", {})
    continuity = analysis.get("continuity_plan", {})

    return {
        "repository": {
            "name": repository.get("name"),
            "owner": repository.get("owner"),
            "description": repository.get("description"),
            "default_branch": repository.get("default_branch"),
        },
        "overview": {
            "health_score": overview.get("health_score"),
            "architecture_pattern": overview.get("architecture_pattern"),
            "primary_stack": overview.get("primary_stack", [])[:8],
            "top_priorities": overview.get("top_priorities", [])[:4],
            "metrics": {
                "files_analyzed": overview.get("files_analyzed"),
                "components_identified": overview.get("components_identified"),
                "risks_found": overview.get("risks_found"),
                "memory_events": overview.get("memory_events"),
            },
        },
        "architecture": {
            "pattern": architecture.get("pattern"),
            "entry_points": architecture.get("entry_points", [])[:8],
            "technologies": architecture.get("technologies", architecture.get("technology_stack", []))[:10],
            "components": [
                {
                    "id": component.get("id"),
                    "name": component.get("name"),
                    "purpose": component.get("purpose"),
                    "related_files": component.get("related_files", [])[:6],
                    "dependencies": component.get("dependencies", [])[:4],
                }
                for component in architecture.get("components", [])[:8]
            ],
        },
        "risks": [
            {
                "title": risk.get("title"),
                "severity": risk.get("severity"),
                "description": risk.get("description"),
                "affected_files": risk.get("affected_files", [])[:5],
                "recommended_action": risk.get("recommended_action"),
            }
            for risk in analysis.get("risks", [])[:8]
        ],
        "project_memory": [
            {
                "id": event.get("id"),
                "title": event.get("title"),
                "date": event.get("date"),
                "summary": event.get("summary"),
                "why_it_matters": event.get("why_it_matters"),
                "evidence": event.get("evidence", [])[:3],
            }
            for event in analysis.get("project_memory", [])[:6]
        ],
        "continuity_plan": {
            "first_24_hours": continuity.get("first_24_hours", [])[:3],
            "first_week": continuity.get("first_week", [])[:3],
            "next_priorities": continuity.get("next_priorities", [])[:3],
        },
    }


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()

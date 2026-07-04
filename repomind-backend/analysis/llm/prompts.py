JSON_ONLY_INSTRUCTION = (
    "Return only valid JSON. Do not include markdown code fences, commentary, "
    "or any text before or after the JSON value."
)

ANTI_HALLUCINATION_RULES = (
    "Use only the provided evidence. If evidence is insufficient, say so in the "
    "required JSON structure instead of guessing."
)


def build_json_prompt(task: str, evidence: str, output_schema: str) -> str:
    return f"""
Role:
You are RepoMind's project intelligence engine.

Task:
{task}

Available evidence:
{evidence}

Limitations:
{ANTI_HALLUCINATION_RULES}

Required JSON output:
{output_schema}

{JSON_ONLY_INSTRUCTION}
""".strip()

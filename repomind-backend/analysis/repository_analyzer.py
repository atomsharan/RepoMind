import base64
import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import PurePosixPath
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings

from .llm.investigator import answer_with_llm, enrich_analysis_with_llm


MAX_TREE_FILES = 450
MAX_SOURCE_FILES = 70
MAX_FILE_BYTES = 80_000

TEXT_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".cs",
    ".html",
    ".css",
    ".scss",
    ".json",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".env",
    ".md",
    ".txt",
    ".sql",
    ".sh",
    ".ps1",
}

TECH_BY_FILE = {
    "requirements.txt": "Python",
    "pyproject.toml": "Python",
    "manage.py": "Django",
    "package.json": "Node.js",
    "vite.config.ts": "Vite",
    "vite.config.js": "Vite",
    "next.config.js": "Next.js",
    "next.config.ts": "Next.js",
    "dockerfile": "Docker",
    "docker-compose.yml": "Docker Compose",
    "docker-compose.yaml": "Docker Compose",
    "pom.xml": "Java",
    "build.gradle": "Gradle",
    "go.mod": "Go",
    "cargo.toml": "Rust",
}

TECH_BY_EXT = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "React",
    ".ts": "TypeScript",
    ".tsx": "React",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".cs": ".NET",
    ".sql": "SQL",
}


class RepositoryAnalysisError(Exception):
    pass


@dataclass
class RepositoryFile:
    path: str
    size: int = 0
    content: str = ""


class GitHubClient:
    def __init__(self, token: str = "", timeout_seconds: int = 20):
        self.token = token
        self.timeout_seconds = timeout_seconds

    def get_json(self, url: str) -> Any:
        return json.loads(self.get_text(url))

    def get_text(self, url: str) -> str:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "RepoMind",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        request = Request(url, headers=headers)
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return response.read().decode(charset, errors="replace")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            raise RepositoryAnalysisError(f"GitHub returned {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RepositoryAnalysisError(f"Could not reach GitHub: {exc.reason}") from exc


def build_repository_analysis(analysis, client: GitHubClient | None = None) -> dict:
    client = client or GitHubClient(token=getattr(settings, "GITHUB_TOKEN", ""))
    owner = analysis.repository_owner
    repo = analysis.repository_name

    repo_meta = client.get_json(f"https://api.github.com/repos/{quote(owner)}/{quote(repo)}")
    default_branch = repo_meta.get("default_branch") or "main"
    tree = _fetch_tree(client, owner, repo, default_branch)
    files = _select_files(tree)
    source_files = _fetch_file_contents(client, owner, repo, default_branch, files)
    commits = _fetch_commits(client, owner, repo)

    technologies = _detect_technologies(files, source_files)
    components = _detect_components(files, source_files)
    risks = _detect_risks(files, source_files)
    memory = _build_memory(commits, files)
    continuity = _build_continuity(risks, components, files)
    health_score = _calculate_health_score(risks, files, source_files)
    pattern = _detect_architecture_pattern(files, components)

    result = {
        "analysis_id": str(analysis.id),
        "repository": {
            "name": repo,
            "owner": owner,
            "url": analysis.repository_url,
            "description": repo_meta.get("description") or "",
            "default_branch": default_branch,
            "stars": repo_meta.get("stargazers_count", 0),
            "forks": repo_meta.get("forks_count", 0),
            "open_issues": repo_meta.get("open_issues_count", 0),
        },
        "overview": {
            "summary": _build_summary(repo, repo_meta, pattern, technologies, components, risks),
            "health_score": health_score,
            "architecture_pattern": pattern,
            "primary_stack": technologies[:6],
            "critical_risks": len([risk for risk in risks if risk["severity"] in {"CRITICAL", "HIGH"}]),
            "memory_events": len(memory),
            "files_analyzed": len(files),
            "technologies_detected": len(technologies),
            "components_identified": len(components),
            "risks_found": len(risks),
            "top_priorities": _top_priorities(risks, components, files),
        },
        "architecture": {
            "pattern": pattern,
            "summary": _architecture_summary(pattern, components, technologies),
            "entry_points": _entry_points(files),
            "technologies": technologies,
            "technology_stack": technologies,
            "components": components,
        },
        "risks": risks,
        "project_memory": memory,
        "continuity_plan": continuity,
    }

    return enrich_analysis_with_llm(result)


def answer_question(question: str, final_analysis: dict) -> dict:
    llm_answer = answer_with_llm(question, final_analysis)
    if llm_answer:
        return llm_answer

    return _rule_based_answer(question, final_analysis)


def _rule_based_answer(question: str, final_analysis: dict) -> dict:
    q = question.lower()
    repo = final_analysis.get("repository", {}).get("name", "this repository")
    architecture = final_analysis.get("architecture", {})
    risks = final_analysis.get("risks", [])
    components = architecture.get("components", [])
    memory = final_analysis.get("project_memory", [])
    continuity = final_analysis.get("continuity_plan", {})

    if any(word in q for word in ["risk", "security", "vulnerab", "danger", "problem"]):
        selected = risks[:3]
        answer = _risk_answer(repo, selected)
        evidence = _flatten_evidence(selected)
        files = _unique(file for risk in selected for file in risk.get("affected_files", []))
        return _chat(answer, evidence, files, 0.84 if selected else 0.55)

    if any(word in q for word in ["start", "onboard", "new developer", "first", "where"]):
        first_items = continuity.get("first_24_hours", [])[:2]
        entries = architecture.get("entry_points", [])[:4]
        answer = (
            f"For {repo}, start with {', '.join(entries) if entries else 'the main application entry points'} "
            f"and then work through: {_join_actions(first_items)}."
        )
        evidence = [item.get("reason", "") for item in first_items if item.get("reason")]
        files = _unique(entries + [file for item in first_items for file in item.get("related_files", [])])
        return _chat(answer, evidence, files, 0.82)

    if any(word in q for word in ["architecture", "component", "structure", "stack", "tech"]):
        selected = components[:4]
        names = ", ".join(component["name"] for component in selected) or "no large components"
        answer = (
            f"{repo} looks like a {architecture.get('pattern', 'software project')} using "
            f"{', '.join(architecture.get('technologies', [])[:6]) or 'the detected source stack'}. "
            f"Main components: {names}."
        )
        evidence = _flatten_evidence(selected)
        files = _unique(file for component in selected for file in component.get("related_files", []))
        return _chat(answer, evidence, files, 0.8)

    if any(word in q for word in ["history", "memory", "commit", "changed", "recent"]):
        selected = memory[:4]
        answer = f"Recent project memory for {repo}: {_join_titles(selected)}."
        evidence = [event.get("summary", "") for event in selected if event.get("summary")]
        files = _unique(file for event in selected for item in event.get("evidence", []) for file in item.get("files", []))
        return _chat(answer, evidence, files, 0.72 if selected else 0.45)

    overview = final_analysis.get("overview", {})
    answer = (
        f"{repo} has a health score of {overview.get('health_score', 0)}/100. "
        f"It appears to use {', '.join(overview.get('primary_stack', [])[:5]) or 'a mixed technology stack'} "
        f"with {overview.get('components_identified', 0)} components and {overview.get('risks_found', 0)} detected risks. "
        "Ask about risks, onboarding, architecture, recent history, or priorities for a more specific answer."
    )
    return _chat(answer, [overview.get("summary", "")], architecture.get("entry_points", [])[:5], 0.68)


def _fetch_tree(client: GitHubClient, owner: str, repo: str, branch: str) -> list[dict]:
    url = f"https://api.github.com/repos/{quote(owner)}/{quote(repo)}/git/trees/{quote(branch)}?recursive=1"
    data = client.get_json(url)
    if data.get("truncated"):
        raise RepositoryAnalysisError("Repository tree is too large for the GitHub API response. Try a smaller repository.")
    return [item for item in data.get("tree", []) if item.get("type") == "blob"]


def _fetch_commits(client: GitHubClient, owner: str, repo: str) -> list[dict]:
    try:
        return client.get_json(f"https://api.github.com/repos/{quote(owner)}/{quote(repo)}/commits?per_page=8")
    except RepositoryAnalysisError:
        return []


def _select_files(tree: list[dict]) -> list[RepositoryFile]:
    candidates = []
    for item in tree:
        path = item.get("path", "")
        if not path or _ignored_path(path):
            continue
        candidates.append(RepositoryFile(path=path, size=int(item.get("size") or 0)))
    candidates.sort(key=lambda file: (_file_priority(file.path), file.path))
    return candidates[:MAX_TREE_FILES]


def _fetch_file_contents(
    client: GitHubClient,
    owner: str,
    repo: str,
    branch: str,
    files: list[RepositoryFile],
) -> list[RepositoryFile]:
    source_files = []
    for file in files:
        if len(source_files) >= MAX_SOURCE_FILES:
            break
        if file.size > MAX_FILE_BYTES or not _is_text_file(file.path):
            continue
        url = (
            f"https://api.github.com/repos/{quote(owner)}/{quote(repo)}/contents/"
            f"{quote(file.path)}?ref={quote(branch)}"
        )
        try:
            payload = client.get_json(url)
        except RepositoryAnalysisError:
            continue
        encoded = payload.get("content", "")
        if payload.get("encoding") == "base64" and encoded:
            content = base64.b64decode(encoded).decode("utf-8", errors="replace")
            source_files.append(RepositoryFile(file.path, file.size, content[:MAX_FILE_BYTES]))
    return source_files


def _detect_technologies(files: list[RepositoryFile], source_files: list[RepositoryFile]) -> list[str]:
    found = []
    names = {PurePosixPath(file.path).name.lower(): file.path for file in files}
    for filename, tech in TECH_BY_FILE.items():
        if filename in names:
            found.append(tech)

    for ext, tech in TECH_BY_EXT.items():
        if any(PurePosixPath(file.path).suffix.lower() == ext for file in files):
            found.append(tech)

    package = _find_content(source_files, "package.json")
    if package:
        for package_name, tech in {
            "react": "React",
            "vue": "Vue",
            "svelte": "Svelte",
            "express": "Express",
            "axios": "Axios",
            "tailwindcss": "Tailwind CSS",
        }.items():
            if package_name in package.lower():
                found.append(tech)

    requirements = _find_content(source_files, "requirements.txt").lower()
    for package_name, tech in {"django": "Django", "djangorestframework": "Django REST Framework", "fastapi": "FastAPI", "flask": "Flask", "celery": "Celery"}.items():
        if package_name in requirements:
            found.append(tech)

    return _unique(found) or ["Source Code"]


def _detect_components(files: list[RepositoryFile], source_files: list[RepositoryFile]) -> list[dict]:
    directories = Counter()
    examples: dict[str, list[str]] = {}
    for file in files:
        parts = PurePosixPath(file.path).parts
        if len(parts) < 2:
            continue
        root = parts[0]
        if root.startswith(".") or root in {"node_modules", "dist", "build", "vendor"}:
            continue
        directories[root] += 1
        examples.setdefault(root, []).append(file.path)

    components = []
    for index, (directory, count) in enumerate(directories.most_common(8), start=1):
        related_files = examples[directory][:6]
        tech = _detect_technologies([RepositoryFile(path=file) for file in related_files], source_files)
        components.append(
            {
                "id": f"component-{index}",
                "name": _humanize_name(directory),
                "purpose": _infer_component_purpose(directory, related_files),
                "technology": tech[:4],
                "responsibilities": _infer_responsibilities(directory, related_files),
                "dependencies": _infer_dependencies(directory, files),
                "related_files": related_files,
                "evidence": [
                    {
                        "file": related_files[0],
                        "description": f"{count} files found under {directory}/.",
                    }
                ],
            }
        )
    return components


def _detect_risks(files: list[RepositoryFile], source_files: list[RepositoryFile]) -> list[dict]:
    risks = []
    test_files = [file for file in files if re.search(r"(^|/)(tests?|__tests__)/|test_|\.test\.", file.path.lower())]
    source_code_files = [file for file in files if PurePosixPath(file.path).suffix.lower() in {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".java", ".rs"}]

    secret_hits = []
    debug_hits = []
    for file in source_files:
        lower = file.content.lower()
        if re.search(r"(api[_-]?key|secret|password|token)\s*=\s*['\"][^'\"]{12,}", file.content, re.I):
            secret_hits.append(file.path)
        if "debug = true" in lower or "debug=true" in lower:
            debug_hits.append(file.path)

    if secret_hits:
        risks.append(_risk("risk-hardcoded-secrets", "Hardcoded Secret-Like Values", "CRITICAL", "Secret-like assignments appear in source files.", secret_hits, "Credentials in source code can leak through repository access or logs.", "Move secrets to environment variables and rotate any exposed values.", 0.86))
    if debug_hits:
        risks.append(_risk("risk-debug-enabled", "Debug Mode Enabled", "HIGH", "Debug mode appears to be enabled in committed configuration.", debug_hits, "Debug responses can expose internal details in deployed environments.", "Load debug flags from environment variables and default them off outside local development.", 0.78))
    if len(source_code_files) >= 8 and len(test_files) == 0:
        sample = [file.path for file in source_code_files[:4]]
        risks.append(_risk("risk-no-tests", "No Automated Tests Detected", "HIGH", "No obvious test files were found for a non-trivial codebase.", sample, "Changes may regress behavior without a fast feedback loop.", "Add focused tests around entry points, services, and risk-heavy modules.", 0.76))
    elif source_code_files and len(test_files) / max(len(source_code_files), 1) < 0.08:
        risks.append(_risk("risk-low-tests", "Limited Test Coverage Signals", "MEDIUM", "The repository has relatively few test files compared with source files.", [file.path for file in test_files[:3] or source_code_files[:3]], "Important flows may be difficult to change safely.", "Add tests for the highest-change modules and public API boundaries.", 0.65))

    manifests = [file for file in source_files if PurePosixPath(file.path).name.lower() in {"requirements.txt", "package.json", "pyproject.toml"}]
    unpinned = []
    for file in manifests:
        if file.path.endswith("requirements.txt") and re.search(r"^[A-Za-z0-9_.-]+\s*$", file.content, re.M):
            unpinned.append(file.path)
    if unpinned:
        risks.append(_risk("risk-unpinned-dependencies", "Unpinned Dependencies", "MEDIUM", "Some dependency declarations are not pinned to explicit versions.", unpinned, "Fresh installs may resolve to incompatible versions over time.", "Pin runtime dependencies or use a lockfile in deployed environments.", 0.7))

    if not any(PurePosixPath(file.path).name.lower().startswith("readme") for file in files):
        risks.append(_risk("risk-missing-readme", "Missing README", "LOW", "No README file was detected at the repository surface.", [], "New contributors have less guidance for setup and architecture.", "Add a README with setup, run, test, and deployment notes.", 0.72))

    return risks[:8]


def _build_memory(commits: list[dict], files: list[RepositoryFile]) -> list[dict]:
    memory = []
    for index, commit in enumerate(commits[:5], start=1):
        data = commit.get("commit", {})
        author = data.get("author", {}) or {}
        message = (data.get("message") or "").splitlines()[0]
        date = (author.get("date") or "")[:10]
        sha = (commit.get("sha") or "")[:7]
        memory.append(
            {
                "id": f"memory-{index}",
                "title": message[:80] or f"Recent Commit {sha}",
                "date": date,
                "summary": f"Commit {sha} updated the project with: {message or 'no commit message available'}.",
                "why_it_matters": "Recent commits show the code areas and intentions that are freshest in project memory.",
                "evidence": [{"type": "commit", "reference": sha, "description": message, "files": _entry_points(files)[:3]}],
            }
        )
    return memory


def _build_continuity(risks: list[dict], components: list[dict], files: list[RepositoryFile]) -> dict:
    first = [_roadmap_from_risk(risk) for risk in risks[:2]]
    if not first:
        first = [_roadmap("Map the main entry points", "This gives a new maintainer a working mental model quickly.", "HIGH", _entry_points(files), "Faster onboarding and safer first changes.")]
    week = [_roadmap(f"Document {_humanize_name(component['name'])}", f"{component['name']} is one of the largest detected areas.", "MEDIUM", component.get("related_files", [])[:4], "Improves handoff quality for active development.") for component in components[:2]]
    next_items = [_roadmap("Add repository health checks", "Automated checks keep analysis findings from drifting.", "LOW", _entry_points(files)[:3], "More reliable future maintenance.")]
    return {"first_24_hours": first[:3], "first_week": week[:3], "next_priorities": next_items}


def _calculate_health_score(risks: list[dict], files: list[RepositoryFile], source_files: list[RepositoryFile]) -> int:
    score = 88
    penalties = {"CRITICAL": 22, "HIGH": 14, "MEDIUM": 8, "LOW": 3}
    for risk in risks:
        score -= penalties.get(risk.get("severity"), 3)
    if any(PurePosixPath(file.path).name.lower().startswith("readme") for file in files):
        score += 5
    if any("test" in file.path.lower() for file in files):
        score += 5
    if source_files:
        score += 2
    return max(10, min(100, score))


def _detect_architecture_pattern(files: list[RepositoryFile], components: list[dict]) -> str:
    paths = [file.path.lower() for file in files]
    if any("manage.py" == path for path in paths):
        return "Django Application"
    if any(path.endswith("package.json") for path in paths) and any(path.startswith("src/") for path in paths):
        return "Frontend Application"
    if any(path.endswith("docker-compose.yml") or path.endswith("docker-compose.yaml") for path in paths):
        return "Containerized Service"
    if len(components) >= 5:
        return "Modular Repository"
    return "Source Repository"


def _build_summary(repo: str, repo_meta: dict, pattern: str, technologies: list[str], components: list[dict], risks: list[dict]) -> str:
    description = repo_meta.get("description")
    intro = f"{repo} is {description}" if description else f"{repo} is a {pattern.lower()}"
    return f"{intro}. RepoMind detected {len(components)} main components, a stack led by {', '.join(technologies[:4])}, and {len(risks)} actionable risk signals from live repository evidence."


def _architecture_summary(pattern: str, components: list[dict], technologies: list[str]) -> str:
    return f"The repository reads as a {pattern.lower()} with {len(components)} significant top-level areas and technologies including {', '.join(technologies[:6])}."


def _entry_points(files: list[RepositoryFile]) -> list[str]:
    preferred_names = {"manage.py", "main.py", "app.py", "server.py", "index.js", "index.ts", "main.tsx", "main.jsx", "package.json", "pyproject.toml", "requirements.txt"}
    entries = [file.path for file in files if PurePosixPath(file.path).name.lower() in preferred_names]
    entries += [file.path for file in files if PurePosixPath(file.path).name.lower() in {"urls.py", "settings.py", "vite.config.ts", "vite.config.js"}]
    return _unique(entries)[:10]


def _top_priorities(risks: list[dict], components: list[dict], files: list[RepositoryFile]) -> list[dict]:
    priorities = [{"priority": index + 1, "action": risk["recommended_action"], "reason": risk["description"]} for index, risk in enumerate(risks[:3])]
    if not priorities:
        priorities.append({"priority": 1, "action": "Review the entry point flow", "reason": f"Start from {', '.join(_entry_points(files)[:3]) or 'the detected project roots'}."})
    if components:
        priorities.append({"priority": len(priorities) + 1, "action": f"Document {components[0]['name']}", "reason": "It is one of the largest detected repository areas."})
    return priorities[:4]


def _risk(risk_id: str, title: str, severity: str, description: str, files: list[str], impact: str, action: str, confidence: float) -> dict:
    return {
        "id": risk_id,
        "title": title,
        "severity": severity,
        "description": description,
        "affected_files": files,
        "evidence": [{"file": file, "description": description} for file in files] or [{"file": "", "description": description}],
        "potential_impact": impact,
        "recommended_action": action,
        "confidence": confidence,
    }


def _roadmap_from_risk(risk: dict) -> dict:
    return _roadmap(risk["recommended_action"], risk["description"], risk["severity"] if risk["severity"] in {"HIGH", "MEDIUM", "LOW"} else "HIGH", risk.get("affected_files", []), risk["potential_impact"])


def _roadmap(action: str, reason: str, priority: str, files: list[str], impact: str) -> dict:
    return {"action": action, "reason": reason, "priority": priority, "related_files": files, "expected_impact": impact}


def _ignored_path(path: str) -> bool:
    ignored_parts = {"node_modules", ".git", "dist", "build", ".venv", "venv", "__pycache__", ".next", "coverage"}
    return any(part in ignored_parts for part in PurePosixPath(path).parts)


def _is_text_file(path: str) -> bool:
    suffix = PurePosixPath(path).suffix.lower()
    return suffix in TEXT_EXTENSIONS or PurePosixPath(path).name.lower() in TECH_BY_FILE


def _file_priority(path: str) -> tuple[int, int]:
    name = PurePosixPath(path).name.lower()
    if name in TECH_BY_FILE or name.startswith("readme"):
        return (0, len(path))
    if name in {"settings.py", "urls.py", "app.py", "main.py", "index.ts", "index.js", "main.tsx"}:
        return (1, len(path))
    if PurePosixPath(path).suffix.lower() in {".py", ".ts", ".tsx", ".js", ".jsx"}:
        return (2, len(path))
    return (3, len(path))


def _find_content(files: list[RepositoryFile], filename: str) -> str:
    for file in files:
        if PurePosixPath(file.path).name.lower() == filename.lower():
            return file.content
    return ""


def _infer_component_purpose(directory: str, related_files: list[str]) -> str:
    lower = directory.lower()
    if lower in {"src", "app", "frontend", "client"}:
        return "Contains application source code and user-facing runtime logic."
    if lower in {"api", "server", "backend"}:
        return "Exposes backend endpoints and request handling."
    if "test" in lower:
        return "Holds automated tests and validation assets."
    if "config" in lower:
        return "Centralizes runtime configuration and framework wiring."
    if any("model" in file.lower() for file in related_files):
        return "Defines domain models and data structures."
    return "Groups related project files under a shared repository area."


def _infer_responsibilities(directory: str, related_files: list[str]) -> list[str]:
    responsibilities = ["Own related files", "Provide project functionality"]
    if any("url" in file.lower() or "route" in file.lower() for file in related_files):
        responsibilities.append("Route requests")
    if any("model" in file.lower() for file in related_files):
        responsibilities.append("Represent data")
    if any("test" in file.lower() for file in related_files):
        responsibilities.append("Verify behavior")
    if directory.lower() in {"src", "app"}:
        responsibilities.append("Render application experience")
    return _unique(responsibilities)[:4]


def _infer_dependencies(directory: str, files: list[RepositoryFile]) -> list[str]:
    deps = []
    if any(PurePosixPath(file.path).name.lower() == "package.json" for file in files):
        deps.append("Node package ecosystem")
    if any(PurePosixPath(file.path).name.lower() == "requirements.txt" for file in files):
        deps.append("Python dependencies")
    if directory.lower() not in {"config", "src"} and any(file.path.startswith("config/") for file in files):
        deps.append("Configuration")
    return deps[:3]


def _humanize_name(value: str) -> str:
    return re.sub(r"[-_]+", " ", value).strip().title()


def _unique(values: Iterable[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _flatten_evidence(items: list[dict]) -> list[str]:
    evidence = []
    for item in items:
        for ev in item.get("evidence", []):
            file = ev.get("file") or ev.get("reference") or ""
            description = ev.get("description") or ""
            evidence.append(": ".join(part for part in [file, description] if part))
    return evidence


def _join_actions(items: list[dict]) -> str:
    return "; ".join(item.get("action", "") for item in items if item.get("action")) or "review the repository overview"


def _join_titles(items: list[dict]) -> str:
    return "; ".join(item.get("title", "") for item in items if item.get("title")) or "no recent commits were available"


def _risk_answer(repo: str, risks: list[dict]) -> str:
    if not risks:
        return f"I did not detect high-confidence risks for {repo} from the files RepoMind sampled."
    return f"Top risks for {repo}: " + "; ".join(f"{risk['severity']} - {risk['title']}: {risk['recommended_action']}" for risk in risks)


def _chat(answer: str, evidence: list[str], files: list[str], confidence: float) -> dict:
    return {
        "answer": answer,
        "evidence": [item for item in evidence if item][:6],
        "related_files": files[:8],
        "confidence": confidence,
    }

import base64
from unittest.mock import patch

from django.test import TestCase

from analysis.models import Analysis
from analysis.repository_analyzer import (
    GitHubClient,
    RepositoryAnalysisError,
    answer_question,
    build_repository_analysis,
)


class MockGitHubClient:
    def __init__(self):
        self.files = {
            "manage.py": "import os\n",
            "requirements.txt": "Django==4.2\npytest\n",
            "config/settings.py": "DEBUG = True\nSECRET_KEY = 'test'\n",
            "config/urls.py": "urlpatterns = []\n",
            "README.md": "# Sample Project\n",
            "src/main.py": "print('hello')\n",
        }
        self.commits = [
            {
                "sha": "abc1234567890",
                "commit": {
                    "message": "Add initial Django scaffold",
                    "author": {"date": "2026-07-01T10:00:00Z"},
                },
            }
        ]

    def get_json(self, url: str):
        if url.endswith("/commits?per_page=8"):
            return self.commits
        if "/git/trees/" in url:
            return {
                "truncated": False,
                "tree": [
                    {"path": path, "type": "blob", "size": len(content)}
                    for path, content in self.files.items()
                ],
            }
        if "/contents/" in url:
            path = url.split("/contents/", 1)[1].split("?ref=", 1)[0]
            from urllib.parse import unquote

            path = unquote(path)
            content = self.files.get(path)
            if content is None:
                raise RepositoryAnalysisError(f"Missing mock file: {path}")
            encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")
            return {"encoding": "base64", "content": encoded}
        if "/repos/" in url:
            return {
                "default_branch": "main",
                "description": "A sample Django project",
                "stargazers_count": 12,
                "forks_count": 3,
                "open_issues_count": 1,
            }
        raise RepositoryAnalysisError(f"Unhandled mock URL: {url}")


class RepositoryAnalyzerTests(TestCase):
    def setUp(self):
        self.analysis = Analysis.objects.create(
            repository_url="https://github.com/example/sample-app",
            repository_owner="example",
            repository_name="sample-app",
        )
        self.client = MockGitHubClient()

    def test_build_repository_analysis_returns_expected_contract(self):
        result = build_repository_analysis(self.analysis, client=self.client)

        self.assertEqual(result["analysis_id"], str(self.analysis.id))
        self.assertEqual(result["repository"]["name"], "sample-app")
        self.assertIn("overview", result)
        self.assertIn("architecture", result)
        self.assertTrue(result["overview"]["health_score"] >= 10)
        self.assertGreaterEqual(len(result["architecture"]["components"]), 1)
        self.assertGreaterEqual(len(result["project_memory"]), 1)
        self.assertIn("continuity_plan", result)

    def test_detects_debug_mode_risk(self):
        result = build_repository_analysis(self.analysis, client=self.client)
        titles = [risk["title"] for risk in result["risks"]]
        self.assertIn("Debug Mode Enabled", titles)

    def test_detects_missing_tests_for_non_trivial_codebase(self):
        self.client.files["app/views.py"] = "def index():\n    return None\n"
        self.client.files["app/models.py"] = "class Item:\n    pass\n"
        self.client.files["app/services.py"] = "def run():\n    pass\n"
        self.client.files["app/utils.py"] = "def helper():\n    pass\n"
        self.client.files["app/forms.py"] = "class Form:\n    pass\n"
        self.client.files["app/admin.py"] = "from django.contrib import admin\n"
        self.client.files["app/tasks.py"] = "def task():\n    pass\n"
        self.client.files["app/api.py"] = "def api():\n    pass\n"
        self.client.files["app/core.py"] = "def core():\n    pass\n"

        result = build_repository_analysis(self.analysis, client=self.client)
        titles = [risk["title"] for risk in result["risks"]]
        self.assertIn("No Automated Tests Detected", titles)

    def test_truncated_tree_raises_clear_error(self):
        class TruncatedClient(MockGitHubClient):
            def get_json(self, url: str):
                if "/git/trees/" in url:
                    return {"truncated": True, "tree": []}
                return super().get_json(url)

        with self.assertRaisesRegex(RepositoryAnalysisError, "too large"):
            build_repository_analysis(self.analysis, client=TruncatedClient())

    def test_answer_question_routes_by_topic(self):
        final_analysis = build_repository_analysis(self.analysis, client=self.client)

        risk_answer = answer_question("What are the security risks?", final_analysis)
        self.assertIn("answer", risk_answer)
        self.assertGreater(risk_answer["confidence"], 0)

        onboard_answer = answer_question("Where should a new developer start?", final_analysis)
        self.assertIn("start", onboard_answer["answer"].lower())

    @patch("analysis.repository_analyzer.urlopen")
    def test_github_client_surfaces_http_errors(self, mock_urlopen):
        from urllib.error import HTTPError
        from io import BytesIO

        mock_urlopen.side_effect = HTTPError(
            url="https://api.github.com/repos/missing/repo",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=BytesIO(b'{"message":"Not Found"}'),
        )

        client = GitHubClient(token="")
        with self.assertRaisesRegex(RepositoryAnalysisError, "GitHub returned 404"):
            client.get_json("https://api.github.com/repos/missing/repo")

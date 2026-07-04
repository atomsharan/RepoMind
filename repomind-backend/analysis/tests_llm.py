from unittest.mock import patch
from urllib.error import URLError

from django.test import SimpleTestCase, override_settings

from analysis.llm.base import (
    BaseLLMProvider,
    LLMConfigurationError,
    LLMJSONError,
    LLMProviderError,
    parse_llm_json,
)
from analysis.llm.client import LLMClient
from analysis.llm.ollama_provider import OllamaProvider


class StaticProvider(BaseLLMProvider):
    provider_name = "static"

    def __init__(self, responses, *, max_json_retries=1):
        super().__init__(max_json_retries=max_json_retries)
        self.responses = list(responses)
        self.prompts = []

    def generate(self, prompt, **kwargs):
        self.prompts.append(prompt)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class FakeGeminiProvider(StaticProvider):
    provider_name = "gemini"

    def __init__(self, *args, **kwargs):
        super().__init__(["gemini text"])


class FakeOllamaProvider(StaticProvider):
    provider_name = "ollama"

    def __init__(self, *args, **kwargs):
        super().__init__(["ollama text"])


class FailingGeminiProvider(StaticProvider):
    provider_name = "gemini"

    def __init__(self, *args, **kwargs):
        super().__init__([LLMProviderError("primary failed")])


class LLMJSONTests(SimpleTestCase):
    def test_parse_json_removes_markdown_fence(self):
        self.assertEqual(parse_llm_json('```json\n{"ok": true}\n```'), {"ok": True})

    def test_parse_json_extracts_json_from_surrounding_text(self):
        self.assertEqual(parse_llm_json('Result:\n{"answer": 42}\nDone.'), {"answer": 42})

    def test_parse_json_rejects_empty_response(self):
        with self.assertRaises(LLMJSONError):
            parse_llm_json(" ")

    def test_generate_json_retries_malformed_response(self):
        provider = StaticProvider(["not json", '{"ok": true}'], max_json_retries=1)

        self.assertEqual(provider.generate_json("Return JSON"), {"ok": True})
        self.assertEqual(len(provider.prompts), 2)
        self.assertIn("previous response was not valid JSON", provider.prompts[1])

    def test_generate_json_raises_after_retry_limit(self):
        provider = StaticProvider(["not json", "still not json"], max_json_retries=1)

        with self.assertRaises(LLMJSONError):
            provider.generate_json("Return JSON")


class LLMClientTests(SimpleTestCase):
    @override_settings(
        LLM_PROVIDER="gemini",
        LLM_FALLBACK_PROVIDER="",
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="test-model",
        OLLAMA_BASE_URL="http://localhost:11434",
        OLLAMA_MODEL="llama3.1",
        LLM_TIMEOUT_SECONDS=1,
        LLM_JSON_RETRIES=1,
    )
    def test_provider_switching_selects_gemini(self):
        with patch("analysis.llm.client.GeminiProvider", FakeGeminiProvider):
            client = LLMClient()

        self.assertEqual(client.provider_name, "gemini")
        self.assertEqual(client.generate("hello"), "gemini text")

    @override_settings(
        LLM_PROVIDER="ollama",
        LLM_FALLBACK_PROVIDER="",
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="test-model",
        OLLAMA_BASE_URL="http://localhost:11434",
        OLLAMA_MODEL="llama3.1",
        LLM_TIMEOUT_SECONDS=1,
        LLM_JSON_RETRIES=1,
    )
    def test_provider_switching_selects_ollama(self):
        with patch("analysis.llm.client.OllamaProvider", FakeOllamaProvider):
            client = LLMClient()

        self.assertEqual(client.provider_name, "ollama")
        self.assertEqual(client.generate("hello"), "ollama text")

    @override_settings(
        LLM_PROVIDER="gemini",
        LLM_FALLBACK_PROVIDER="ollama",
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="test-model",
        OLLAMA_BASE_URL="http://localhost:11434",
        OLLAMA_MODEL="llama3.1",
        LLM_TIMEOUT_SECONDS=1,
        LLM_JSON_RETRIES=1,
    )
    def test_fallback_provider_is_used_after_primary_failure(self):
        with patch("analysis.llm.client.GeminiProvider", FailingGeminiProvider), patch(
            "analysis.llm.client.OllamaProvider", FakeOllamaProvider
        ):
            client = LLMClient()

        self.assertEqual(client.generate("hello"), "ollama text")

    @override_settings(LLM_PROVIDER="unknown", LLM_FALLBACK_PROVIDER="")
    def test_unknown_provider_raises_configuration_error(self):
        with self.assertRaises(LLMConfigurationError):
            LLMClient()


class OllamaProviderTests(SimpleTestCase):
    def test_unavailable_ollama_raises_clear_provider_error(self):
        provider = OllamaProvider(base_url="http://localhost:11434", model="missing", timeout_seconds=1)

        with patch("analysis.llm.ollama_provider.urlopen", side_effect=URLError("refused")):
            with self.assertRaisesRegex(LLMProviderError, "Ollama is unavailable"):
                provider.generate("hello")

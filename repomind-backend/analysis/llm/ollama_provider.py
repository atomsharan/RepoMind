import json
import logging
import socket
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from .base import BaseLLMProvider, LLMConfigurationError, LLMProviderError

logger = logging.getLogger(__name__)


class OllamaProvider(BaseLLMProvider):
    provider_name = "ollama"

    def __init__(
        self,
        *,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.1",
        timeout_seconds: int = 60,
        max_json_retries: int = 1,
    ):
        super().__init__(max_json_retries=max_json_retries)
        if not base_url:
            raise LLMConfigurationError("OLLAMA_BASE_URL is required when LLM_PROVIDER=ollama.")
        if not model:
            raise LLMConfigurationError("OLLAMA_MODEL is required when LLM_PROVIDER=ollama.")

        self.base_url = base_url.rstrip("/") + "/"
        self.model = model
        self.timeout_seconds = timeout_seconds

    def generate(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_output_tokens: Optional[int] = None,
    ) -> str:
        if not prompt or not prompt.strip():
            raise LLMProviderError("Prompt cannot be empty.")

        logger.info("Ollama generation started with model %s", self.model)
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        options: Dict[str, Any] = {}
        if system_prompt:
            payload["system"] = system_prompt
        if temperature is not None:
            options["temperature"] = temperature
        if max_output_tokens is not None:
            options["num_predict"] = max_output_tokens
        if options:
            payload["options"] = options

        data = self._post_json("api/generate", payload)
        response_text = data.get("response", "")
        if not isinstance(response_text, str) or not response_text.strip():
            raise LLMProviderError("Ollama returned an empty response.")

        logger.info("Ollama generation completed with model %s", self.model)
        return response_text.strip()

    def _post_json(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        request = Request(
            urljoin(self.base_url, path),
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                response_body = response.read().decode("utf-8")
        except HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            message = _extract_ollama_error(response_body) or exc.reason
            raise LLMProviderError(f"Ollama request failed with HTTP {exc.code}: {message}") from exc
        except (URLError, ConnectionError, socket.timeout, TimeoutError) as exc:
            raise LLMProviderError(
                f"Ollama is unavailable at {self.base_url}. Confirm Ollama is running and reachable."
            ) from exc

        try:
            data = json.loads(response_body)
        except json.JSONDecodeError as exc:
            raise LLMProviderError("Ollama returned malformed JSON from its HTTP API.") from exc

        if data.get("error"):
            raise LLMProviderError(f"Ollama error: {data['error']}")
        return data


def _extract_ollama_error(response_body: str) -> str:
    try:
        data = json.loads(response_body)
    except json.JSONDecodeError:
        return response_body[:200]
    return data.get("error", "")

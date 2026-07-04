import logging
from typing import Any, Dict, List, Optional

from .base import BaseLLMProvider, LLMConfigurationError, LLMProviderError

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    provider_name = "gemini"

    def __init__(
        self,
        *,
        api_key: str,
        model: str = "gemini-1.5-flash",
        timeout_seconds: int = 60,
        max_json_retries: int = 1,
    ):
        super().__init__(max_json_retries=max_json_retries)
        if not api_key:
            raise LLMConfigurationError("GEMINI_API_KEY is required when LLM_PROVIDER=gemini.")
        if not model:
            raise LLMConfigurationError("GEMINI_MODEL is required when LLM_PROVIDER=gemini.")

        self.api_key = api_key
        self.model_name = model
        self.timeout_seconds = timeout_seconds
        self._model = None

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

        logger.info("Gemini generation started with model %s", self.model_name)
        model = self._get_model(system_prompt=system_prompt)
        generation_config = _clean_config(
            {
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
            }
        )

        try:
            response = model.generate_content(
                prompt,
                generation_config=generation_config or None,
                request_options={"timeout": self.timeout_seconds},
            )
        except Exception as exc:
            raise LLMProviderError(f"Gemini request failed: {exc}") from exc

        text = _extract_gemini_text(response)
        if not text.strip():
            raise LLMProviderError("Gemini returned an empty response.")

        logger.info("Gemini generation completed with model %s", self.model_name)
        return text.strip()

    def _get_model(self, *, system_prompt: Optional[str]):
        if self._model is not None and system_prompt is None:
            return self._model

        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise LLMConfigurationError(
                "google-generativeai is not installed. Run: pip install -r requirements.txt"
            ) from exc

        genai.configure(api_key=self.api_key)
        model_kwargs: Dict[str, Any] = {}
        if system_prompt:
            model_kwargs["system_instruction"] = system_prompt
        model = genai.GenerativeModel(self.model_name, **model_kwargs)
        if system_prompt is None:
            self._model = model
        return model


def _clean_config(config: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in config.items() if value is not None}


def _extract_gemini_text(response) -> str:
    text = getattr(response, "text", None)
    if text:
        return text

    candidates = getattr(response, "candidates", None) or []
    parts: List[str] = []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if part_text:
                parts.append(part_text)

    return "\n".join(parts)

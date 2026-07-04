import logging
import os
from typing import Any, Optional

from django.conf import settings

from .base import BaseLLMProvider, LLMConfigurationError, LLMError
from .gemini_provider import GeminiProvider
from .ollama_provider import OllamaProvider

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self, provider_name: Optional[str] = None, fallback_provider_name: Optional[str] = None):
        self.provider_name = (provider_name or _setting("LLM_PROVIDER", "gemini")).lower()
        self.fallback_provider_name = (
            fallback_provider_name
            if fallback_provider_name is not None
            else _setting("LLM_FALLBACK_PROVIDER", "")
        )
        self.fallback_provider_name = self.fallback_provider_name.lower() if self.fallback_provider_name else ""

        self.provider = self._build_provider(self.provider_name)
        self.fallback_provider = (
            self._build_provider(self.fallback_provider_name) if self.fallback_provider_name else None
        )

        logger.info("LLM provider selected: %s", self.provider_name)
        if self.fallback_provider_name:
            logger.info("LLM fallback provider configured: %s", self.fallback_provider_name)

    def generate(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_output_tokens: Optional[int] = None,
    ) -> str:
        return self._call_with_optional_fallback(
            "generate",
            prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

    def generate_json(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_output_tokens: Optional[int] = None,
    ) -> Any:
        return self._call_with_optional_fallback(
            "generate_json",
            prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

    def _call_with_optional_fallback(self, method_name: str, *args, **kwargs):
        method = getattr(self.provider, method_name)
        logger.info("LLM %s call started using %s", method_name, self.provider_name)
        try:
            result = method(*args, **kwargs)
            logger.info("LLM %s call completed using %s", method_name, self.provider_name)
            return result
        except LLMError as exc:
            logger.exception("LLM primary provider failed: %s", self.provider_name)
            if not self.fallback_provider:
                raise

            fallback_method = getattr(self.fallback_provider, method_name)
            logger.warning(
                "Attempting LLM fallback provider %s after %s failure: %s",
                self.fallback_provider_name,
                self.provider_name,
                exc,
            )
            result = fallback_method(*args, **kwargs)
            logger.warning("LLM fallback provider used: %s", self.fallback_provider_name)
            return result

    def _build_provider(self, provider_name: str) -> BaseLLMProvider:
        if provider_name == "gemini":
            return GeminiProvider(
                api_key=_setting("GEMINI_API_KEY", ""),
                model=_setting("GEMINI_MODEL", "gemini-1.5-flash"),
                timeout_seconds=_setting("LLM_TIMEOUT_SECONDS", 60, cast=int),
                max_json_retries=_setting("LLM_JSON_RETRIES", 1, cast=int),
            )
        if provider_name == "ollama":
            return OllamaProvider(
                base_url=_setting("OLLAMA_BASE_URL", "http://localhost:11434"),
                model=_setting("OLLAMA_MODEL", "llama3.1"),
                timeout_seconds=_setting("LLM_TIMEOUT_SECONDS", 60, cast=int),
                max_json_retries=_setting("LLM_JSON_RETRIES", 1, cast=int),
            )
        raise LLMConfigurationError(
            f"Unsupported LLM_PROVIDER '{provider_name}'. Expected 'gemini' or 'ollama'."
        )


def _setting(name: str, default=None, cast=None):
    if settings.configured and hasattr(settings, name):
        value = getattr(settings, name)
    else:
        value = os.getenv(name, default)

    if cast is not None and value is not None:
        try:
            return cast(value)
        except (TypeError, ValueError) as exc:
            raise LLMConfigurationError(f"{name} must be a valid {cast.__name__}.") from exc
    return value

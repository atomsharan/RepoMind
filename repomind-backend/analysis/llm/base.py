import json
import logging
import re
from abc import ABC, abstractmethod
from json import JSONDecodeError
from typing import Any, Optional

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Base exception for LLM provider failures."""


class LLMConfigurationError(LLMError):
    """Raised when provider configuration is missing or invalid."""


class LLMProviderError(LLMError):
    """Raised when a provider call fails."""


class LLMJSONError(LLMError):
    """Raised when an LLM response cannot be parsed as JSON."""


class BaseLLMProvider(ABC):
    provider_name = "base"

    def __init__(self, *, max_json_retries: int = 1):
        self.max_json_retries = max_json_retries

    @abstractmethod
    def generate(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_output_tokens: Optional[int] = None,
    ) -> str:
        """Return normalized model text for a prompt."""

    def generate_json(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_output_tokens: Optional[int] = None,
    ) -> Any:
        last_error: Optional[Exception] = None
        json_prompt = prompt

        for attempt in range(self.max_json_retries + 1):
            response = self.generate(
                json_prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
            try:
                return parse_llm_json(response)
            except LLMJSONError as exc:
                last_error = exc
                logger.warning(
                    "%s returned malformed JSON on attempt %s/%s: %s",
                    self.provider_name,
                    attempt + 1,
                    self.max_json_retries + 1,
                    exc,
                )
                json_prompt = (
                    f"{prompt}\n\n"
                    "Your previous response was not valid JSON. Return only valid JSON. "
                    "Do not include markdown fences, commentary, or trailing text."
                )

        raise LLMJSONError(
            f"{self.provider_name} did not return valid JSON after "
            f"{self.max_json_retries + 1} attempt(s): {last_error}"
        )


def parse_llm_json(raw_response: str) -> Any:
    if raw_response is None or not str(raw_response).strip():
        raise LLMJSONError("LLM response was empty.")

    cleaned = strip_markdown_code_fences(str(raw_response).strip())
    try:
        return json.loads(cleaned)
    except JSONDecodeError:
        extracted = extract_first_json_value(cleaned)
        if extracted is None:
            raise LLMJSONError("No JSON object or array found in LLM response.")
        try:
            return json.loads(extracted)
        except JSONDecodeError as exc:
            raise LLMJSONError(f"Malformed JSON returned by LLM: {exc}") from exc


def strip_markdown_code_fences(text: str) -> str:
    fenced_match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", text, flags=re.DOTALL | re.IGNORECASE)
    if fenced_match:
        return fenced_match.group(1).strip()
    return text


def extract_first_json_value(text: str) -> Optional[str]:
    decoder = json.JSONDecoder()
    for index, char in enumerate(text):
        if char not in "[{":
            continue
        try:
            _, end = decoder.raw_decode(text[index:])
        except JSONDecodeError:
            continue
        return text[index : index + end]
    return None

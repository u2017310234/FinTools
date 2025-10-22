"""
LLM Translator Module

Unified interface for multiple LLM providers (OpenAI, Anthropic, Google Gemini).
Handles API calls, rate limiting, and error recovery.
"""

from typing import Optional, Dict, List, Any
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
import time
import os
from loguru import logger

# Import LLM libraries
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not available")

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic library not available")

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Google Generative AI library not available")

class LLMProviderType(Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"

@dataclass
class LLMConfig:
    """Configuration for LLM provider."""
    provider: LLMProviderType
    model: str
    api_key: Optional[str] = None
    temperature: float = 0.1
    max_tokens: int = 4096
    timeout: int = 60
    max_retries: int = 3
    retry_delay: int = 2

@dataclass
class LLMResponse:
    """Response from LLM."""
    text: str
    tokens_used: int
    finish_reason: str
    model: str
    provider: str

class LLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    def __init__(self, config: LLMConfig):
        """Initialize provider with configuration."""
        self.config = config
        
    @abstractmethod
    def translate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        """
        Translate using the LLM.
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            
        Returns:
            LLMResponse object
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available."""
        pass

class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider."""
    
    def __init__(self, config: LLMConfig):
        """Initialize OpenAI provider."""
        super().__init__(config)
        
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI library not installed. Run: pip install openai")
        
        # Set API key
        api_key = config.api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not provided")
        
        self.client = openai.OpenAI(api_key=api_key)
        
    def translate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        """Translate using OpenAI GPT."""
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        for attempt in range(self.config.max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens,
                    timeout=self.config.timeout
                )
                
                return LLMResponse(
                    text=response.choices[0].message.content,
                    tokens_used=response.usage.total_tokens,
                    finish_reason=response.choices[0].finish_reason,
                    model=response.model,
                    provider="openai"
                )
                
            except Exception as e:
                logger.warning(f"OpenAI API error (attempt {attempt + 1}): {e}")
                if attempt < self.config.max_retries - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
                else:
                    raise
    
    def is_available(self) -> bool:
        """Check if OpenAI is available."""
        return OPENAI_AVAILABLE and (self.config.api_key or os.getenv("OPENAI_API_KEY"))

class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider."""
    
    def __init__(self, config: LLMConfig):
        """Initialize Anthropic provider."""
        super().__init__(config)
        
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("Anthropic library not installed. Run: pip install anthropic")
        
        # Set API key
        api_key = config.api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key not provided")
        
        self.client = anthropic.Anthropic(api_key=api_key)
        
    def translate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        """Translate using Anthropic Claude."""
        for attempt in range(self.config.max_retries):
            try:
                response = self.client.messages.create(
                    model=self.config.model,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    system=system_prompt or "",
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    timeout=self.config.timeout
                )
                
                return LLMResponse(
                    text=response.content[0].text,
                    tokens_used=response.usage.input_tokens + response.usage.output_tokens,
                    finish_reason=response.stop_reason,
                    model=response.model,
                    provider="anthropic"
                )
                
            except Exception as e:
                logger.warning(f"Anthropic API error (attempt {attempt + 1}): {e}")
                if attempt < self.config.max_retries - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
                else:
                    raise
    
    def is_available(self) -> bool:
        """Check if Anthropic is available."""
        return ANTHROPIC_AVAILABLE and (self.config.api_key or os.getenv("ANTHROPIC_API_KEY"))

class GeminiProvider(LLMProvider):
    """Google Gemini provider."""
    
    def __init__(self, config: LLMConfig):
        """Initialize Gemini provider."""
        super().__init__(config)
        
        if not GEMINI_AVAILABLE:
            raise ImportError("Google Generative AI library not installed. Run: pip install google-generativeai")
        
        # Set API key
        api_key = config.api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Google/Gemini API key not provided")
        
        genai.configure(api_key=api_key)
        
        # Configure generation settings
        self.generation_config = {
            "temperature": self.config.temperature,
            "max_output_tokens": self.config.max_tokens,
        }
        
        # Initialize model
        self.model = genai.GenerativeModel(
            model_name=self.config.model,
            generation_config=self.generation_config
        )
        
    def translate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        """Translate using Google Gemini."""
        # Combine system prompt with user prompt if provided
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        for attempt in range(self.config.max_retries):
            try:
                response = self.model.generate_content(
                    full_prompt,
                    request_options={"timeout": self.config.timeout}
                )
                
                # Extract token usage
                tokens_used = 0
                if hasattr(response, 'usage_metadata'):
                    tokens_used = (
                        response.usage_metadata.prompt_token_count +
                        response.usage_metadata.candidates_token_count
                    )
                
                # Get finish reason
                finish_reason = "stop"
                if response.candidates:
                    finish_reason = str(response.candidates[0].finish_reason.name)
                
                return LLMResponse(
                    text=response.text,
                    tokens_used=tokens_used,
                    finish_reason=finish_reason,
                    model=self.config.model,
                    provider="gemini"
                )
                
            except Exception as e:
                logger.warning(f"Gemini API error (attempt {attempt + 1}): {e}")
                if attempt < self.config.max_retries - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
                else:
                    raise
    
    def is_available(self) -> bool:
        """Check if Gemini is available."""
        return GEMINI_AVAILABLE and (
            self.config.api_key or 
            os.getenv("GOOGLE_API_KEY") or 
            os.getenv("GEMINI_API_KEY")
        )

class LLMTranslator:
    """
    High-level LLM translator with provider abstraction.
    
    Supports multiple providers: OpenAI, Anthropic, Google Gemini.
    """
    
    # Default models for each provider
    DEFAULT_MODELS = {
        LLMProviderType.OPENAI: "gpt-4o",
        LLMProviderType.ANTHROPIC: "claude-3-5-sonnet-20241022",
        LLMProviderType.GEMINI: "gemini-1.5-pro",
    }
    
    def __init__(
        self,
        provider: str = "gemini",
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        **kwargs
    ):
        """
        Initialize LLM translator.
        
        Args:
            provider: Provider name ("openai", "anthropic", or "gemini")
            model: Model name (uses default if not specified)
            api_key: API key (uses environment variable if not specified)
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens in response
            **kwargs: Additional configuration options
        """
        # Parse provider type
        try:
            provider_type = LLMProviderType(provider.lower())
        except ValueError:
            raise ValueError(f"Unsupported provider: {provider}. Use 'openai', 'anthropic', or 'gemini'")
        
        # Use default model if not specified
        if not model:
            model = self.DEFAULT_MODELS[provider_type]
        
        # Create configuration
        self.config = LLMConfig(
            provider=provider_type,
            model=model,
            api_key=api_key,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
        
        # Initialize provider
        self.provider = self._create_provider()
        
        logger.info(f"Initialized LLM translator: {provider_type.value} / {model}")
        
    def _create_provider(self) -> LLMProvider:
        """Create the appropriate provider instance."""
        if self.config.provider == LLMProviderType.OPENAI:
            return OpenAIProvider(self.config)
        elif self.config.provider == LLMProviderType.ANTHROPIC:
            return AnthropicProvider(self.config)
        elif self.config.provider == LLMProviderType.GEMINI:
            return GeminiProvider(self.config)
        else:
            raise ValueError(f"Unsupported provider: {self.config.provider}")
    
    def translate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Translate Excel logic to Python using LLM.
        
        Args:
            prompt: Translation prompt
            system_prompt: Optional system prompt
            context: Optional context dictionary
            
        Returns:
            Translated Python code as string
        """
        # Add context to prompt if provided
        if context:
            context_str = "\n".join([f"{k}: {v}" for k, v in context.items()])
            prompt = f"Context:\n{context_str}\n\n{prompt}"
        
        # Call provider
        response = self.provider.translate(prompt, system_prompt)
        
        logger.info(f"Translation completed. Tokens used: {response.tokens_used}")
        
        return response.text
    
    def is_available(self) -> bool:
        """Check if the configured provider is available."""
        return self.provider.is_available()
    
    @staticmethod
    def list_available_providers() -> List[str]:
        """List all available providers based on installed libraries."""
        available = []
        
        if OPENAI_AVAILABLE:
            available.append("openai")
        if ANTHROPIC_AVAILABLE:
            available.append("anthropic")
        if GEMINI_AVAILABLE:
            available.append("gemini")
        
        return available

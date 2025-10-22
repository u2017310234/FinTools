# Using Google Gemini with FinMod-Copilot

FinMod-Copilot supports **Google Gemini** as the default LLM provider for translating Excel formulas and VBA code to Python.

## Why Gemini?

- **Cost-Effective**: Significantly cheaper than GPT-4o or Claude
- **High Context Window**: Gemini 1.5 Pro supports up to 2M tokens
- **Strong Code Generation**: Excellent at translating financial formulas
- **Fast**: Gemini 1.5 Flash provides quick responses for simple tasks
- **Free Tier**: Generous free quota for development

## Setup

### 1. Install Dependencies

```bash
pip install google-generativeai
```

### 2. Get API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key

### 3. Set Environment Variable

**Linux/Mac:**
```bash
export GOOGLE_API_KEY='your-api-key-here'
# or
export GEMINI_API_KEY='your-api-key-here'
```

**Windows (Command Prompt):**
```cmd
set GOOGLE_API_KEY=your-api-key-here
```

**Windows (PowerShell):**
```powershell
$env:GOOGLE_API_KEY='your-api-key-here'
```

**In Python:**
```python
import os
os.environ['GOOGLE_API_KEY'] = 'your-api-key-here'
```

## Usage

### Basic Usage

```python
from finmod_copilot.translation.llm_translator import LLMTranslator

# Initialize with Gemini (default)
translator = LLMTranslator(
    provider="gemini",
    model="gemini-1.5-pro",  # or "gemini-1.5-flash"
    temperature=0.1,
    max_tokens=4096
)

# Translate Excel formula
excel_formula = "=SUMIF(A:A, '>100', B:B)"
prompt = f"Convert this Excel formula to Python: {excel_formula}"
python_code = translator.translate(prompt)

print(python_code)
```

### Model Selection

Gemini offers different models for different use cases:

#### Gemini 1.5 Pro
- **Best for**: Complex formulas, VBA translation, large models
- **Context**: 2M tokens
- **Speed**: Moderate
- **Cost**: Higher

```python
translator = LLMTranslator(
    provider="gemini",
    model="gemini-1.5-pro"
)
```

#### Gemini 1.5 Flash
- **Best for**: Simple formulas, quick translations
- **Context**: 1M tokens
- **Speed**: Very fast
- **Cost**: Much lower

```python
translator = LLMTranslator(
    provider="gemini",
    model="gemini-1.5-flash"
)
```

#### Gemini 2.0 Flash (Experimental)
- **Best for**: Latest features, fastest responses
- **Context**: Variable
- **Speed**: Fastest
- **Cost**: Competitive

```python
translator = LLMTranslator(
    provider="gemini",
    model="gemini-2.0-flash-exp"
)
```

### Complete Example

```python
from finmod_copilot.core.excel_parser import ExcelParser
from finmod_copilot.core.formula_parser import FormulaParser
from finmod_copilot.translation.llm_translator import LLMTranslator

# 1. Parse Excel file
parser = ExcelParser()
structure = parser.parse("financial_model.xlsx")

# 2. Get formulas
formulas = parser.get_formulas()

# 3. Initialize Gemini translator
translator = LLMTranslator(provider="gemini")

# 4. Translate each formula
for cell_info in formulas[:5]:  # First 5 formulas
    # Parse formula
    formula_parser = FormulaParser()
    parsed = formula_parser.parse(cell_info.formula)
    
    # Create translation prompt
    prompt = f"""Convert this Excel formula to Python:
    
Original: {cell_info.formula}
Location: {cell_info.sheet_name}!{cell_info.address}
Type: {parsed.formula_type.value}

Requirements:
- Use pandas DataFrame operations
- Add traceability comment
- Handle edge cases"""
    
    # Translate
    python_code = translator.translate(
        prompt,
        system_prompt="You are an expert at Excel to Python conversion."
    )
    
    print(f"\n{cell_info.address}: {cell_info.formula}")
    print(f"Python:\n{python_code}\n")
```

## Advanced Configuration

### Custom System Prompt

```python
system_prompt = """You are a financial modeling expert specializing in Excel to Python conversion.

Guidelines:
1. Generate vectorized pandas/numpy code
2. Preserve numerical precision
3. Add clear comments
4. Handle edge cases (division by zero, null values)
5. Use type hints
6. Follow PEP 8 style

For financial formulas (NPV, IRR, etc.), use numpy_financial when available."""

translator = LLMTranslator(provider="gemini")
result = translator.translate(prompt, system_prompt=system_prompt)
```

### Batch Translation

```python
formulas = [
    "=SUM(A1:A10)",
    "=AVERAGE(B1:B10)",
    "=IF(C1>0, D1*E1, 0)"
]

translator = LLMTranslator(provider="gemini", model="gemini-1.5-flash")

for formula in formulas:
    prompt = f"Convert to Python: {formula}"
    result = translator.translate(prompt)
    print(f"{formula} → {result}\n")
```

### Error Handling

```python
from finmod_copilot.translation.llm_translator import LLMTranslator

translator = LLMTranslator(
    provider="gemini",
    max_retries=3,     # Retry on API errors
    retry_delay=2,     # Wait 2 seconds between retries
    timeout=60         # 60 second timeout
)

try:
    result = translator.translate(prompt)
except Exception as e:
    print(f"Translation failed: {e}")
```

## API Rate Limits & Costs

### Free Tier (Gemini API)
- **Requests per minute**: 60
- **Requests per day**: 1,500
- **Tokens per minute**: 4M (Pro), 1M (Flash)

### Paid Tier
- **Gemini 1.5 Pro**: $0.00125 per 1K input tokens, $0.005 per 1K output tokens
- **Gemini 1.5 Flash**: $0.000075 per 1K input tokens, $0.0003 per 1K output tokens

### Cost Estimation

For a typical financial model with 1,000 formulas:

**Using Gemini 1.5 Flash:**
- Average input: 200 tokens per formula
- Average output: 150 tokens per formula
- Total: 1,000 * (200 * 0.000075 + 150 * 0.0003) = **$0.06**

**Using Gemini 1.5 Pro:**
- Same calculations
- Total: 1,000 * (200 * 0.00125 + 150 * 0.005) = **$1.00**

Compare to GPT-4o: **~$5-10** for the same task.

## Best Practices

### 1. Choose the Right Model
- Use **Flash** for simple formulas (SUM, AVERAGE, basic IF)
- Use **Pro** for complex nested formulas, VBA, or financial functions

### 2. Optimize Prompts
```python
# ❌ Poor prompt
prompt = "Convert =SUM(A:A) to Python"

# ✓ Better prompt
prompt = """Convert this Excel formula to Python:
Formula: =SUM(A:A)
Context: Column A contains numerical values in a DataFrame 'df'
Output: Vectorized pandas code with error handling"""
```

### 3. Batch Similar Formulas
```python
# Group similar formulas together
simple_formulas = [f for f in all_formulas if complexity < 20]
complex_formulas = [f for f in all_formulas if complexity >= 20]

# Use Flash for simple, Pro for complex
flash_translator = LLMTranslator(provider="gemini", model="gemini-1.5-flash")
pro_translator = LLMTranslator(provider="gemini", model="gemini-1.5-pro")
```

### 4. Cache Results
```python
import json
from pathlib import Path

cache_file = Path("translation_cache.json")
cache = {}

if cache_file.exists():
    cache = json.loads(cache_file.read_text())

def translate_with_cache(formula):
    if formula in cache:
        return cache[formula]
    
    result = translator.translate(f"Convert: {formula}")
    cache[formula] = result
    cache_file.write_text(json.dumps(cache, indent=2))
    return result
```

### 5. Monitor Token Usage
```python
total_tokens = 0

for formula in formulas:
    response = translator.provider.translate(prompt)
    total_tokens += response.tokens_used
    
    if total_tokens > 900_000:  # Approaching Flash limit
        print("⚠️ Approaching rate limit, switching to Pro...")
        translator = LLMTranslator(provider="gemini", model="gemini-1.5-pro")
```

## Troubleshooting

### API Key Not Found
```
ValueError: Google/Gemini API key not provided
```

**Solution:** Set the environment variable:
```bash
export GOOGLE_API_KEY='your-key'
```

### Rate Limit Exceeded
```
Error: Resource exhausted
```

**Solution:** Add delays between requests or use batch processing:
```python
import time

for formula in formulas:
    result = translator.translate(formula)
    time.sleep(1)  # 1 second delay
```

### Import Error
```
ImportError: No module named 'google.generativeai'
```

**Solution:**
```bash
pip install google-generativeai
```

### Content Safety Block
```
Error: Content blocked by safety filters
```

**Solution:** Review your prompt and ensure it doesn't contain sensitive financial data. Consider anonymizing data before sending to API.

## Running the Demo

```bash
# Set API key
export GOOGLE_API_KEY='your-key'

# Run demo
cd finmod_copilot
python examples/demo_gemini.py
```

The demo will:
1. Check if Gemini is available
2. Translate sample Excel formulas
3. Translate a VBA function
4. Show token usage and performance

## Comparison: Gemini vs Other Providers

| Feature | Gemini 1.5 Pro | GPT-4o | Claude 3.5 Sonnet |
|---------|---------------|---------|-------------------|
| **Cost** | $ | $$$ | $$ |
| **Speed** | Fast | Medium | Fast |
| **Context** | 2M tokens | 128K tokens | 200K tokens |
| **Code Quality** | Excellent | Excellent | Excellent |
| **Financial Formulas** | Very Good | Excellent | Excellent |
| **VBA Translation** | Good | Very Good | Very Good |
| **Free Tier** | Yes (generous) | No | Limited |

**Recommendation:** Start with Gemini for development and testing, evaluate results, then decide if you need premium providers for specific use cases.

## Additional Resources

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Gemini Pricing](https://ai.google.dev/pricing)
- [Python SDK Reference](https://ai.google.dev/api/python/google/generativeai)

## Support

For issues specific to Gemini integration:
1. Check your API key is valid
2. Verify you're within rate limits
3. Review the [Gemini API status page](https://status.cloud.google.com/)
4. Consult our [GitHub issues](https://github.com/your-repo/finmod-copilot/issues)

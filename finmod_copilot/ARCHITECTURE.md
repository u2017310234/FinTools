# FinMod-Copilot Architecture

## Overview

FinMod-Copilot follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    API/CLI Layer                             │
│             (User Interface & Orchestration)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Translation Layer                           │
│    (LLM Integration, Formula & VBA Conversion)               │
└──────────┬────────────────────────┬─────────────────────────┘
           │                        │
┌──────────▼─────────┐    ┌────────▼─────────┐
│   Core Layer       │    │  Generation      │
│  (Parsing & DAG)   │    │  (Code Output)   │
└────────────────────┘    └──────────────────┘
```

## Module Structure

### 1. Core Layer (`finmod_copilot/core/`)

**Purpose**: Deterministic parsing and analysis of Excel files

#### Components:

- **`excel_parser.py`**: Excel file parsing
  - Uses `openpyxl` for .xlsx/.xlsm parsing
  - Extracts worksheets, cells, formulas, named ranges
  - Returns structured data (no guessing)
  
- **`formula_parser.py`**: Formula analysis
  - Parses Excel formula strings
  - Categorizes functions (lookup, statistical, etc.)
  - Calculates complexity scores
  - Suggests vectorization strategies
  
- **`dependency_graph.py`**: Cell dependency DAG
  - Builds directed acyclic graph of cell dependencies
  - Performs topological sort for calculation order
  - Identifies input/output cells
  - Detects circular references
  
- **`vba_extractor.py`**: VBA code extraction
  - Uses `oletools` to extract VBA modules
  - Parses functions, subroutines, parameters
  - Identifies Range/Cell accesses
  - Filters business logic vs UI code

### 2. Translation Layer (`finmod_copilot/translation/`)

**Purpose**: LLM-based translation of Excel logic to Python

#### Components:

- **`llm_translator.py`**: LLM integration
  - Supports GPT-4o, Claude, Gemini
  - Manages API calls and rate limiting
  - Handles context window management
  - Error recovery and retries
  
- **`formula_converter.py`**: Formula → Python
  - Takes parsed formula structure
  - Generates LLM prompts for conversion
  - Post-processes LLM output
  - Adds traceability comments
  
- **`vba_converter.py`**: VBA → Python
  - Translates VBA functions to Python
  - Maps VBA types to Python types
  - Converts Range operations to DataFrame ops
  - Preserves business logic intent
  
- **`prompts/`**: LLM prompt templates
  - Formula translation prompts
  - VBA translation prompts
  - Vectorization hints
  - Best practice guidelines

### 3. Generation Layer (`finmod_copilot/generation/`)

**Purpose**: Generate clean, structured Python code

#### Components:

- **`code_generator.py`**: Main code generation
  - Orchestrates code assembly
  - Manages imports and dependencies
  - Ensures PEP 8 compliance
  - Adds documentation
  
- **`class_builder.py`**: OOP structure
  - Generates class-based models
  - Creates methods for each sheet
  - Implements __init__, run, get_results
  - Type hints and docstrings
  
- **`function_builder.py`**: Functional structure
  - Generates function-based code
  - Separates concerns (load, compute, output)
  - Simpler for smaller models
  
- **`requirements_generator.py`**: Dependencies
  - Analyzes generated code
  - Creates requirements.txt
  - Specifies minimum versions

### 4. Quality Layer (`finmod_copilot/quality/`)

**Purpose**: Validate and verify generated code

#### Components:

- **`validator.py`**: Code validation
  - Syntax checking
  - Import verification
  - Basic static analysis
  
- **`linter.py`**: Code quality
  - Runs `ruff` or `flake8`
  - Checks PEP 8 compliance
  - Reports issues
  
- **`numerical_validator.py`**: Numerical accuracy
  - Compares Excel vs Python outputs
  - Calculates differences
  - Generates validation report

### 5. Utils Layer (`finmod_copilot/utils/`)

**Purpose**: Cross-cutting concerns

#### Components:

- **`security.py`**: Security features
  - File encryption/decryption
  - Sandboxing configuration
  - Data anonymization
  
- **`logger.py`**: Logging utilities
  - Structured logging
  - Progress tracking
  - Error reporting
  
- **`config.py`**: Configuration management
  - User preferences
  - LLM API keys
  - Output settings

### 6. API Layer (`finmod_copilot/api/`)

**Purpose**: User interfaces

#### Components:

- **`converter.py`**: Main converter class
  - High-level API
  - Workflow orchestration
  - Progress callbacks
  
- **`cli.py`**: Command-line interface
  - CLI commands
  - Interactive mode
  - Batch processing
  
- **`rest_api.py`**: REST API
  - FastAPI endpoints
  - File upload handling
  - Async processing

## Data Flow

### Conversion Pipeline

```
1. Input: Excel File (.xlsx/.xlsm)
           ↓
2. ExcelParser: Parse structure
           ↓
3. VBAExtractor: Extract VBA (if .xlsm)
           ↓
4. FormulaParser: Analyze formulas
           ↓
5. DependencyGraph: Build DAG
           ↓
6. LLMTranslator: Translate formulas/VBA
           ↓
7. CodeGenerator: Assemble Python code
           ↓
8. Validator: Check quality
           ↓
9. Output: Python file(s), requirements.txt
```

### Information Flow

```
ExcelStructure (from parser)
    ├── Sheets
    │   ├── Cells (values, formulas)
    │   └── Tables/Pivots
    ├── Named Ranges
    └── VBA Modules (if present)
           ↓
ParsedFormulas + VBAFunctions
           ↓
DependencyGraph (calculation order)
           ↓
LLM Prompts (structured context)
           ↓
Python Code Snippets
           ↓
Assembled Module/Class
           ↓
Final Python Package
```

## Design Principles

### 1. Separation of Concerns
- Parsing is deterministic (no LLM)
- Translation uses LLM as "logic translator"
- Generation is template-based

### 2. Testability
- Each layer can be tested independently
- Mock LLM responses for testing
- Compare numerical outputs

### 3. Extensibility
- Plugin architecture for new Excel functions
- Support multiple LLM providers
- Custom code templates

### 4. Reliability
- Graceful degradation
- Retry mechanisms
- Detailed error messages

### 5. Security
- No sensitive data in logs
- Encrypted file handling
- Sandboxed VBA execution (optional)

## Configuration

### LLM Selection

```python
converter = ExcelConverter(
    llm_provider="openai",      # openai, anthropic, google
    llm_model="gpt-4o",          # model name
    llm_temperature=0.1,         # low for consistency
    llm_max_tokens=4096
)
```

### Output Style

```python
converter = ExcelConverter(
    output_style="class",        # class, functional
    vectorize=True,              # prefer vectorized ops
    add_comments=True,           # add traceability
    format_with="black"          # black, ruff, autopep8
)
```

### Quality Settings

```python
converter = ExcelConverter(
    validate_syntax=True,
    run_linter=True,
    numerical_validation=True,
    max_lint_issues=5
)
```

## Extension Points

### Custom Function Mappings

Add custom Excel → Python function mappings:

```python
from finmod_copilot.translation import register_function_mapping

@register_function_mapping("CUSTOM_FUNC")
def custom_func_mapping(args):
    return f"my_custom_function({', '.join(args)})"
```

### Custom LLM Provider

Implement LLM provider interface:

```python
from finmod_copilot.translation import LLMProvider

class MyLLMProvider(LLMProvider):
    def translate(self, prompt: str) -> str:
        # Your implementation
        pass
```

### Custom Code Templates

Override code generation templates:

```python
converter.set_template("class_init", """
def __init__(self, data: pd.DataFrame):
    # Custom template
    self.data = data
""")
```

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing**: Calculate independent cells in parallel
2. **Caching**: Cache LLM responses for similar formulas
3. **Batch Processing**: Group similar formulas for single LLM call
4. **Lazy Evaluation**: Only calculate needed cells

### Scalability

- **Large Files**: Stream processing for >50MB files
- **Many Formulas**: Progress tracking, cancellation
- **Complex DAGs**: Efficient graph algorithms (NetworkX)

## Security Model

### Threat Model

- **T1**: Malicious VBA macros
- **T2**: Data exfiltration via LLM API
- **T3**: Injection attacks in generated code

### Mitigations

- **M1**: Optional VBA sandboxing (gVisor)
- **M2**: Data anonymization before LLM
- **M3**: Code sanitization, no `eval()`

## Testing Strategy

### Unit Tests
- Each module independently
- Mock external dependencies
- High coverage (>80%)

### Integration Tests
- End-to-end conversion
- Real Excel files (sanitized)
- Validate outputs

### Numerical Tests
- Compare Excel vs Python
- Tolerance: 1e-9
- Statistical validation

## Monitoring & Observability

### Metrics
- Conversion success rate
- LLM token usage
- Processing time
- Error rates

### Logging
- Structured logs (JSON)
- Progress tracking
- Error traces

### Reporting
- Conversion report (JSON/HTML)
- Code quality metrics
- Validation results

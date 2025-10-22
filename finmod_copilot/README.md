# FinMod-Copilot

**Excel Financial Model → High-Quality Python Code**

FinMod-Copilot is an LLM-powered intelligent development tool designed to transform complex Excel financial workbooks (including intricate formulas, data tables, and VBA macros) into high-quality, readable, and extensible Python code.

## 🎯 Core Value

Break the "black box" state of traditional Excel financial models and migrate them to a transparent, auditable, version-controllable, and high-performance Python environment. This is critical for:
- Building automated financial risk management platforms (like 'AutoFRM')
- Large-scale model backtesting
- Integrating models into modern data pipelines

## 🚀 Key Features

### 1. Model Structure & Data Parsing
- ✅ Parse .xlsx and .xlsm files
- ✅ Extract all worksheets, values, formulas, named ranges, and VBA modules
- ✅ Identify data tables and pivot tables
- ✅ Support password-protected files

### 2. Intelligent Formula Conversion Engine
- 🧠 Build computational dependency graph (DAG)
- 🚀 Vectorize Excel operations using NumPy/Pandas
- 📝 Translate complex nested formulas (VLOOKUP, INDEX, MATCH, SUMIFS, OFFSET)
- 💬 Preserve original formulas as comments for traceability

### 3. VBA Macro Logic Migration
- 📦 Extract VBA code from .xlsm files
- 🔄 Translate business logic to Python functions
- 🎯 Map VBA Range operations to DataFrame operations
- 🔒 Sandboxed VBA execution (if needed and safe)

### 4. Code Generation & Optimization
- 🏗️ Modular code structure (class-based or function-based)
- ✨ PEP 8 compliant with type hints
- 📊 Clear traceability comments linking code to Excel cells
- 📦 Automatic requirements.txt generation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│  (File Upload, Configuration, Progress Tracking, Results)    │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   Orchestration Layer                        │
│        (Workflow Controller, Task Queue, Monitoring)         │
└─────────┬───────────────────┬─────────────────┬─────────────┘
          │                   │                 │
┌─────────▼──────┐  ┌────────▼────────┐  ┌────▼──────────────┐
│  Excel Parser  │  │  Formula Engine │  │  VBA Translator   │
│  (openpyxl,    │  │  (DAG Builder,  │  │  (oletools,       │
│   lxml)        │  │   Vectorizer)   │  │   LLM-based)      │
└────────┬───────┘  └────────┬────────┘  └────┬──────────────┘
         │                   │                 │
         └───────────────────┼─────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │   LLM Translation  │
                   │   (GPT-4o, Claude, │
                   │    Gemini)         │
                   └─────────┬──────────┘
                             │
                   ┌─────────▼──────────┐
                   │  Code Generator    │
                   │  (Modular, PEP 8,  │
                   │   Type Hints)      │
                   └─────────┬──────────┘
                             │
                   ┌─────────▼──────────┐
                   │  Quality Assurance │
                   │  (Linting, Testing,│
                   │   Validation)      │
                   └────────────────────┘
```

## 📋 System Requirements

### Functional Requirements
- **FR1**: File handling (.xlsx, .xlsm, password-protected, >50MB)
- **FR2**: Deterministic parsing using openpyxl/lxml
- **FR3**: LLM as logic translator (not file parser)
- **FR4**: Structured, modular code output

### Non-Functional Requirements
- **NFR1**: Code quality (pass flake8/ruff checks)
- **NFR2**: Meaningful variable names
- **NFR3**: Security (encryption, data deletion, VBA sandboxing)
- **NFR4**: Performance (<5 min for 50MB, 20 sheets, 5000 formulas)

## 🎯 Success Metrics

- **Conversion Rate**: >80% successful code generation
- **Code Quality**: <5 linter issues per project
- **Numerical Fidelity**: <1e-9 difference from Excel
- **Time Savings**: >90% reduction in migration time

## 📦 Project Structure

```
finmod_copilot/
├── core/
│   ├── excel_parser.py          # Excel file parsing (openpyxl, lxml)
│   ├── formula_parser.py        # Formula parsing & DAG construction
│   ├── vba_extractor.py         # VBA code extraction (oletools)
│   ├── dependency_graph.py      # Cell dependency DAG
│   └── vectorizer.py            # Formula vectorization engine
├── translation/
│   ├── llm_translator.py        # LLM-based translation
│   ├── formula_converter.py     # Formula → Python conversion
│   ├── vba_converter.py         # VBA → Python conversion
│   └── prompts/                 # LLM prompt templates
├── generation/
│   ├── code_generator.py        # Python code generation
│   ├── class_builder.py         # OOP structure builder
│   ├── function_builder.py      # Functional structure builder
│   └── requirements_generator.py
├── quality/
│   ├── validator.py             # Code validation
│   ├── linter.py                # Code quality checks
│   └── numerical_validator.py   # Excel vs Python comparison
├── utils/
│   ├── security.py              # Encryption, sandboxing
│   ├── logger.py                # Logging utilities
│   └── config.py                # Configuration management
├── api/
│   └── main.py                  # REST API / CLI interface
├── tests/
│   └── ...                      # Comprehensive test suite
└── examples/
    └── ...                      # Example conversions
```

## 🚀 Quick Start

### Installation

```bash
# Install FinMod-Copilot
pip install -r requirements.txt

# Install Google Gemini (recommended - free tier available)
pip install google-generativeai
```

### Setup Gemini API Key

Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey):

```bash
export GOOGLE_API_KEY='your-api-key-here'
```

### Basic Usage

```python
from finmod_copilot.translation.llm_translator import LLMTranslator

# Initialize with Gemini (default, most cost-effective)
translator = LLMTranslator(
    provider="gemini",           # or "openai", "anthropic"
    model="gemini-1.5-pro",      # or "gemini-1.5-flash" for faster/cheaper
    temperature=0.1,
    max_tokens=4096
)

# Translate Excel formula
excel_formula = "=SUMIF(Sales!A:A, 'North', Sales!C:C)"
prompt = f"""Convert this Excel formula to Python:
Formula: {excel_formula}
Context: Data is in pandas DataFrame 'df'
Output: Vectorized pandas code"""

python_code = translator.translate(prompt)
print(python_code)
```

### Run the Demo

```bash
# Set your Gemini API key
export GOOGLE_API_KEY='your-key'

# Run the demo
python finmod_copilot/examples/demo_gemini.py
```

See [GEMINI_GUIDE.md](finmod_copilot/GEMINI_GUIDE.md) for detailed Gemini usage instructions.

## 🎯 Target Users

- **Financial Engineers / FinTech Developers**: Integrate Excel models into Python applications
- **Quantitative Analysts**: Convert prototype models for large-scale backtesting
- **CFO/Finance IT Teams**: Migrate core financial models to enterprise systems

## 🔒 Security Considerations

- All data encrypted in transit and at rest
- Files deleted after processing (or within 24 hours)
- VBA execution in isolated sandbox (gVisor/Firecracker)
- No sensitive data sent to LLM without anonymization

## 📊 Example Transformation

**Excel Formula:**
```excel
=SUMIFS(Sales!$C:$C, Sales!$A:$A, "North", Sales!$B:$B, ">100")
```

**Generated Python:**
```python
# Original Excel: Sheet1!D5
# Formula: =SUMIFS(Sales!$C:$C, Sales!$A:$A, "North", Sales!$B:$B, ">100")
result = dfs['Sales'].loc[
    (dfs['Sales']['Region'] == 'North') & 
    (dfs['Sales']['Amount'] > 100),
    'Sales'
].sum()
```

## 🛠️ Technology Stack

- **Excel Parsing**: openpyxl, lxml, oletools
- **Formula Parsing**: custom parser with regex and AST
- **LLM Integration**: 
  - **Google Gemini** (default, most cost-effective)
  - OpenAI GPT-4o
  - Anthropic Claude 3.5
- **Code Generation**: ast, black, ruff
- **Data Processing**: pandas, numpy
- **Security**: cryptography, sandboxing (optional)

### Why Gemini as Default?

- **Cost**: 10-20x cheaper than GPT-4o ($0.06 vs $5-10 for 1000 formulas)
- **Context**: 2M tokens (vs 128K for GPT-4o)
- **Free Tier**: Generous free quota for development
- **Quality**: Excellent code generation for financial formulas
- **Speed**: Fast with Flash model option

See [cost comparison](finmod_copilot/GEMINI_GUIDE.md#comparison-gemini-vs-other-providers) for details.

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

## 📧 Contact

For enterprise support and custom integration: finmod-support@example.com

"""
Demo: Using FinMod-Copilot with Google Gemini

This example demonstrates how to use Google Gemini to translate
Excel formulas and VBA code to Python.
"""

import os
from pathlib import Path
from finmod_copilot.translation.llm_translator import LLMTranslator

def demo_gemini_formula_translation():
    """Demonstrate formula translation using Gemini."""
    
    print("=" * 60)
    print("FinMod-Copilot Demo: Formula Translation with Gemini")
    print("=" * 60)
    
    # Initialize Gemini translator
    # API key can be set via environment variable GOOGLE_API_KEY or GEMINI_API_KEY
    translator = LLMTranslator(
        provider="gemini",
        model="gemini-1.5-pro",  # or gemini-1.5-flash for faster/cheaper
        temperature=0.1,
        max_tokens=2048
    )
    
    # Check if Gemini is available
    if not translator.is_available():
        print("❌ Gemini is not available. Please set GOOGLE_API_KEY or GEMINI_API_KEY")
        return
    
    print(f"✓ Using Gemini model: {translator.config.model}\n")
    
    # Example 1: Simple SUMIF formula
    print("Example 1: SUMIF Formula")
    print("-" * 40)
    
    excel_formula = "=SUMIF(A:A, '>100', B:B)"
    print(f"Excel Formula: {excel_formula}")
    
    system_prompt = """You are an expert at converting Excel formulas to Python code.
Generate clean, vectorized Python code using pandas and numpy.
Include comments explaining the logic."""
    
    prompt = f"""Convert this Excel formula to Python code:
Formula: {excel_formula}

Assume the data is in a pandas DataFrame called 'df' with columns 'A' and 'B'.
Generate only the Python code, no explanations."""
    
    python_code = translator.translate(prompt, system_prompt)
    print(f"\nGenerated Python Code:\n{python_code}\n")
    
    # Example 2: Complex nested formula
    print("\nExample 2: Nested IF with VLOOKUP")
    print("-" * 40)
    
    excel_formula = "=IF(A1>0, VLOOKUP(B1, D:E, 2, FALSE), 0)"
    print(f"Excel Formula: {excel_formula}")
    
    prompt = f"""Convert this Excel formula to Python code:
Formula: {excel_formula}

Context:
- Data is in DataFrame 'df'
- Cell A1 maps to df.loc[0, 'A']
- Cell B1 maps to df.loc[0, 'B']
- Lookup table is in df[['D', 'E']]

Generate vectorized pandas code with proper error handling."""
    
    python_code = translator.translate(prompt, system_prompt)
    print(f"\nGenerated Python Code:\n{python_code}\n")
    
    # Example 3: Financial formula (NPV)
    print("\nExample 3: Financial Formula (NPV)")
    print("-" * 40)
    
    excel_formula = "=NPV(0.10, B2:B11)"
    print(f"Excel Formula: {excel_formula}")
    
    prompt = f"""Convert this Excel NPV formula to Python:
Formula: {excel_formula}

Context:
- Discount rate: 0.10 (10%)
- Cash flows are in df['B'][1:11] (rows 2-11)

Generate Python code using numpy_financial or manual calculation."""
    
    python_code = translator.translate(prompt, system_prompt)
    print(f"\nGenerated Python Code:\n{python_code}\n")

def demo_gemini_vba_translation():
    """Demonstrate VBA translation using Gemini."""
    
    print("\n" + "=" * 60)
    print("FinMod-Copilot Demo: VBA Translation with Gemini")
    print("=" * 60)
    
    translator = LLMTranslator(
        provider="gemini",
        temperature=0.1,
        max_tokens=4096
    )
    
    if not translator.is_available():
        print("❌ Gemini is not available")
        return
    
    print(f"✓ Using Gemini model: {translator.config.model}\n")
    
    # Example VBA function
    print("Example: VBA Function Translation")
    print("-" * 40)
    
    vba_code = """
Function CalculateDiscount(price As Double, quantity As Integer) As Double
    Dim discount As Double
    
    If quantity >= 100 Then
        discount = 0.2
    ElseIf quantity >= 50 Then
        discount = 0.1
    ElseIf quantity >= 10 Then
        discount = 0.05
    Else
        discount = 0
    End If
    
    CalculateDiscount = price * (1 - discount)
End Function
"""
    
    print(f"VBA Code:\n{vba_code}")
    
    system_prompt = """You are an expert at converting VBA code to Python.
Generate clean, well-documented Python functions with type hints.
Follow Python best practices (PEP 8)."""
    
    prompt = f"""Convert this VBA function to Python:

{vba_code}

Requirements:
1. Use type hints
2. Add docstring
3. Use pythonic naming conventions
4. Maintain the same logic"""
    
    python_code = translator.translate(prompt, system_prompt)
    print(f"\nGenerated Python Code:\n{python_code}\n")

def demo_list_providers():
    """List all available LLM providers."""
    
    print("\n" + "=" * 60)
    print("Available LLM Providers")
    print("=" * 60)
    
    providers = LLMTranslator.list_available_providers()
    
    if providers:
        print(f"\n✓ Available providers: {', '.join(providers)}")
        
        for provider in providers:
            try:
                translator = LLMTranslator(provider=provider)
                if translator.is_available():
                    print(f"  ✓ {provider}: Ready (API key found)")
                else:
                    print(f"  ⚠ {provider}: Installed but API key missing")
            except Exception as e:
                print(f"  ✗ {provider}: {str(e)}")
    else:
        print("\n❌ No LLM providers available. Install at least one:")
        print("  - pip install google-generativeai  (for Gemini)")
        print("  - pip install openai  (for GPT)")
        print("  - pip install anthropic  (for Claude)")

def main():
    """Run all demos."""
    
    print("\n" + "=" * 70)
    print(" " * 15 + "FinMod-Copilot with Gemini Demo")
    print("=" * 70)
    
    # List available providers
    demo_list_providers()
    
    # Check if Gemini API key is set
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("\n" + "⚠" * 30)
        print("WARNING: Gemini API key not found!")
        print("Set your API key:")
        print("  export GOOGLE_API_KEY='your-api-key'")
        print("or")
        print("  export GEMINI_API_KEY='your-api-key'")
        print("\nGet your API key from: https://makersuite.google.com/app/apikey")
        print("⚠" * 30 + "\n")
        return
    
    # Run demos
    demo_gemini_formula_translation()
    demo_gemini_vba_translation()
    
    print("\n" + "=" * 70)
    print("Demo completed! Check the generated Python code above.")
    print("=" * 70)

if __name__ == "__main__":
    main()

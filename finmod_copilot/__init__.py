"""
FinMod-Copilot: Excel Financial Model to Python Code Converter

Transform complex Excel financial models into high-quality, maintainable Python code.
"""

__version__ = "0.1.0"
__author__ = "FinMod Team"

from finmod_copilot.core.excel_parser import ExcelParser
from finmod_copilot.api.converter import ExcelConverter

__all__ = [
    "ExcelParser",
    "ExcelConverter",
]

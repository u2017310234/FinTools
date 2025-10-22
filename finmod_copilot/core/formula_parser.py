"""
Formula Parser Module

Parse Excel formulas and prepare them for conversion to Python.
Handles complex Excel functions and nested formulas.
"""

from typing import Dict, List, Optional, Set, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import re
from loguru import logger


class FormulaType(Enum):
    """Types of Excel formulas."""
    ARITHMETIC = "arithmetic"
    LOGICAL = "logical"
    LOOKUP = "lookup"
    TEXT = "text"
    STATISTICAL = "statistical"
    FINANCIAL = "financial"
    DATE_TIME = "datetime"
    ARRAY = "array"
    UNKNOWN = "unknown"


@dataclass
class ParsedFormula:
    """Represents a parsed Excel formula."""
    original: str
    formula_type: FormulaType
    functions: List[str]  # Excel functions used
    cell_references: Set[str]  # Cell references (A1, B2, etc.)
    range_references: Set[str]  # Range references (A1:B10)
    named_ranges: Set[str]  # Named ranges used
    constants: List[Any]  # Literal values
    operators: List[str]  # Operators used
    complexity_score: int  # Estimated complexity (0-100)


class FormulaParser:
    """
    Parse Excel formulas to extract structure and components.
    
    Prepares formulas for LLM-based translation to Python.
    """
    
    # Common Excel functions mapped to categories
    FUNCTION_CATEGORIES = {
        'SUM': FormulaType.STATISTICAL,
        'AVERAGE': FormulaType.STATISTICAL,
        'COUNT': FormulaType.STATISTICAL,
        'MAX': FormulaType.STATISTICAL,
        'MIN': FormulaType.STATISTICAL,
        'STDEV': FormulaType.STATISTICAL,
        'VAR': FormulaType.STATISTICAL,
        'VLOOKUP': FormulaType.LOOKUP,
        'HLOOKUP': FormulaType.LOOKUP,
        'INDEX': FormulaType.LOOKUP,
        'MATCH': FormulaType.LOOKUP,
        'XLOOKUP': FormulaType.LOOKUP,
        'SUMIF': FormulaType.STATISTICAL,
        'SUMIFS': FormulaType.STATISTICAL,
        'COUNTIF': FormulaType.STATISTICAL,
        'COUNTIFS': FormulaType.STATISTICAL,
        'AVERAGEIF': FormulaType.STATISTICAL,
        'AVERAGEIFS': FormulaType.STATISTICAL,
        'IF': FormulaType.LOGICAL,
        'IFS': FormulaType.LOGICAL,
        'AND': FormulaType.LOGICAL,
        'OR': FormulaType.LOGICAL,
        'NOT': FormulaType.LOGICAL,
        'CONCATENATE': FormulaType.TEXT,
        'CONCAT': FormulaType.TEXT,
        'LEFT': FormulaType.TEXT,
        'RIGHT': FormulaType.TEXT,
        'MID': FormulaType.TEXT,
        'LEN': FormulaType.TEXT,
        'TRIM': FormulaType.TEXT,
        'UPPER': FormulaType.TEXT,
        'LOWER': FormulaType.TEXT,
        'NPV': FormulaType.FINANCIAL,
        'IRR': FormulaType.FINANCIAL,
        'PV': FormulaType.FINANCIAL,
        'FV': FormulaType.FINANCIAL,
        'PMT': FormulaType.FINANCIAL,
        'XIRR': FormulaType.FINANCIAL,
        'XNPV': FormulaType.FINANCIAL,
        'DATE': FormulaType.DATE_TIME,
        'TODAY': FormulaType.DATE_TIME,
        'NOW': FormulaType.DATE_TIME,
        'YEAR': FormulaType.DATE_TIME,
        'MONTH': FormulaType.DATE_TIME,
        'DAY': FormulaType.DATE_TIME,
        'OFFSET': FormulaType.LOOKUP,
        'INDIRECT': FormulaType.LOOKUP,
    }
    
    def __init__(self):
        """Initialize the formula parser."""
        # Regex patterns
        self._cell_pattern = re.compile(
            r"\$?[A-Z]+\$?\d+",
            re.IGNORECASE
        )
        self._range_pattern = re.compile(
            r"\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+",
            re.IGNORECASE
        )
        self._function_pattern = re.compile(
            r"([A-Z][A-Z0-9_]*)\s*\(",
            re.IGNORECASE
        )
        self._operator_pattern = re.compile(
            r"[+\-*/^&<>=]+"
        )
        
    def parse(self, formula: str) -> ParsedFormula:
        """
        Parse an Excel formula.
        
        Args:
            formula: Excel formula string (with or without leading =)
            
        Returns:
            ParsedFormula object with extracted components
        """
        # Remove leading = if present
        formula = formula.lstrip('=')
        
        # Extract components
        functions = self._extract_functions(formula)
        cell_refs = self._extract_cell_references(formula)
        range_refs = self._extract_range_references(formula)
        named_ranges = self._extract_named_ranges(formula, cell_refs | range_refs)
        constants = self._extract_constants(formula)
        operators = self._extract_operators(formula)
        
        # Determine formula type
        formula_type = self._determine_type(functions)
        
        # Calculate complexity score
        complexity = self._calculate_complexity(
            functions, cell_refs, range_refs, operators
        )
        
        return ParsedFormula(
            original=formula,
            formula_type=formula_type,
            functions=functions,
            cell_references=cell_refs,
            range_references=range_refs,
            named_ranges=named_ranges,
            constants=constants,
            operators=operators,
            complexity_score=complexity
        )
    
    def _extract_functions(self, formula: str) -> List[str]:
        """Extract all Excel functions from the formula."""
        matches = self._function_pattern.findall(formula)
        return [m.upper() for m in matches]
    
    def _extract_cell_references(self, formula: str) -> Set[str]:
        """Extract individual cell references (e.g., A1, $B$2)."""
        # First remove range references to avoid duplicates
        temp = self._range_pattern.sub('', formula)
        matches = self._cell_pattern.findall(temp)
        return set(matches)
    
    def _extract_range_references(self, formula: str) -> Set[str]:
        """Extract range references (e.g., A1:B10)."""
        matches = self._range_pattern.findall(formula)
        return set(matches)
    
    def _extract_named_ranges(self, formula: str, known_refs: Set[str]) -> Set[str]:
        """
        Extract named ranges from formula.
        
        Named ranges are alphanumeric identifiers that are not:
        - Excel functions
        - Cell/range references
        - Operators
        """
        # This is a heuristic approach
        # Remove known elements
        temp = formula
        for ref in known_refs:
            temp = temp.replace(ref, '')
        
        # Remove functions
        temp = self._function_pattern.sub('', temp)
        
        # Remove operators and common syntax
        temp = re.sub(r'[+\-*/^&<>=(),\[\]{}"\']', ' ', temp)
        
        # Extract potential named ranges (alphanumeric + underscore)
        words = re.findall(r'\b[A-Za-z_][A-Za-z0-9_]*\b', temp)
        
        # Filter out common Excel keywords
        keywords = {'TRUE', 'FALSE', 'NULL', 'AND', 'OR', 'NOT'}
        named_ranges = {w for w in words if w.upper() not in keywords}
        
        return named_ranges
    
    def _extract_constants(self, formula: str) -> List[Any]:
        """Extract literal constants from formula."""
        constants = []
        
        # Numbers (including decimals and scientific notation)
        numbers = re.findall(r'\b\d+\.?\d*(?:[eE][+-]?\d+)?\b', formula)
        constants.extend([float(n) if '.' in n or 'e' in n.lower() else int(n) for n in numbers])
        
        # Strings (in quotes)
        strings = re.findall(r'"([^"]*)"', formula)
        constants.extend(strings)
        
        # Booleans
        if 'TRUE' in formula.upper():
            constants.append(True)
        if 'FALSE' in formula.upper():
            constants.append(False)
        
        return constants
    
    def _extract_operators(self, formula: str) -> List[str]:
        """Extract operators from formula."""
        matches = self._operator_pattern.findall(formula)
        return list(set(matches))
    
    def _determine_type(self, functions: List[str]) -> FormulaType:
        """Determine the primary type of the formula."""
        if not functions:
            return FormulaType.ARITHMETIC
        
        # Check the first/main function
        main_function = functions[0]
        return self.FUNCTION_CATEGORIES.get(main_function, FormulaType.UNKNOWN)
    
    def _calculate_complexity(
        self,
        functions: List[str],
        cell_refs: Set[str],
        range_refs: Set[str],
        operators: List[str]
    ) -> int:
        """
        Calculate complexity score (0-100).
        
        Based on:
        - Number of functions
        - Nesting depth
        - Number of references
        - Types of operations
        """
        score = 0
        
        # Base complexity from function count
        score += len(functions) * 5
        
        # Nested functions increase complexity
        if len(functions) > 1:
            score += (len(functions) - 1) * 10
        
        # References
        score += len(cell_refs) * 2
        score += len(range_refs) * 5
        
        # Complex functions
        complex_functions = {'VLOOKUP', 'INDEX', 'MATCH', 'OFFSET', 'INDIRECT', 'SUMIFS', 'COUNTIFS'}
        score += sum(10 for f in functions if f in complex_functions)
        
        # Operators
        score += len(operators) * 2
        
        # Cap at 100
        return min(score, 100)
    
    def can_vectorize(self, formula: ParsedFormula) -> bool:
        """
        Determine if a formula can be vectorized in Python.
        
        Vectorizable formulas can use NumPy/Pandas operations
        instead of loops.
        """
        # Simple arithmetic and statistical functions are usually vectorizable
        vectorizable_types = {
            FormulaType.ARITHMETIC,
            FormulaType.STATISTICAL
        }
        
        # Check if formula uses vectorizable functions
        vectorizable_functions = {
            'SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN',
            'STDEV', 'VAR'
        }
        
        if formula.formula_type in vectorizable_types:
            return True
        
        if any(f in vectorizable_functions for f in formula.functions):
            return True
        
        # Formulas with lookups are harder to vectorize
        if formula.formula_type == FormulaType.LOOKUP:
            return False
        
        return False
    
    def suggest_python_approach(self, formula: ParsedFormula) -> str:
        """
        Suggest the best Python implementation approach.
        
        Returns:
            Strategy description: 'vectorized', 'pandas_method', 'iterative', or 'custom'
        """
        if self.can_vectorize(formula):
            if formula.range_references:
                return 'pandas_method'  # Use DataFrame operations
            else:
                return 'vectorized'  # Use NumPy
        
        if formula.formula_type == FormulaType.LOOKUP:
            return 'pandas_method'  # Use merge/join operations
        
        if formula.complexity_score > 50:
            return 'custom'  # Needs custom function
        
        return 'iterative'  # Use loop or apply

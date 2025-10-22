"""
VBA Extractor Module

Extract VBA code from Excel .xlsm files and prepare for translation.
"""

from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from pathlib import Path
import re
from loguru import logger

try:
    from oletools.olevba import VBA_Parser
    OLETOOLS_AVAILABLE = True
except ImportError:
    logger.warning("oletools not installed. VBA extraction will be limited.")
    OLETOOLS_AVAILABLE = False

@dataclass
class VBAModule:
    """Represents a VBA module."""
    name: str
    module_type: str  # "Module", "Class", "Form", "Document"
    code: str
    functions: List[str] = field(default_factory=list)
    subroutines: List[str] = field(default_factory=list)
    dependencies: Set[str] = field(default_factory=set)  # Other modules referenced

@dataclass
class VBAFunction:
    """Represents a VBA function or subroutine."""
    name: str
    function_type: str  # "Function", "Sub", "Property"
    parameters: List[str]
    return_type: Optional[str]
    code: str
    line_start: int
    line_end: int
    calls_functions: List[str] = field(default_factory=list)
    accesses_ranges: List[str] = field(default_factory=list)  # Range accesses
    modifies_cells: List[str] = field(default_factory=list)  # Cell modifications

@dataclass
class VBAStructure:
    """Complete VBA structure of a workbook."""
    modules: Dict[str, VBAModule]
    functions: Dict[str, VBAFunction]
    entry_points: List[str]  # Main procedures/event handlers
    has_userforms: bool
    project_name: Optional[str] = None

class VBAExtractor:
    """
    Extract and analyze VBA code from Excel files.
    
    Uses oletools for extraction and custom parsing for analysis.
    """
    
    def __init__(self):
        """Initialize the VBA extractor."""
        if not OLETOOLS_AVAILABLE:
            logger.warning("VBA extraction requires oletools package")
        
        # Regex patterns for VBA parsing
        self._function_pattern = re.compile(
            r"^\s*(Public|Private|Friend)?\s*(Function|Sub|Property\s+\w+)\s+(\w+)\s*\((.*?)\)",
            re.MULTILINE | re.IGNORECASE
        )
        self._range_access_pattern = re.compile(
            r"Range\([\"']([^\"']+)[\"']\)|Cells\((\d+),\s*(\d+)\)",
            re.IGNORECASE
        )
        self._cell_assignment_pattern = re.compile(
            r"(Range\([\"']([^\"']+)[\"']\)|Cells\((\d+),\s*(\d+)\))\.Value\s*=",
            re.IGNORECASE
        )
        
    def extract(self, filepath: str) -> Optional[VBAStructure]:
        """
        Extract VBA code from an Excel file.
        
        Args:
            filepath: Path to .xlsm file
            
        Returns:
            VBAStructure object or None if no VBA found
        """
        if not OLETOOLS_AVAILABLE:
            logger.error("Cannot extract VBA: oletools not available")
            return None
        
        file_path = Path(filepath)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        if file_path.suffix.lower() not in ['.xlsm', '.xls']:
            logger.warning(f"File {filepath} may not contain VBA macros")
            return None
        
        logger.info(f"Extracting VBA from: {filepath}")
        
        try:
            vba_parser = VBA_Parser(filepath)
            
            if not vba_parser.detect_vba_macros():
                logger.info("No VBA macros found in file")
                return None
            
            # Extract all modules
            modules = {}
            for (filename, stream_path, vba_filename, vba_code) in vba_parser.extract_macros():
                if vba_code:
                    module_name = vba_filename or filename
                    module = self._parse_module(module_name, vba_code)
                    modules[module_name] = module
            
            # Extract functions across all modules
            functions = {}
            for module in modules.values():
                module_functions = self._extract_functions(module)
                functions.update(module_functions)
            
            # Identify entry points
            entry_points = self._identify_entry_points(functions)
            
            # Check for UserForms
            has_userforms = any(m.module_type == 'Form' for m in modules.values())
            
            vba_parser.close()
            
            structure = VBAStructure(
                modules=modules,
                functions=functions,
                entry_points=entry_points,
                has_userforms=has_userforms
            )
            
            logger.info(f"Extracted {len(modules)} modules, {len(functions)} functions")
            return structure
            
        except Exception as e:
            logger.error(f"Failed to extract VBA: {e}")
            return None
    
    def _parse_module(self, name: str, code: str) -> VBAModule:
        """Parse a VBA module to extract metadata."""
        # Determine module type from code patterns
        module_type = "Module"  # Default
        
        if "Attribute VB_Name" in code:
            if "Form" in code:
                module_type = "Form"
            elif "Class" in code:
                module_type = "Class"
        
        # Extract function/sub names
        functions = []
        subroutines = []
        
        for match in self._function_pattern.finditer(code):
            _, func_type, func_name, _ = match.groups()
            if func_type and func_type.upper() == 'FUNCTION':
                functions.append(func_name)
            elif func_type and func_type.upper() == 'SUB':
                subroutines.append(func_name)
        
        # TODO: Extract module dependencies
        dependencies = set()
        
        return VBAModule(
            name=name,
            module_type=module_type,
            code=code,
            functions=functions,
            subroutines=subroutines,
            dependencies=dependencies
        )
    
    def _extract_functions(self, module: VBAModule) -> Dict[str, VBAFunction]:
        """Extract all functions and subroutines from a module."""
        functions = {}
        code_lines = module.code.split('\n')
        
        for match in self._function_pattern.finditer(module.code):
            visibility, func_type, func_name, params = match.groups()
            
            # Find function start and end
            line_start = module.code[:match.start()].count('\n')
            
            # Simple end detection (look for End Function/Sub)
            end_pattern = f"End {func_type.split()[0]}"
            end_pos = module.code.find(end_pattern, match.end())
            line_end = module.code[:end_pos].count('\n') if end_pos != -1 else len(code_lines)
            
            # Extract function body
            func_code = '\n'.join(code_lines[line_start:line_end + 1])
            
            # Parse parameters
            param_list = [p.strip() for p in params.split(',') if p.strip()]
            
            # Extract return type (for functions)
            return_type = None
            if 'Function' in func_type:
                as_match = re.search(r'As\s+(\w+)', func_code, re.IGNORECASE)
                if as_match:
                    return_type = as_match.group(1)
            
            # Analyze function calls
            calls = self._extract_function_calls(func_code)
            
            # Analyze Range/Cell accesses
            range_accesses = self._extract_range_accesses(func_code)
            cell_modifications = self._extract_cell_modifications(func_code)
            
            vba_func = VBAFunction(
                name=func_name,
                function_type=func_type.split()[0],  # "Function" or "Sub"
                parameters=param_list,
                return_type=return_type,
                code=func_code,
                line_start=line_start,
                line_end=line_end,
                calls_functions=calls,
                accesses_ranges=range_accesses,
                modifies_cells=cell_modifications
            )
            
            full_name = f"{module.name}.{func_name}"
            functions[full_name] = vba_func
        
        return functions
    
    def _extract_function_calls(self, code: str) -> List[str]:
        """Extract function calls from VBA code."""
        # Simple heuristic: look for word followed by parentheses
        calls = re.findall(r'\b([A-Z]\w+)\s*\(', code, re.IGNORECASE)
        
        # Filter out VBA keywords
        vba_keywords = {'IF', 'FOR', 'WHILE', 'DO', 'SELECT', 'WITH'}
        return [c for c in calls if c.upper() not in vba_keywords]
    
    def _extract_range_accesses(self, code: str) -> List[str]:
        """Extract Range and Cells accesses from VBA code."""
        accesses = []
        
        for match in self._range_access_pattern.finditer(code):
            range_ref, row, col = match.groups()
            if range_ref:
                accesses.append(f"Range({range_ref})")
            elif row and col:
                accesses.append(f"Cells({row},{col})")
        
        return list(set(accesses))
    
    def _extract_cell_modifications(self, code: str) -> List[str]:
        """Extract cell/range modifications from VBA code."""
        modifications = []
        
        for match in self._cell_assignment_pattern.finditer(code):
            full_match = match.group(0)
            modifications.append(full_match.replace('.Value =', ''))
        
        return list(set(modifications))
    
    def _identify_entry_points(self, functions: Dict[str, VBAFunction]) -> List[str]:
        """
        Identify main entry points (event handlers, Auto_ procedures).
        
        Entry points are functions that are likely called automatically
        or by user interaction.
        """
        entry_points = []
        
        for name, func in functions.items():
            func_name = func.name.lower()
            
            # Auto procedures
            if func_name.startswith('auto_'):
                entry_points.append(name)
            
            # Workbook/Worksheet event handlers
            if any(event in func_name for event in [
                'workbook_open', 'workbook_beforeclose',
                'worksheet_change', 'worksheet_selectionchange',
                'worksheet_calculate'
            ]):
                entry_points.append(name)
            
            # No parameters might indicate entry point
            if not func.parameters and func.function_type == 'Sub':
                entry_points.append(name)
        
        return entry_points
    
    def get_business_logic_functions(self, structure: VBAStructure) -> List[VBAFunction]:
        """
        Filter functions that contain business logic (vs. UI/event handling).
        
        Business logic functions are more important to translate.
        """
        business_functions = []
        
        for func in structure.functions.values():
            # Skip event handlers
            if any(event in func.name.lower() for event in [
                'click', 'change', 'initialize', 'activate'
            ]):
                continue
            
            # Include functions that modify cells or perform calculations
            if func.modifies_cells or func.return_type:
                business_functions.append(func)
        
        return business_functions

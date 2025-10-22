"""
Dependency Graph Module

Build and analyze dependency relationships between Excel cells.
Creates a Directed Acyclic Graph (DAG) to determine calculation order.
"""

from typing import Dict, List, Set, Optional, Tuple
from dataclasses import dataclass, field
import re
from collections import defaultdict, deque
import networkx as nx
from loguru import logger

from finmod_copilot.core.excel_parser import CellInfo, ExcelStructure


@dataclass
class CellNode:
    """Node in the dependency graph representing a cell."""
    sheet_name: str
    address: str
    full_address: str  # "Sheet1!A1"
    formula: Optional[str] = None
    value: any = None
    dependencies: Set[str] = field(default_factory=set)  # Cells this depends on
    dependents: Set[str] = field(default_factory=set)  # Cells that depend on this
    level: int = 0  # Topological level for calculation order


class DependencyGraph:
    """
    Build and analyze cell dependency relationships.
    
    Creates a DAG where edges represent dependencies between cells.
    Provides topological sorting for correct calculation order.
    """
    
    def __init__(self, excel_structure: ExcelStructure):
        """
        Initialize dependency graph from Excel structure.
        
        Args:
            excel_structure: Parsed Excel structure
        """
        self.structure = excel_structure
        self.nodes: Dict[str, CellNode] = {}
        self.graph = nx.DiGraph()
        self._cell_ref_pattern = re.compile(
            r"(?:(['\w]+)!)?\$?([A-Z]+)\$?(\d+)",
            re.IGNORECASE
        )
        
    def build(self):
        """Build the complete dependency graph."""
        logger.info("Building dependency graph...")
        
        # First pass: Create nodes for all cells with formulas
        for sheet_name, sheet_info in self.structure.sheets.items():
            for cell_info in sheet_info.cells.values():
                full_address = f"{sheet_name}!{cell_info.address}"
                
                node = CellNode(
                    sheet_name=sheet_name,
                    address=cell_info.address,
                    full_address=full_address,
                    formula=cell_info.formula,
                    value=cell_info.value
                )
                
                self.nodes[full_address] = node
                self.graph.add_node(full_address)
        
        # Second pass: Extract dependencies from formulas
        for full_address, node in self.nodes.items():
            if node.formula:
                deps = self._extract_dependencies(node.formula, node.sheet_name)
                node.dependencies = deps
                
                # Add edges to graph
                for dep in deps:
                    if dep in self.nodes:
                        self.graph.add_edge(dep, full_address)
                        self.nodes[dep].dependents.add(full_address)
        
        # Check for cycles
        if not nx.is_directed_acyclic_graph(self.graph):
            cycles = list(nx.simple_cycles(self.graph))
            logger.warning(f"Circular dependencies detected: {cycles}")
            raise ValueError(f"Circular dependencies found: {cycles[:5]}")
        
        # Calculate topological levels
        self._calculate_levels()
        
        logger.info(f"Built dependency graph with {len(self.nodes)} nodes")
        
    def _extract_dependencies(self, formula: str, current_sheet: str) -> Set[str]:
        """
        Extract cell references from a formula.
        
        Args:
            formula: Excel formula string
            current_sheet: Name of the sheet containing this formula
            
        Returns:
            Set of full cell addresses this formula depends on
        """
        dependencies = set()
        
        # Find all cell references in the formula
        matches = self._cell_ref_pattern.finditer(formula)
        
        for match in matches:
            sheet_ref, col, row = match.groups()
            
            # Use current sheet if no sheet reference
            sheet_name = sheet_ref if sheet_ref else current_sheet
            
            # Remove quotes from sheet name if present
            sheet_name = sheet_name.strip("'")
            
            # Build full address
            cell_address = f"{col}{row}"
            full_address = f"{sheet_name}!{cell_address}"
            
            dependencies.add(full_address)
        
        # Also handle named ranges
        for range_name in self.structure.named_ranges:
            if range_name in formula:
                # TODO: Expand named ranges to actual cell references
                pass
        
        return dependencies
    
    def _calculate_levels(self):
        """
        Calculate topological levels for all nodes.
        
        Level 0: Nodes with no dependencies (input cells)
        Level N: Nodes that depend on level N-1 nodes
        """
        # Get topological order
        try:
            topo_order = list(nx.topological_sort(self.graph))
        except nx.NetworkXError as e:
            logger.error(f"Failed to create topological sort: {e}")
            return
        
        # Assign levels
        levels = {}
        for node_id in topo_order:
            node = self.nodes[node_id]
            
            if not node.dependencies:
                # Input cell - level 0
                levels[node_id] = 0
            else:
                # Level is max of dependency levels + 1
                dep_levels = [levels.get(dep, 0) for dep in node.dependencies]
                levels[node_id] = max(dep_levels) + 1 if dep_levels else 0
            
            node.level = levels[node_id]
    
    def get_calculation_order(self) -> List[List[str]]:
        """
        Get cells grouped by calculation level.
        
        Returns:
            List of lists, where each inner list contains cells
            that can be calculated in parallel at that level
        """
        levels = defaultdict(list)
        
        for full_address, node in self.nodes.items():
            if node.formula:  # Only include formula cells
                levels[node.level].append(full_address)
        
        # Convert to sorted list of lists
        max_level = max(levels.keys()) if levels else 0
        return [levels[i] for i in range(max_level + 1)]
    
    def get_dependencies(self, full_address: str) -> Set[str]:
        """Get all cells that a given cell depends on."""
        if full_address not in self.nodes:
            return set()
        return self.nodes[full_address].dependencies
    
    def get_dependents(self, full_address: str) -> Set[str]:
        """Get all cells that depend on a given cell."""
        if full_address not in self.nodes:
            return set()
        return self.nodes[full_address].dependents
    
    def get_transitive_dependencies(self, full_address: str) -> Set[str]:
        """
        Get all cells that a given cell transitively depends on.
        
        Args:
            full_address: Cell address in format "Sheet1!A1"
            
        Returns:
            Set of all ancestor cells in the dependency graph
        """
        if full_address not in self.graph:
            return set()
        
        return set(nx.ancestors(self.graph, full_address))
    
    def get_transitive_dependents(self, full_address: str) -> Set[str]:
        """
        Get all cells that transitively depend on a given cell.
        
        Args:
            full_address: Cell address in format "Sheet1!A1"
            
        Returns:
            Set of all descendant cells in the dependency graph
        """
        if full_address not in self.graph:
            return set()
        
        return set(nx.descendants(self.graph, full_address))
    
    def get_input_cells(self) -> List[str]:
        """
        Get all input cells (cells with no dependencies).
        
        Returns:
            List of cell addresses that are inputs
        """
        return [
            addr for addr, node in self.nodes.items()
            if not node.dependencies and not node.formula
        ]
    
    def get_output_cells(self) -> List[str]:
        """
        Get all output cells (cells with no dependents).
        
        Returns:
            List of cell addresses that are outputs
        """
        return [
            addr for addr, node in self.nodes.items()
            if not node.dependents and node.formula
        ]
    
    def visualize(self, output_path: Optional[str] = None):
        """
        Create a visualization of the dependency graph.
        
        Args:
            output_path: Path to save the visualization (PNG)
        """
        try:
            import matplotlib.pyplot as plt
            
            # Use spring layout for positioning
            pos = nx.spring_layout(self.graph, k=0.5, iterations=50)
            
            # Color nodes by level
            colors = []
            for node in self.graph.nodes():
                level = self.nodes[node].level
                colors.append(level)
            
            plt.figure(figsize=(16, 12))
            nx.draw(
                self.graph,
                pos,
                node_color=colors,
                cmap=plt.cm.viridis,
                node_size=50,
                arrows=True,
                alpha=0.6,
                with_labels=False
            )
            
            plt.title("Excel Cell Dependency Graph")
            
            if output_path:
                plt.savefig(output_path, dpi=300, bbox_inches='tight')
                logger.info(f"Saved dependency graph visualization to {output_path}")
            else:
                plt.show()
                
            plt.close()
            
        except ImportError:
            logger.warning("matplotlib not available, skipping visualization")
    
    def export_stats(self) -> Dict:
        """
        Export statistics about the dependency graph.
        
        Returns:
            Dictionary with graph statistics
        """
        calc_order = self.get_calculation_order()
        
        return {
            'total_cells': len(self.nodes),
            'formula_cells': sum(1 for n in self.nodes.values() if n.formula),
            'input_cells': len(self.get_input_cells()),
            'output_cells': len(self.get_output_cells()),
            'max_level': max((n.level for n in self.nodes.values()), default=0),
            'cells_per_level': {i: len(cells) for i, cells in enumerate(calc_order)},
            'avg_dependencies': sum(len(n.dependencies) for n in self.nodes.values()) / len(self.nodes) if self.nodes else 0,
            'max_dependencies': max((len(n.dependencies) for n in self.nodes.values()), default=0),
            'is_dag': nx.is_directed_acyclic_graph(self.graph)
        }

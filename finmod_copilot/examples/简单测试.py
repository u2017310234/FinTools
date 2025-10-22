#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FinMod-Copilot 简单测试脚本

快速测试各个模块的基本功能
"""

import os
import sys

# 确保可以导入 finmod_copilot
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

def test_llm_translator():
    """测试 LLM 翻译器"""
    print("\n" + "="*60)
    print("测试 1: LLM 翻译器")
    print("="*60)
    
    try:
        from finmod_copilot.translation.llm_translator import LLMTranslator
        
        # 检查可用的提供商
        available = LLMTranslator.list_available_providers()
        print(f"✓ 可用的 LLM 提供商: {', '.join(available) if available else '无'}")
        
        # 检查 API 密钥
        api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
        if api_key:
            print(f"✓ Gemini API 密钥已设置 (长度: {len(api_key)})")
            
            # 尝试简单翻译
            print("\n测试简单公式翻译...")
            translator = LLMTranslator(provider="gemini", model="gemini-1.5-flash")
            
            formula = "=SUM(A1:A5)"
            prompt = f"将 Excel 公式转为 Python: {formula}"
            
            print(f"输入: {formula}")
            result = translator.translate(prompt)
            print(f"输出:\n{result}")
            print("\n✓ 翻译成功!")
        else:
            print("⚠️  未找到 Gemini API 密钥")
            print("   设置方法: export GOOGLE_API_KEY='你的密钥'")
        
        return True
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

def test_excel_parser():
    """测试 Excel 解析器"""
    print("\n" + "="*60)
    print("测试 2: Excel 解析器")
    print("="*60)
    
    try:
        from finmod_copilot.core.excel_parser import ExcelParser
        
        print("✓ ExcelParser 模块加载成功")
        
        # 询问是否有 Excel 文件可供测试
        excel_file = input("\n输入 Excel 文件路径进行测试 (或按 Enter 跳过): ").strip()
        
        if excel_file and os.path.exists(excel_file):
            print(f"\n解析文件: {excel_file}")
            parser = ExcelParser()
            structure = parser.parse(excel_file)
            
            print(f"\n文件信息:")
            print(f"  - 工作表数量: {len(structure.sheets)}")
            print(f"  - 工作表名称: {list(structure.sheets.keys())}")
            print(f"  - 命名范围: {len(structure.named_ranges)} 个")
            print(f"  - 包含 VBA: {'是' if structure.has_vba else '否'}")
            
            # 显示公式统计
            formulas = parser.get_formulas()
            print(f"  - 公式总数: {len(formulas)}")
            
            if formulas:
                print(f"\n前 3 个公式:")
                for i, cell in enumerate(formulas[:3], 1):
                    print(f"  {i}. {cell.sheet_name}!{cell.address}: {cell.formula}")
            
            print("\n✓ Excel 解析成功!")
        else:
            if excel_file:
                print(f"⚠️  文件不存在: {excel_file}")
            print("跳过 Excel 文件测试")
        
        return True
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_formula_parser():
    """测试公式解析器"""
    print("\n" + "="*60)
    print("测试 3: 公式解析器")
    print("="*60)
    
    try:
        from finmod_copilot.core.formula_parser import FormulaParser
        
        parser = FormulaParser()
        
        # 测试几个典型公式
        test_formulas = [
            "=SUM(A1:A10)",
            "=IF(B1>0, C1*D1, 0)",
            "=VLOOKUP(E1, A:B, 2, FALSE)",
            "=SUMIFS(Sales!C:C, Sales!A:A, 'North', Sales!B:B, '>100')"
        ]
        
        print("解析测试公式:\n")
        
        for formula in test_formulas:
            parsed = parser.parse(formula)
            
            print(f"公式: {formula}")
            print(f"  类型: {parsed.formula_type.value}")
            print(f"  函数: {', '.join(parsed.functions) if parsed.functions else '无'}")
            print(f"  复杂度: {parsed.complexity_score}/100")
            print(f"  可向量化: {'是' if parser.can_vectorize(parsed) else '否'}")
            print(f"  建议方法: {parser.suggest_python_approach(parsed)}")
            print()
        
        print("✓ 公式解析成功!")
        return True
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_dependency_graph():
    """测试依赖图"""
    print("\n" + "="*60)
    print("测试 4: 依赖关系图")
    print("="*60)
    
    try:
        from finmod_copilot.core.dependency_graph import DependencyGraph
        from finmod_copilot.core.excel_parser import ExcelStructure, SheetInfo, CellInfo
        
        print("✓ DependencyGraph 模块加载成功")
        
        # 创建一个简单的测试结构
        print("\n创建测试用的 Excel 结构...")
        
        # 模拟一个简单的计算：A1=10, B1=A1*2, C1=B1+5
        sheet = SheetInfo(
            name="Sheet1",
            index=0,
            visible=True,
            max_row=3,
            max_col=3
        )
        
        sheet.cells = {
            "A1": CellInfo("Sheet1", "A1", 1, 1, 10, None),
            "B1": CellInfo("Sheet1", "B1", 1, 2, None, "=A1*2"),
            "C1": CellInfo("Sheet1", "C1", 1, 3, None, "=B1+5"),
        }
        
        structure = ExcelStructure(
            filename="test.xlsx",
            sheets={"Sheet1": sheet},
            named_ranges={},
            has_vba=False
        )
        
        # 构建依赖图
        print("构建依赖关系图...")
        graph = DependencyGraph(structure)
        graph.build()
        
        # 显示统计信息
        stats = graph.export_stats()
        print(f"\n图统计:")
        print(f"  - 节点总数: {stats['total_cells']}")
        print(f"  - 公式单元格: {stats['formula_cells']}")
        print(f"  - 输入单元格: {stats['input_cells']}")
        print(f"  - 输出单元格: {stats['output_cells']}")
        print(f"  - 最大层级: {stats['max_level']}")
        
        # 显示计算顺序
        calc_order = graph.get_calculation_order()
        print(f"\n计算顺序 ({len(calc_order)} 层):")
        for level, cells in enumerate(calc_order):
            print(f"  层级 {level}: {cells}")
        
        print("\n✓ 依赖图构建成功!")
        return True
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """运行所有测试"""
    print("\n" + "="*60)
    print("  FinMod-Copilot 功能测试")
    print("="*60)
    
    results = {
        "LLM 翻译器": test_llm_translator(),
        "Excel 解析器": test_excel_parser(),
        "公式解析器": test_formula_parser(),
        "依赖关系图": test_dependency_graph(),
    }
    
    # 总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    
    for name, result in results.items():
        status = "✓ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过!")
    else:
        print("\n⚠️  部分测试失败，请检查错误信息")
    
    print("\n" + "="*60)
    print("提示:")
    print("- 查看详细文档: cat finmod_copilot/本地使用指南.md")
    print("- 运行完整演示: python -m finmod_copilot.examples.demo_gemini")
    print("="*60)

if __name__ == "__main__":
    main()

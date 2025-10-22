#!/bin/bash

# FinMod-Copilot 快速启动脚本
# 用于快速设置和测试环境

echo "=================================================="
echo "  FinMod-Copilot 快速启动"
echo "=================================================="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python3"
    echo "请先安装 Python 3.8 或更高版本"
    exit 1
fi

echo "✓ Python 版本: $(python3 --version)"

# 检查是否在正确的目录
if [ ! -f "finmod_copilot/requirements.txt" ]; then
    echo "❌ 错误: 请在 RM_Tools 根目录运行此脚本"
    echo "当前目录: $(pwd)"
    echo "应该在: /workspaces/RM_Tools"
    exit 1
fi

echo "✓ 目录位置正确"
echo ""

# 询问是否安装依赖
echo "步骤 1: 安装依赖"
read -p "是否安装/更新依赖包? (y/n): " install_deps

if [ "$install_deps" = "y" ] || [ "$install_deps" = "Y" ]; then
    echo "安装依赖中..."
    pip3 install -r finmod_copilot/requirements.txt
    echo "✓ 依赖安装完成"
else
    echo "跳过依赖安装"
fi

echo ""

# 检查 API 密钥
echo "步骤 2: 检查 Gemini API 密钥"

if [ -z "$GOOGLE_API_KEY" ] && [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  未找到 API 密钥"
    echo ""
    echo "请设置您的 Gemini API 密钥："
    echo "1. 访问: https://makersuite.google.com/app/apikey"
    echo "2. 获取 API 密钥"
    echo "3. 运行: export GOOGLE_API_KEY='你的密钥'"
    echo ""
    read -p "现在设置 API 密钥? (y/n): " set_key
    
    if [ "$set_key" = "y" ] || [ "$set_key" = "Y" ]; then
        read -p "请输入您的 Gemini API 密钥: " api_key
        export GOOGLE_API_KEY="$api_key"
        echo "✓ API 密钥已设置（仅本次会话有效）"
        echo ""
        echo "提示: 要永久保存，将以下内容添加到 ~/.bashrc 或 ~/.zshrc:"
        echo "export GOOGLE_API_KEY='$api_key'"
    else
        echo "跳过 API 密钥设置"
        echo "注意: 没有 API 密钥将无法使用翻译功能"
    fi
else
    echo "✓ API 密钥已设置"
fi

echo ""

# 提供选项菜单
echo "步骤 3: 选择操作"
echo "=================================================="
echo "1) 运行 Gemini 演示程序"
echo "2) 测试 Excel 解析（需要提供 Excel 文件）"
echo "3) 测试公式翻译（交互式）"
echo "4) 查看项目文档"
echo "5) 进入 Python 交互环境"
echo "0) 退出"
echo "=================================================="

read -p "请选择 (0-5): " choice

case $choice in
    1)
        echo ""
        echo "运行 Gemini 演示..."
        python3 -m finmod_copilot.examples.demo_gemini
        ;;
    2)
        echo ""
        read -p "请输入 Excel 文件路径: " excel_file
        if [ -f "$excel_file" ]; then
            python3 -c "
from finmod_copilot.core.excel_parser import ExcelParser
parser = ExcelParser()
structure = parser.parse('$excel_file')
print(f'工作表数量: {len(structure.sheets)}')
print(f'工作表名称: {list(structure.sheets.keys())}')
print(f'命名范围: {list(structure.named_ranges.keys())}')
print(f'包含 VBA: {structure.has_vba}')
formulas = parser.get_formulas()
print(f'公式总数: {len(formulas)}')
"
        else
            echo "❌ 文件不存在: $excel_file"
        fi
        ;;
    3)
        echo ""
        echo "公式翻译测试"
        read -p "请输入 Excel 公式 (例如: =SUM(A1:A10)): " formula
        python3 -c "
from finmod_copilot.translation.llm_translator import LLMTranslator
translator = LLMTranslator(provider='gemini')
prompt = f'将以下 Excel 公式转换为 Python 代码：{\"$formula\"}'
try:
    result = translator.translate(prompt)
    print('\n生成的 Python 代码:')
    print('='*60)
    print(result)
    print('='*60)
except Exception as e:
    print(f'错误: {e}')
"
        ;;
    4)
        echo ""
        echo "项目文档位置:"
        echo "- 本地使用指南: finmod_copilot/本地使用指南.md"
        echo "- Gemini 指南: finmod_copilot/GEMINI_GUIDE.md"
        echo "- 项目总览: finmod_copilot/README.md"
        echo "- 架构文档: finmod_copilot/ARCHITECTURE.md"
        echo ""
        read -p "按 Enter 键继续..."
        ;;
    5)
        echo ""
        echo "启动 Python 交互环境..."
        echo "提示: 导入示例"
        echo "  from finmod_copilot.translation.llm_translator import LLMTranslator"
        echo "  from finmod_copilot.core.excel_parser import ExcelParser"
        echo ""
        python3 -i -c "
import sys
sys.path.insert(0, '/workspaces/RM_Tools')
print('FinMod-Copilot 已加载')
print('可用模块: ExcelParser, FormulaParser, LLMTranslator, VBAExtractor')
"
        ;;
    0)
        echo "退出"
        exit 0
        ;;
    *)
        echo "无效选择"
        ;;
esac

echo ""
echo "=================================================="
echo "完成! 更多信息请查看文档:"
echo "  cat finmod_copilot/本地使用指南.md"
echo "=================================================="

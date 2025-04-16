# 港股股价查询工具

该项目是一个用于查询香港股票实时价格的工具。用户可以输入股票代码，系统将返回相应的股价信息。

## 项目结构

```
hk-stock-query
├── src
│   ├── main.mcp          # 应用程序入口点
│   ├── components
│   │   └── StockQuery.mcp # 处理用户输入和显示查询结果的组件
│   ├── services
│   │   └── stockService.mcp # 提供获取港股实时价格的服务
│   └── utils
│       └── api.mcp       # 辅助函数，用于发送HTTP请求
├── package.json           # npm配置文件
└── README.md              # 项目文档
```

## 安装与运行

1. 克隆该项目到本地：
   ```
   git clone <repository-url>
   ```

2. 进入项目目录：
   ```
   cd hk-stock-query
   ```

3. 安装依赖：
   ```
   npm install
   ```

4. 运行应用程序：
   ```
   npm start
   ```

## 使用说明

- 启动应用后，输入您想查询的股票代码。
- 点击查询按钮，系统将显示该股票的实时价格。

## 贡献

欢迎任何形式的贡献！请提交问题或拉取请求。

## 许可证

该项目使用MIT许可证。
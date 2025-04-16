#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
// Mock data for testing
const mockStockData: Record<string, {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}> = {
  "00700": {
    name: "Tencent Holdings Ltd",
    price: 383.40,
    change: 3.80,
    changePercent: 1.00,
    volume: 12876500
  },
  "09988": {
    name: "Alibaba Group Holding Ltd",
    price: 84.55,
    change: -0.45,
    changePercent: -0.53,
    volume: 23456700
  },
  "03690": {
    name: "Meituan",
    price: 120.30,
    change: 2.30,
    changePercent: 1.95,
    volume: 8765400
  }
};

interface StockPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

const isValidStockArgs = (
  args: any
): args is { symbol: string } =>
  typeof args === 'object' &&
  args !== null &&
  typeof args.symbol === 'string';

class HKStockServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'hk-stock-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // No need for axios instance in mock mode

    this.setupToolHandlers();
    
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_stock_price',
          description: 'Get real-time Hong Kong stock price by symbol (e.g. "00700" for Tencent)',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Stock symbol (e.g. "00700" for Tencent)',
              },
            },
            required: ['symbol'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'get_stock_price') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!request.params.arguments || !isValidStockArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid stock price arguments'
        );
      }

      const symbol = request.params.arguments.symbol;

      // Use mock data
      const mockData = mockStockData[symbol];
      if (!mockData) {
        return {
          content: [
            {
              type: 'text',
              text: `Stock symbol ${symbol} not found. Available symbols: ${Object.keys(mockStockData).join(', ')}`,
            },
          ],
          isError: true,
        };
      }

      const stockPrice: StockPrice = {
        symbol: symbol,
        name: mockData.name,
        price: mockData.price,
        change: mockData.change,
        changePercent: mockData.changePercent,
        volume: mockData.volume,
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stockPrice, null, 2),
          },
        ],
      };
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Hong Kong Stock MCP server running on stdio');
  }
}

const server = new HKStockServer();
server.run().catch(console.error);

#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Request } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

interface SelectionCriteria {
  field: string;
  weight: number;
  value: any;
  matchType: 'exact' | 'range' | 'contains' | 'similar';
  minValue?: number;
  maxValue?: number;
}

interface SelectionOption {
  id: string;
  [key: string]: any;
}

// Define interface for tool arguments
interface SelectBestMatchesArgs {
  options: SelectionOption[];
  criteria: SelectionCriteria[];
  limit?: number;
}

class SmartSelectionServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'smart-selection-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

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
          name: 'select_best_matches',
          description: 'Select best matching options based on given criteria',
          inputSchema: {
            type: 'object',
            properties: {
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                  },
                  additionalProperties: true,
                },
                description: 'Array of options to select from',
              },
              criteria: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    weight: { type: 'number', minimum: 0, maximum: 1 },
                    value: {},
                    matchType: { 
                      type: 'string',
                      enum: ['exact', 'range', 'contains', 'similar']
                    },
                    minValue: { type: 'number' },
                    maxValue: { type: 'number' },
                  },
                  required: ['field', 'weight', 'value', 'matchType'],
                },
                description: 'Selection criteria with weights and match types',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of matches to return',
                minimum: 1,
                default: 5,
              },
            },
            required: ['options', 'criteria'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: Request) => {
      // Check if params exist
      if (!request.params) {
        throw new McpError(ErrorCode.InvalidRequest, 'Missing request parameters');
      }

      if (request.params.name !== 'select_best_matches') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      // Check if arguments exist
      if (!request.params.arguments) {
         throw new McpError(ErrorCode.InvalidParams, 'Missing tool arguments');
      }

      // Use type assertion for arguments
      const { options, criteria, limit = 5 } = request.params.arguments as SelectBestMatchesArgs;

      try {
        // Ensure options and criteria are arrays before proceeding
        if (!Array.isArray(options) || !Array.isArray(criteria)) {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments: options and criteria must be arrays.');
        }
        const matches = this.findBestMatches(options, criteria, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(matches, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Selection error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private findBestMatches(
    options: SelectionOption[],
    criteria: SelectionCriteria[],
    limit: number
  ) {
    // Calculate scores for each option
    const scores = options.map(option => {
      let totalScore = 0;
      let totalWeight = 0;

      for (const criterion of criteria) {
        const score = this.calculateScore(option, criterion);
        totalScore += score * criterion.weight;
        totalWeight += criterion.weight;
      }

      // Normalize score (0-1 range)
      const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      return {
        option,
        score: normalizedScore,
      };
    });

    // Sort by score descending and return top matches
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => ({
        ...result.option,
        match_score: Math.round(result.score * 100) / 100,
      }));
  }

  private calculateScore(option: SelectionOption, criterion: SelectionCriteria): number {
    const value = option[criterion.field];
    if (value === undefined) {
      return 0;
    }

    switch (criterion.matchType) {
      case 'exact':
        return this.calculateExactMatch(value, criterion.value);
      
      case 'range':
        return this.calculateRangeMatch(
          value,
          criterion.minValue ?? criterion.value,
          criterion.maxValue ?? criterion.value
        );
      
      case 'contains':
        return this.calculateContainsMatch(value, criterion.value);
      
      case 'similar':
        return this.calculateSimilarityMatch(value, criterion.value);
      
      default:
        return 0;
    }
  }

  private calculateExactMatch(value: any, target: any): number {
    if (typeof value !== typeof target) {
      return 0;
    }
    return value === target ? 1 : 0;
  }

  private calculateRangeMatch(value: number, min: number, max: number): number {
    if (typeof value !== 'number') {
      return 0;
    }
    if (value >= min && value <= max) {
      return 1;
    }
    const belowRange = value < min ? min - value : 0;
    const aboveRange = value > max ? value - max : 0;
    const distance = Math.min(belowRange, aboveRange);
    return Math.max(0, 1 - distance / Math.max(min, max));
  }

  private calculateContainsMatch(value: string | any[], target: any): number {
    if (Array.isArray(value)) {
      return value.includes(target) ? 1 : 0;
    }
    if (typeof value === 'string' && typeof target === 'string') {
      return value.toLowerCase().includes(target.toLowerCase()) ? 1 : 0;
    }
    return 0;
  }

  private calculateSimilarityMatch(value: any, target: any): number {
    if (typeof value !== typeof target) {
      return 0;
    }

    if (typeof value === 'string') {
      return this.calculateStringSimiliarity(value, target);
    }

    if (typeof value === 'number') {
      const max = Math.max(Math.abs(value), Math.abs(target));
      return max === 0 ? 1 : 1 - Math.abs(value - target) / max;
    }

    return 0;
  }

  private calculateStringSimiliarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1;
    
    let commonChars = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s2.includes(s1[i])) {
        commonChars++;
      }
    }
    
    return commonChars / maxLen;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Smart Selection MCP server running on stdio');
  }
}

const server = new SmartSelectionServer();
server.run().catch(console.error);

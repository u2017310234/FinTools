#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface MusicAnalysisArgs {
  audioUrl: string;
  type?: 'emotion' | 'mood' | 'full';
}

const isValidMusicAnalysisArgs = (args: any): args is MusicAnalysisArgs =>
  typeof args === 'object' &&
  args !== null &&
  typeof args.audioUrl === 'string' &&
  (!args.type || ['emotion', 'mood', 'full'].includes(args.type));

class MusicEmotionServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'music-emotion-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async analyzeMusicEmotion(url: string, type: string = 'full') {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
      
      let prompt = '';
      switch(type) {
        case 'emotion':
          prompt = '分析这段音乐的情感特征,包括: 主要情感类型(如喜悦、悲伤、愤怒等),情感强度(1-10),情感色彩(积极/消极)';
          break;
        case 'mood':
          prompt = '分析这段音乐营造的氛围和心情,包括:氛围类型(如轻松、压抑、激昂等),情绪影响(如能量提升、放松、忧郁等)';
          break;
        case 'full':
        default:
          prompt = '请全面分析这段音乐:\n1. 情感特征(情感类型、强度、色彩)\n2. 氛围与心情\n3. 音乐风格特点\n4. 对听众可能的情绪影响\n5. 适合的使用场景';
      }

      const result = await model.generateContent([prompt, url]);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        analysis: text
      };

    } catch (error) {
      console.error('Music analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_music',
          description: '使用Gemini AI分析音乐的情感特征、氛围和心情',
          inputSchema: {
            type: 'object',
            properties: {
              audioUrl: {
                type: 'string',
                description: '音频文件的URL链接'
              },
              type: {
                type: 'string',
                enum: ['emotion', 'mood', 'full'],
                description: '分析类型: emotion(情感), mood(氛围), full(全面分析)',
                default: 'full'
              }
            },
            required: ['audioUrl']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'analyze_music') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isValidMusicAnalysisArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid music analysis arguments'
        );
      }

      const result = await this.analyzeMusicEmotion(
        request.params.arguments.audioUrl,
        request.params.arguments.type
      );

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Music analysis error: ${result.error}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: result.analysis
          }
        ]
      };
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Music Emotion MCP server running on stdio');
  }
}

const server = new MusicEmotionServer();
server.run().catch(console.error);

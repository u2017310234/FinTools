#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

interface EntityInfo {
  [key: string]: string | number;
}

class EntityResolutionServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'entity-resolution-server',
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
      process.exit(0);
    });
  }

  private searchFiles(startPath: string, searchTerm: string, maxResults: number = 10): Array<{path: string, stats: fs.Stats}> {
    let results: Array<{path: string, stats: fs.Stats}> = [];
    
    const search = (currentPath: string) => {
      if (results.length >= maxResults) return;
      
      const files = fs.readdirSync(currentPath);
      
      for (const file of files) {
        if (results.length >= maxResults) break;
        
        const filePath = path.join(currentPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          search(filePath);
        } else if (file.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({ path: filePath, stats });
        }
      }
    };

    search(startPath);
    return results;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_files',
          description: 'Search for files by name',
          inputSchema: {
            type: 'object',
            properties: {
              searchPath: {
                type: 'string',
                description: 'Directory path to start search from',
              },
              searchTerm: {
                type: 'string',
                description: 'Text to search for in file names',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return',
                minimum: 1,
                maximum: 100,
                default: 10,
              },
            },
            required: ['searchPath', 'searchTerm'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'search_files') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = request.params.arguments as {
        searchPath: string;
        searchTerm: string;
        maxResults?: number;
      };
      const { searchPath, searchTerm, maxResults = 10 } = args;

      try {
        // Validate search path exists
        if (!fs.existsSync(searchPath)) {
          return {
            content: [
              {
                type: 'text',
                text: `Search path does not exist: ${searchPath}`,
              },
            ],
            isError: true,
          };
        }

        const results = this.searchFiles(searchPath, searchTerm, maxResults);
        
        const formattedResults = results.map(result => ({
          path: result.path,
          size: result.stats.size,
          modified: result.stats.mtime.toISOString(),
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedResults, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching files: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('File Search MCP server running on stdio');
  }
}

const server = new FileSearchServer();
server.run().catch(console.error);

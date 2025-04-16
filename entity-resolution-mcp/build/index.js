#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import stringSimilarity from 'string-similarity';
class EntityResolutionServer {
    constructor() {
        this.server = new Server({
            name: 'entity-resolution-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    calculateSimilarity(entity1, entity2) {
        let totalWeight = 0;
        let weightedSimilarity = 0;
        for (const key in entity1) {
            if (key in entity2) {
                const value1 = String(entity1[key]);
                const value2 = String(entity2[key]);
                // Calculate field similarity
                const similarity = stringSimilarity.compareTwoStrings(value1, value2);
                // Apply field weights (can be customized based on importance)
                const weight = 1.0;
                totalWeight += weight;
                weightedSimilarity += similarity * weight;
            }
        }
        return totalWeight > 0 ? weightedSimilarity / totalWeight : 0;
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'compare_entities',
                    description: 'Compare two entities and determine if they likely refer to the same real-world entity',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            entity1: {
                                type: 'object',
                                description: 'First entity information',
                                additionalProperties: true
                            },
                            entity2: {
                                type: 'object',
                                description: 'Second entity information',
                                additionalProperties: true
                            },
                            threshold: {
                                type: 'number',
                                description: 'Similarity threshold (0-1) to consider entities as matching',
                                minimum: 0,
                                maximum: 1,
                                default: 0.8
                            }
                        },
                        required: ['entity1', 'entity2']
                    }
                }
            ]
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name !== 'compare_entities') {
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
            const { entity1, entity2, threshold = 0.8 } = request.params.arguments;
            const similarity = this.calculateSimilarity(entity1, entity2);
            const isMatch = similarity >= threshold;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            similarity,
                            isMatch,
                            details: `Entities are ${isMatch ? 'likely' : 'unlikely'} to be the same (similarity: ${(similarity * 100).toFixed(2)}%)`
                        }, null, 2)
                    }
                ]
            };
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Entity Resolution MCP server running on stdio');
    }
}
const server = new EntityResolutionServer();
server.run().catch(console.error);

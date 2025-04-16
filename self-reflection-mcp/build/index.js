#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
class SelfReflectionServer {
    constructor() {
        this.server = new Server({
            name: 'self-reflection-mcp',
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
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'analyze_personality',
                    description: 'Analyze personality traits based on provided responses to questions',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            responses: {
                                type: 'object',
                                description: 'Question responses',
                                properties: {
                                    socialPreference: {
                                        type: 'string',
                                        description: 'How do you prefer to spend your free time?'
                                    },
                                    decisionMaking: {
                                        type: 'string',
                                        description: 'How do you typically make important decisions?'
                                    },
                                    stressResponse: {
                                        type: 'string',
                                        description: 'How do you handle stressful situations?'
                                    },
                                    learningStyle: {
                                        type: 'string',
                                        description: 'How do you prefer to learn new things?'
                                    }
                                },
                                required: ['socialPreference', 'decisionMaking', 'stressResponse', 'learningStyle']
                            }
                        },
                        required: ['responses']
                    }
                },
                {
                    name: 'track_mood',
                    description: 'Track and analyze your current mood',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            mood: {
                                type: 'string',
                                description: 'Current mood (e.g., happy, sad, anxious, calm)'
                            },
                            intensity: {
                                type: 'number',
                                description: 'Intensity level (1-10)',
                                minimum: 1,
                                maximum: 10
                            },
                            context: {
                                type: 'string',
                                description: 'What triggered this mood?'
                            }
                        },
                        required: ['mood', 'intensity']
                    }
                },
                {
                    name: 'get_self_reflection_prompt',
                    description: 'Get a thought-provoking self-reflection prompt',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            category: {
                                type: 'string',
                                enum: ['career', 'relationships', 'personal_growth', 'values', 'goals'],
                                description: 'Category of self-reflection'
                            }
                        },
                        required: ['category']
                    }
                }
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            switch (request.params.name) {
                case 'analyze_personality': {
                    const { responses } = request.params.arguments;
                    const analysis = this.analyzePersonality(responses);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }]
                    };
                }
                case 'track_mood': {
                    const { mood, intensity, context } = request.params.arguments;
                    const analysis = this.analyzeMood(mood, intensity, context);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }]
                    };
                }
                case 'get_self_reflection_prompt': {
                    const { category } = request.params.arguments;
                    const prompt = this.getReflectionPrompt(category);
                    return {
                        content: [{ type: 'text', text: JSON.stringify({ prompt }, null, 2) }]
                    };
                }
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
        });
    }
    analyzePersonality(responses) {
        const traits = {
            extraversion: this.analyzeExtraversion(responses.socialPreference),
            conscientiousness: this.analyzeConscientiousness(responses.decisionMaking),
            emotionalStability: this.analyzeEmotionalStability(responses.stressResponse),
            openness: this.analyzeOpenness(responses.learningStyle)
        };
        return {
            traits,
            summary: this.generatePersonalitySummary(traits)
        };
    }
    analyzeExtraversion(socialPreference) {
        const extrovertKeywords = ['people', 'social', 'group', 'party', 'friends'];
        const introvertKeywords = ['alone', 'quiet', 'solitude', 'individual', 'peaceful'];
        return this.calculateTraitScore(socialPreference.toLowerCase(), extrovertKeywords, introvertKeywords);
    }
    analyzeConscientiousness(decisionMaking) {
        const conscientiousKeywords = ['plan', 'organize', 'careful', 'systematic', 'thorough'];
        const spontaneousKeywords = ['intuition', 'spontaneous', 'flexible', 'adaptable', 'quick'];
        return this.calculateTraitScore(decisionMaking.toLowerCase(), conscientiousKeywords, spontaneousKeywords);
    }
    analyzeEmotionalStability(stressResponse) {
        const stableKeywords = ['calm', 'relaxed', 'composed', 'steady', 'balanced'];
        const unstableKeywords = ['anxious', 'worried', 'stressed', 'overwhelmed', 'nervous'];
        return this.calculateTraitScore(stressResponse.toLowerCase(), stableKeywords, unstableKeywords);
    }
    analyzeOpenness(learningStyle) {
        const openKeywords = ['explore', 'creative', 'curious', 'innovative', 'experimental'];
        const conservativeKeywords = ['traditional', 'conventional', 'practical', 'structured', 'routine'];
        return this.calculateTraitScore(learningStyle.toLowerCase(), openKeywords, conservativeKeywords);
    }
    calculateTraitScore(text, positiveKeywords, negativeKeywords) {
        const positiveMatches = positiveKeywords.filter(word => text.includes(word)).length;
        const negativeMatches = negativeKeywords.filter(word => text.includes(word)).length;
        // Calculate score on a scale of 1-10
        const total = positiveKeywords.length + negativeKeywords.length;
        const score = ((positiveMatches - negativeMatches + total) / (total * 2)) * 10;
        return Math.max(1, Math.min(10, Math.round(score)));
    }
    generatePersonalitySummary(traits) {
        const summaries = [];
        if (traits.extraversion >= 7) {
            summaries.push("You tend to be outgoing and energized by social interactions.");
        }
        else if (traits.extraversion <= 4) {
            summaries.push("You prefer quiet, solitary activities and time for internal reflection.");
        }
        if (traits.conscientiousness >= 7) {
            summaries.push("You are organized and methodical in your approach to tasks.");
        }
        else if (traits.conscientiousness <= 4) {
            summaries.push("You prefer flexibility and spontaneity in your approach.");
        }
        if (traits.emotionalStability >= 7) {
            summaries.push("You handle stress well and maintain emotional balance.");
        }
        else if (traits.emotionalStability <= 4) {
            summaries.push("You may benefit from developing additional stress management strategies.");
        }
        if (traits.openness >= 7) {
            summaries.push("You are curious and open to new experiences.");
        }
        else if (traits.openness <= 4) {
            summaries.push("You prefer familiar, traditional approaches.");
        }
        return summaries.join(" ");
    }
    analyzeMood(mood, intensity, context) {
        const moodCategories = {
            positive: ['happy', 'excited', 'content', 'peaceful', 'grateful', 'inspired'],
            negative: ['sad', 'anxious', 'angry', 'frustrated', 'stressed', 'overwhelmed'],
            neutral: ['calm', 'neutral', 'okay', 'balanced']
        };
        const category = Object.entries(moodCategories)
            .find(([_, moods]) => moods.includes(mood.toLowerCase()))?.[0] || 'other';
        return {
            mood,
            intensity,
            category,
            context: context || 'No context provided',
            suggestions: this.getMoodSuggestions(category, intensity)
        };
    }
    getMoodSuggestions(category, intensity) {
        const suggestions = [];
        if (category === 'negative' && intensity >= 7) {
            suggestions.push("Consider talking to a trusted friend or professional about your feelings", "Try some deep breathing exercises", "Take a break from current tasks if possible");
        }
        else if (category === 'negative') {
            suggestions.push("Practice self-care activities", "Go for a walk or do light exercise", "Write down your thoughts and feelings");
        }
        else if (category === 'positive') {
            suggestions.push("Share your positive energy with others", "Document what contributed to this mood", "Build on this momentum for your goals");
        }
        else {
            suggestions.push("Reflect on what you need right now", "Check in with your goals and priorities", "Consider what would enhance your current state");
        }
        return suggestions;
    }
    getReflectionPrompt(category) {
        const prompts = {
            career: [
                "What skills do you want to develop in the next year?",
                "What does your ideal workday look like?",
                "What achievements are you most proud of?",
                "What challenges help you grow professionally?"
            ],
            relationships: [
                "How do you show care for important people in your life?",
                "What qualities do you value most in relationships?",
                "How do you handle conflicts in relationships?",
                "What kind of friend are you to yourself?"
            ],
            personal_growth: [
                "What habits would you like to develop?",
                "What fears would you like to overcome?",
                "What brings you the most joy in life?",
                "How do you define success for yourself?"
            ],
            values: [
                "What principles guide your decisions?",
                "What causes do you care about most?",
                "What does living authentically mean to you?",
                "What legacy do you want to leave?"
            ],
            goals: [
                "What do you want to achieve in the next five years?",
                "What steps can you take toward your dreams?",
                "What obstacles are holding you back?",
                "How will you measure your progress?"
            ]
        };
        const categoryPrompts = prompts[category] || prompts.personal_growth;
        return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Self Reflection MCP server running on stdio');
    }
}
const server = new SelfReflectionServer();
server.run().catch(console.error);

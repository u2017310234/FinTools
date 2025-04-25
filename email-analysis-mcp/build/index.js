import { MCPServer, defineTool } from '@modelcontextprotocol/sdk'; // Reverted back from explicit .js
import { WordTokenizer, SentenceTokenizer } from 'natural'; // Using named imports for NodeNext
import { parse, compareAsc } from 'date-fns';
// Basic setup for NLP
const tokenizer = new WordTokenizer();
// Providing an empty array for the required 'abbreviations' argument.
const sentenceTokenizer = new SentenceTokenizer([]);
// --- Tool Definitions ---
const extractTimelineTool = defineTool({
    name: 'extract_timeline',
    description: 'Extracts a chronological timeline of events mentioned in email text.',
    inputSchema: {
        type: 'object',
        properties: {
            emailBody: {
                type: 'string',
                description: 'The full text content of the email body.',
            },
        },
        required: ['emailBody'],
    },
    async execute({ emailBody }) {
        const events = [];
        // Use natural's Chrono for date/time extraction (requires 'chrono-node' dependency, let's use regex for now)
        // A more robust solution would use a dedicated library like chrono-node or spaCy/nltk if available via an API or local setup.
        // Simple Regex for dates (YYYY-MM-DD, MM/DD/YYYY, Month DD, YYYY) - very basic
        const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?)/gi;
        const sentences = sentenceTokenizer.tokenize(emailBody);
        let match;
        for (const sentence of sentences) {
            while ((match = dateRegex.exec(sentence)) !== null) {
                try {
                    // Attempt to parse the found date string
                    // This parsing is basic and might need refinement based on actual date formats encountered
                    const dateStr = match[0];
                    // Basic normalization/parsing attempt - needs improvement for robustness
                    let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
                    if (isNaN(parsedDate.getTime())) {
                        parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
                    }
                    if (isNaN(parsedDate.getTime())) {
                        // Attempt parsing formats like "Month DD, YYYY" or "Month DD"
                        // This part requires more sophisticated parsing logic
                        // For simplicity, we'll use the matched string directly if parsing fails initially
                        // A library like date-fns parse would need more format hints
                        // Let's skip complex parsing for now and focus on extraction
                        // parsedDate = parse(dateStr, 'MMM d, yyyy', new Date()); // Example
                    }
                    // If parsing was somewhat successful, add event
                    if (!isNaN(parsedDate.getTime())) {
                        events.push({
                            date: parsedDate,
                            eventText: sentence.trim(), // Associate the whole sentence for context
                        });
                    }
                    else {
                        // Fallback for unparsed dates - might be less accurate for sorting
                        events.push({
                            date: dateStr, // Keep original string if unparseable by simple means
                            eventText: sentence.trim(),
                        });
                    }
                }
                catch (error) {
                    console.error(`Error parsing date '${match[0]}':`, error);
                    events.push({
                        date: match[0], // Keep original string on error
                        eventText: sentence.trim(),
                    });
                }
            }
        }
        // Sort events chronologically - only works if dates were parsed correctly
        events.sort((a, b) => {
            if (a.date instanceof Date && b.date instanceof Date) {
                return compareAsc(a.date, b.date);
            }
            else if (a.date instanceof Date) {
                return -1; // Dates come before strings
            }
            else if (b.date instanceof Date) {
                return 1; // Strings come after dates
            }
            else {
                // Basic string comparison if both are unparsed dates
                return String(a.date).localeCompare(String(b.date));
            }
        });
        return {
            timeline: events.map(e => ({
                // Format date nicely if possible
                date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date,
                event: e.eventText
            }))
        };
    },
});
const extractTodosTool = defineTool({
    name: 'extract_todos',
    description: 'Extracts potential action items or tasks from email text.',
    inputSchema: {
        type: 'object',
        properties: {
            emailBody: {
                type: 'string',
                description: 'The full text content of the email body.',
            },
        },
        required: ['emailBody'],
    },
    async execute({ emailBody }) {
        const todos = [];
        const sentences = sentenceTokenizer.tokenize(emailBody);
        // Keywords suggesting a task or action item
        const todoKeywords = ['please', 'need to', 'task:', 'action item:', 'required:', 'follow up', 'next step', 'to-do', 'must', 'should', 'will you', 'can you'];
        // Simple check for imperative mood (starts with a verb) - very basic
        const verbRegex = /^(VB|VBP)/; // Using POS tagging would be better
        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            const lowerSentence = trimmedSentence.toLowerCase();
            let isTodo = false;
            // Check for keywords
            if (todoKeywords.some(keyword => lowerSentence.includes(keyword))) {
                isTodo = true;
            }
            // Rudimentary check for imperative sentences (starting with a verb)
            // This requires a POS tagger for accuracy. Natural library has one, but setup is more involved.
            // const tokens = tokenizer.tokenize(trimmedSentence);
            // if (tokens.length > 0) {
            //   // A real POS tagger would be needed here.
            //   // Example: const taggedWords = tagger.tag(tokens);
            //   // if (verbRegex.test(taggedWords[0][1])) { isTodo = true; }
            // }
            // Check for question form suggesting a request
            if (lowerSentence.startsWith('can you') || lowerSentence.startsWith('will you') || lowerSentence.endsWith('?')) {
                // Refine this: not all questions are todos, but many requests are phrased as questions.
                if (todoKeywords.some(keyword => lowerSentence.includes(keyword)) || lowerSentence.includes('task') || lowerSentence.includes('action')) {
                    isTodo = true;
                }
            }
            if (isTodo && trimmedSentence.length > 5) { // Avoid very short sentences
                todos.push(trimmedSentence);
            }
        }
        // Deduplicate
        const uniqueTodos = [...new Set(todos)];
        return { todos: uniqueTodos };
    },
});
// --- Server Setup ---
const server = new MCPServer({
    name: 'email-analysis-mcp',
    description: 'MCP Server for analyzing email content to extract timelines and todos.',
    tools: [extractTimelineTool, extractTodosTool],
    resources: [], // No resources defined for now
});
server.start();
console.log('Email Analysis MCP Server started.');

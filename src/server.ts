import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
    name: 'example-server',
    version: '1.0.0'
});

// ... set up server resources, tools, and prompts ...
server.registerTool(
    'echo',
    {
        title: 'Echo Tool',
        description: 'Echoes the input text',
        inputSchema: { text: z.string() },
        outputSchema: { echoedText: z.string() }
    },
    async ({ text }) => {
        const output = { echoedText: text };
        return {
            content: [{ type: 'text', text: JSON.stringify(output) }],
            structuredContent: output
        };
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
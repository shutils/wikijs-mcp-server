import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { WikiJSClient } from './wikijsClient.js';

const server = new McpServer({
    name: 'example-server',
    version: '1.0.0'
});

// Initialize WikiJS Client
const wikijsClient = new WikiJSClient();

// WikiJS Tools
server.registerTool(
    'get-page-list',
    {
        title: 'Get WikiJS Page List',
        description: 'Retrieve a list of all pages from WikiJS',
        inputSchema: {},
        outputSchema: {
            pages: z.array(z.object({
                id: z.number(),
                title: z.string(),
                description: z.string()
            }))
        }
    },
    async () => {
        const pages = await wikijsClient.getPageList();
        const output = { pages };
        return {
            content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    }
);

server.registerTool(
    'get-page-content',
    {
        title: 'Get WikiJS Page Content',
        description: 'Retrieve the content of a specific page from WikiJS',
        inputSchema: { pageId: z.number() },
        outputSchema: {
            id: z.number(),
            title: z.string(),
            content: z.string()
        }
    },
    async ({ pageId }) => {
        const page = await wikijsClient.getPageById(pageId);
        return {
            content: [{ type: 'text', text: JSON.stringify(page, null, 2) }],
            structuredContent: page
        };
    }
);

server.registerTool(
    'update-page-description',
    {
        title: 'Update WikiJS Page Description',
        description: 'Update the description of a specific page in WikiJS',
        inputSchema: {
            pageId: z.number(),
            newDescription: z.string()
        },
        outputSchema: {
            id: z.number(),
            title: z.string(),
            description: z.string()
        }
    },
    async ({ pageId, newDescription }) => {
        const result = await wikijsClient.updatePageDescription(pageId, newDescription);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

server.registerTool(
    'update-page-tags',
    {
        title: 'Update WikiJS Page Tags',
        description: 'Update the tags of a specific page in WikiJS',
        inputSchema: {
            pageId: z.number(),
            tags: z.array(z.string())
        },
        outputSchema: {
            id: z.number(),
            title: z.string(),
            tags: z.array(z.object({
                id: z.number(),
                tag: z.string(),
                title: z.string()
            }))
        }
    },
    async ({ pageId, tags }) => {
        const result = await wikijsClient.updatePageTags(pageId, tags);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
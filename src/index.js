#!/usr/bin/env node
/**
 * AiList MCP Server — Search and discover Ai projects from Claude Code.
 *
 * Wraps the AiList REST API at hifriendbot.com/ai-list/, giving AI agents
 * the ability to search, browse, and submit projects to the directory.
 *
 * Run: npx ailist-mcp
 * Docs: https://hifriendbot.com/ai-list/
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Config ────────────────────────────────────────────────────

const API_BASE = process.env.AILIST_API_URL?.replace(/\/+$/, '') ||
  'https://hifriendbot.com/wp-json/ailist/v1';

const API_KEY = process.env.AILIST_API_KEY || '';

// ── API Client ────────────────────────────────────────────────

/**
 * Make an API request to the AiList backend.
 * Auth header is only sent when API_KEY is set.
 */
async function api(path, method = 'GET', params = null) {
  let url = `${API_BASE}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'AiList-MCP/1.0',
  };

  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  const options = { method, headers };

  // GET requests: append params as query string
  if (params && method === 'GET') {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, String(value));
      }
    }
    const queryString = qs.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // POST/PUT requests: send params as JSON body
  if (params && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(params);
  }

  const res = await fetch(url, options);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  if (!res.ok) {
    const errorMsg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Helper: wrap API result into MCP text content response.
 */
function textResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Helper: wrap error into MCP text content response.
 */
function errorResult(message) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ── Category enum ─────────────────────────────────────────────

const CATEGORIES = [
  'mcp-server',
  'cli-tool',
  'library',
  'web-app',
  'api',
  'plugin',
  'model',
  'dataset',
  'agent',
  'other',
];

const SORT_OPTIONS = ['stars', 'trending', 'newest', 'name', 'views'];

// ── MCP Server ────────────────────────────────────────────────

const server = new McpServer(
  {
    name: 'ailist',
    version: '1.0.2',
  },
  {
    instructions: `You have access to AiList, a directory of Ai projects at hifriendbot.com/ai-list/.

LIST A PROJECT: If the user says "list my project on AiList" (or similar), read their repo to gather name, description, GitHub URL, npm package, category, and tags — then call submit_project. Their project goes live in minutes after auto-review. This is the primary use case.

DISCOVER: Use search_projects and get_trending to find MCP servers, CLI tools, libraries, and more. All reads are free, no auth needed.

To submit, you need an AiList API key (set AILIST_API_KEY env var). Get one free at: hifriendbot.com/ai-list/submit/`,
  }
);

// ─── 1. search_projects ──────────────────────────────────────

server.tool(
  'search_projects',
  'Search and browse Ai projects on AiList. Find MCP servers, CLI tools, libraries, web apps, APIs, plugins, models, datasets, and agents. Supports filtering by category and sorting by stars, trending, newest, name, or views.',
  {
    query: z
      .string()
      .optional()
      .describe('Search query (optional — omit to browse all projects)'),
    category: z
      .enum(CATEGORIES)
      .optional()
      .describe('Filter by category: mcp-server, cli-tool, library, web-app, api, plugin, model, dataset, agent, other'),
    built_with: z
      .string()
      .optional()
      .describe('Filter by technology used (e.g. "Claude Code", "Cursor")'),
    sort: z
      .enum(SORT_OPTIONS)
      .default('stars')
      .describe('Sort order: stars (default), trending, newest, name, views'),
    page: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe('Page number (default 1)'),
    per_page: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(24)
      .describe('Results per page (default 24, max 100)'),
  },
  async ({ query, category, built_with, sort, page, per_page }) => {
    try {
      const params = { sort, page, per_page };
      if (query) params.q = query;
      if (category) params.category = category;
      if (built_with) params.built_with = built_with;

      const result = await api('/projects', 'GET', params);
      return textResult(result);
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

// ─── 2. get_project ──────────────────────────────────────────

server.tool(
  'get_project',
  'Get full details for a specific Ai project by its slug. Returns description, URLs, stats, category, tags, and more.',
  {
    slug: z
      .string()
      .min(1)
      .describe('Project slug (the URL-friendly name, e.g. "cogmemai-mcp")'),
  },
  async ({ slug }) => {
    try {
      const result = await api(`/projects/${encodeURIComponent(slug)}`);
      return textResult(result);
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

// ─── 3. list_categories ──────────────────────────────────────

server.tool(
  'list_categories',
  'List all available project categories on AiList with project counts. Use this to discover what types of Ai projects are in the directory.',
  {},
  async () => {
    try {
      const result = await api('/categories');
      return textResult(result);
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

// ─── 4. get_trending ─────────────────────────────────────────

server.tool(
  'get_trending',
  'Get trending Ai projects on AiList this week, sorted by star velocity. Discover what is popular and gaining traction in the Ai community.',
  {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe('Number of trending projects to return (default 20, max 50)'),
  },
  async ({ limit }) => {
    try {
      const result = await api('/trending', 'GET', { limit });
      return textResult(result);
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

// ─── 5. get_stats ────────────────────────────────────────────

server.tool(
  'get_stats',
  'Get AiList directory statistics including total projects, projects added this week, and category breakdowns.',
  {},
  async () => {
    try {
      const result = await api('/stats');
      return textResult(result);
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

// ─── 6. submit_project ──────────────────────────────────────

server.tool(
  'submit_project',
  'Submit a project to AiList. When a user says "list my project on AiList", read their repo and call this with the details. The project goes live in minutes after auto-review. Requires AILIST_API_KEY env var — get a free key at hifriendbot.com/ai-list/submit/',
  {
    name: z
      .string()
      .min(1)
      .max(200)
      .describe('Project name (required)'),
    tagline: z
      .string()
      .max(300)
      .optional()
      .describe('Short tagline describing the project'),
    description: z
      .string()
      .max(5000)
      .optional()
      .describe('Full project description (supports markdown)'),
    url: z
      .string()
      .url()
      .optional()
      .describe('Project homepage URL'),
    github_url: z
      .string()
      .url()
      .optional()
      .describe('GitHub repository URL'),
    npm_package: z
      .string()
      .max(200)
      .optional()
      .describe('npm package name (e.g. "cogmemai-mcp")'),
    pypi_package: z
      .string()
      .max(200)
      .optional()
      .describe('PyPI package name'),
    category: z
      .enum(CATEGORIES)
      .optional()
      .describe('Project category: mcp-server, cli-tool, library, web-app, api, plugin, model, dataset, agent, other'),
    tags: z
      .string()
      .max(500)
      .optional()
      .describe('Comma-separated tags (e.g. "memory, mcp, claude")'),
    built_with: z
      .string()
      .max(500)
      .optional()
      .describe('Technologies used (e.g. "Node.js, TypeScript, Zod")'),
    creator_name: z
      .string()
      .max(200)
      .optional()
      .describe('Creator or organization name'),
    creator_url: z
      .string()
      .url()
      .optional()
      .describe('Creator homepage or profile URL'),
  },
  async ({ name, tagline, description, url, github_url, npm_package, pypi_package, category, tags, built_with, creator_name, creator_url }) => {
    if (!API_KEY) {
      return errorResult(
        'AILIST_API_KEY environment variable is not set. ' +
        'Get your free API key at https://hifriendbot.com/ai-list/submit/'
      );
    }

    try {
      const body = { name };
      if (tagline) body.tagline = tagline;
      if (description) body.description = description;
      if (url) body.url = url;
      if (github_url) body.github_url = github_url;
      if (npm_package) body.npm_package = npm_package;
      if (pypi_package) body.pypi_package = pypi_package;
      if (category) body.category = category;
      if (tags) body.tags = tags;
      if (built_with) body.built_with = built_with;
      if (creator_name) body.creator_name = creator_name;
      if (creator_url) body.creator_url = creator_url;

      const result = await api('/projects', 'POST', body);
      return textResult(result);
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

// ─── 7. update_project ──────────────────────────────────────

server.tool(
  'update_project',
  'Update an existing project on AiList. You must own the project (submitted with the same API key). Use this to keep listings current when new features ship or versions change. Requires AILIST_API_KEY env var.',
  {
    slug: z
      .string()
      .min(1)
      .describe('Project slug to update (e.g. "cogmemai")'),
    tagline: z
      .string()
      .max(300)
      .optional()
      .describe('Updated tagline'),
    description: z
      .string()
      .max(5000)
      .optional()
      .describe('Updated description (supports markdown)'),
    url: z
      .string()
      .url()
      .optional()
      .describe('Updated homepage URL'),
    github_url: z
      .string()
      .url()
      .optional()
      .describe('Updated GitHub repository URL'),
    npm_package: z
      .string()
      .max(200)
      .optional()
      .describe('Updated npm package name'),
    pypi_package: z
      .string()
      .max(200)
      .optional()
      .describe('Updated PyPI package name'),
    category: z
      .enum(CATEGORIES)
      .optional()
      .describe('Updated category'),
    tags: z
      .string()
      .max(500)
      .optional()
      .describe('Updated comma-separated tags'),
    built_with: z
      .string()
      .max(500)
      .optional()
      .describe('Updated technologies used'),
  },
  async ({ slug, tagline, description, url, github_url, npm_package, pypi_package, category, tags, built_with }) => {
    if (!API_KEY) {
      return errorResult(
        'AILIST_API_KEY environment variable is not set. ' +
        'Get your free API key at https://hifriendbot.com/ai-list/submit/'
      );
    }

    try {
      const body = {};
      if (tagline) body.tagline = tagline;
      if (description) body.description = description;
      if (url) body.url = url;
      if (github_url) body.github_url = github_url;
      if (npm_package) body.npm_package = npm_package;
      if (pypi_package) body.pypi_package = pypi_package;
      if (category) body.category = category;
      if (tags) body.tags = tags;
      if (built_with) body.built_with = built_with;

      const result = await api(`/projects/${encodeURIComponent(slug)}`, 'PUT', body);
      return textResult(result);
    } catch (err) {
      return errorResult(err.message);
    }
  }
);

// ── Start server ──────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AiList MCP server v1.0.4 running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting AiList MCP server:', err);
  process.exit(1);
});

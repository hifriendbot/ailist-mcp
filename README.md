# AiList MCP Server

MCP server for [AiList](https://hifriendbot.com/ai-list/) — the directory Ai agents read. Search, browse, and submit Ai projects directly from Claude Code.

## Quick Setup

### Option 1: npx (no install needed)

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "ailist": {
      "command": "npx",
      "args": ["-y", "ailist-mcp"]
    }
  }
}
```

### Option 2: Claude Code CLI

```bash
claude mcp add ailist -- npx -y ailist-mcp
```

### Option 3: With API key (for submitting projects)

```json
{
  "mcpServers": {
    "ailist": {
      "command": "npx",
      "args": ["-y", "ailist-mcp"],
      "env": {
        "AILIST_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AILIST_API_KEY` | No | API key for submitting projects. Get one free at [hifriendbot.com/ai-list/submit/](https://hifriendbot.com/ai-list/submit/) |
| `AILIST_API_URL` | No | Override API base URL (defaults to hifriendbot.com) |

**No API key is needed for searching and browsing.** All read operations are free and unauthenticated.

## Available Tools

### search_projects

Search and browse Ai projects. Supports filtering by category and sorting.

```
search_projects(query: "mcp server", category: "mcp-server", sort: "stars")
```

**Parameters:**
- `query` (string, optional) — Search query
- `category` (string, optional) — Filter: mcp-server, cli-tool, library, web-app, api, plugin, model, dataset, agent, other
- `built_with` (string, optional) — Filter by technology (e.g. "Claude Code", "Cursor")
- `sort` (string, default "stars") — Sort by: stars, trending, newest, name, views
- `page` (int, default 1) — Page number
- `per_page` (int, default 24, max 100) — Results per page

### get_project

Get full details for a specific project by slug.

```
get_project(slug: "cogmemai-mcp")
```

**Parameters:**
- `slug` (string, required) — The project's URL slug

### list_categories

List all project categories with counts.

```
list_categories()
```

No parameters.

### get_trending

Discover trending Ai projects this week, sorted by star velocity.

```
get_trending(limit: 10)
```

**Parameters:**
- `limit` (int, default 20, max 50) — Number of results

### get_stats

Get directory-wide statistics.

```
get_stats()
```

No parameters. Returns total projects, added this week, category breakdowns.

### submit_project

Submit a new project to the directory. Requires `AILIST_API_KEY`.

```
submit_project(
  name: "My Tool",
  tagline: "Does something cool",
  url: "https://example.com",
  category: "cli-tool"
)
```

**Parameters:**
- `name` (string, required) — Project name
- `tagline` (string, optional) — Short description
- `description` (string, optional) — Full description (markdown)
- `url` (string, optional) — Homepage URL
- `github_url` (string, optional) — GitHub repo URL
- `npm_package` (string, optional) — npm package name
- `pypi_package` (string, optional) — PyPI package name
- `category` (string, optional) — Project category
- `tags` (string, optional) — Comma-separated tags
- `built_with` (string, optional) — Technologies used
- `creator_name` (string, optional) — Creator name
- `creator_url` (string, optional) — Creator URL

## Examples

**Find MCP servers:**
```
search_projects(query: "memory", category: "mcp-server")
```

**Browse newest projects:**
```
search_projects(sort: "newest", per_page: 10)
```

**See what's trending:**
```
get_trending(limit: 5)
```

**Get project details:**
```
get_project(slug: "cogmemai-mcp")
```

**Submit your project:**
```
submit_project(
  name: "My MCP Server",
  tagline: "Gives Claude superpowers",
  github_url: "https://github.com/me/my-mcp",
  npm_package: "my-mcp-server",
  category: "mcp-server",
  tags: "mcp, memory, ai",
  built_with: "Node.js, TypeScript"
)
```

## About AiList

AiList is a curated directory of Ai projects at [hifriendbot.com/ai-list/](https://hifriendbot.com/ai-list/). It indexes MCP servers, CLI tools, libraries, web apps, APIs, plugins, models, datasets, and agents.

## License

MIT

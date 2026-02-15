# Cursor MCP – Token-Optimized Setup

## Installed MCP Servers

| Server                  | Purpose                                              | Token Impact | Requirements                  |
| ----------------------- | ---------------------------------------------------- | ------------ | ----------------------------- |
| **memory**              | Local knowledge graph – stores facts, avoids re-read | High         | Node.js                       |
| **filesystem**          | `read_text_file` with `head`/`tail` – partial reads  | Medium       | Node.js                       |
| **sequential-thinking** | Step-by-step reasoning for complex problems          | Medium       | Node.js                       |
| **fetch**               | Web content with `max_length` (default 5000 chars)   | High         | Python + uv (`uvx`)           |
| **ref**                 | Token-efficient docs search – snippets only          | High         | Free API key (ref.tools/keys) |

## Quick Start

### 1. Prerequisites

- **Node.js 18+** (for memory, filesystem, sequential-thinking)
- **Python 3.10+** with **uv** (`pip install uv`) for fetch
- **Ref** (optional): Get free API key at [ref.tools/keys](https://ref.tools/keys) – 200 credits, never expire

### 2. Configuration

Project config is in `.cursor/mcp.json`. All servers are pre-configured.

### 3. Apply Config

**Option A – Project config**

- `.cursor/mcp.json` in this repo is already set up.
- Restart Cursor so it loads the config.

**Option B – Global config**

- Copy the `mcpServers` block into `%USERPROFILE%\.cursor\mcp.json`.
- Merge with existing `mcpServers` if needed.

### 3. Ref API Key (Optional)

To enable Ref (token-efficient docs search):

1. Go to [ref.tools/keys](https://ref.tools/keys) and create a free account.
2. Copy your API key.
3. Set environment variable: `REF_API_KEY=your-key` (or add to your shell profile).

If `REF_API_KEY` is not set, remove the `ref` entry from `mcp.json` or the server will fail to connect.

### 4. Verify

1. Restart Cursor.
2. Open Agent Chat.
3. In the tools list, confirm `memory`, `filesystem`, `sequential-thinking`, `fetch` (and `ref` if configured) appear.
4. Try: _“Search memory for any project context”_.

---

## Optional: Semantic Memory (Docker)

For semantic search and `summarize_memories`:

### Install Ollama (local embeddings)

```powershell
# Download from https://ollama.com/download
ollama pull nomic-embed-text
```

### Run Local Memory MCP

```powershell
docker run --rm -i -v "${PWD}\.cursor\memory-data:/app/data" cunicopia/local-memory-mcp:sqlite
```

Add to `mcp.json`:

```json
"localMemory": {
  "command": "docker",
  "args": [
    "run",
    "--rm",
    "-i",
    "-v",
    "${workspaceFolder}/.cursor/memory-data:/app/data",
    "cunicopia/local-memory-mcp:sqlite"
  ]
}
```

---

## Token Optimization Strategy

| Strategy                            | How                                                        |
| ----------------------------------- | ---------------------------------------------------------- |
| **Context summarization**           | Store summaries in memory; reuse instead of re-reading     |
| **Memory compression**              | Store only facts (entities/observations), not full content |
| **Local conversation storage**      | `memory.jsonl` in `.cursor/`                               |
| **Caching repeated prompts**        | Memory search before answering                             |
| **Avoid resending unchanged files** | Use memory + partial reads when possible                   |

### Memory Usage

- **create_entities**: e.g. `{ "name": "g-studio", "entityType": "project", "observations": ["Uses Vite + React", "TypeScript strict"] }`
- **add_observations**: Append new facts to existing entities.
- **search_nodes**: Retrieve relevant context before acting.

### Filesystem Usage

- `read_text_file` with `head: 50` or `tail: 100` for large files.
- `search_files` for locating files instead of full directory reads.

### Sequential Thinking Usage

- For complex refactors or debugging: call `sequential_thinking` to plan steps before executing.
- Use `nextThoughtNeeded`, `thoughtNumber`, `totalThoughts` to structure reasoning.

### Fetch Usage

- `fetch` with `url` and `max_length: 5000` to avoid loading full web pages.
- Use `start_index` for chunked retrieval of long content.

### Ref Usage

- `ref_search_documentation` before searching the web – returns only relevant snippets.
- Reduces tokens vs. full docs or web search.

---

## Security

- `memory.jsonl` is local; add to `.gitignore` if desired.
- Filesystem is limited to `${workspaceFolder}`.
- No API keys or cloud calls required.

---

## Troubleshooting

| Issue                   | Fix                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| MCP servers not showing | Restart Cursor; check `.cursor/mcp.json` syntax                                                                            |
| `npx` fails             | Ensure Node.js 18+ is installed                                                                                            |
| Memory not persisting   | Confirm `MEMORY_FILE_PATH` resolves and is writable                                                                        |
| `fetch` fails           | Install uv: `pip install uv`. Or use Docker: replace command with `docker` and args with `["run","-i","--rm","mcp/fetch"]` |
| `ref` connection error  | Set `REF_API_KEY` env var, or remove `ref` from `mcp.json`                                                                 |

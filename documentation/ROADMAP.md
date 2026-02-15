# Architecture roadmap

## v5 – Transport & layout

- [ ] **Unify streaming transport layer**  
      Move streaming transport into `mcpService` once SSE/ReadableStream is supported.  
      Current: `src/llm/stream.ts` uses direct `fetch` as a temporary exception.

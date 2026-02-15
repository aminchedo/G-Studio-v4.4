# 🛠️ MCP Tools Reference

## Overview

All MCP (Model Context Protocol) tools are **fully available** to both cloud and local models. This document lists all available tools and their usage.

---

## 📁 File System Tools

### `filesystem:read_file`
Read file contents.

```typescript
{
  "path": "src/components/Button.tsx"
}
```

**Returns:**
```json
{
  "success": true,
  "content": "...",
  "size": 1234,
  "lines": 45
}
```

---

### `filesystem:edit_file`
Edit file with surgical changes (recommended).

```typescript
{
  "path": "src/auth.ts",
  "edits": [
    {
      "oldText": "const token = localStorage.getItem('token');",
      "newText": "const token = secureStorage.getItem('token');"
    }
  ]
}
```

**Returns:**
```json
{
  "success": true,
  "message": "File edited: src/auth.ts",
  "editsApplied": 1
}
```

---

### `filesystem:create_file`
Create a new file.

```typescript
{
  "path": "src/utils/helper.ts",
  "content": "export function helper() { ... }"
}
```

---

### `filesystem:update_file`
Replace entire file content.

```typescript
{
  "path": "src/config.ts",
  "content": "export const config = { ... }"
}
```

---

### `filesystem:delete_file`
Delete a file.

```typescript
{
  "path": "src/old-file.ts"
}
```

---

### `filesystem:list_directory`
List directory contents.

```typescript
{
  "path": "src/components",
  "recursive": false
}
```

**Returns:**
```json
{
  "success": true,
  "files": [
    { "name": "Button.tsx", "type": "file", "path": "src/components/Button.tsx" },
    { "name": "Input.tsx", "type": "file", "path": "src/components/Input.tsx" }
  ]
}
```

---

## 🔍 Code Analysis Tools

### `typescript-analyzer:get_diagnostics`
Get TypeScript errors and warnings.

```typescript
{
  "path": "src/components/UserProfile.tsx"
}
```

**Returns:**
```json
{
  "success": true,
  "diagnostics": [
    {
      "severity": "error",
      "message": "Property 'name' does not exist on type 'User'",
      "line": 15,
      "column": 10
    }
  ]
}
```

---

### `analyze_structure`
Analyze project structure and dependencies.

```typescript
{
  "path": "src"
}
```

**Returns:**
```json
{
  "success": true,
  "structure": {
    "components": 15,
    "services": 8,
    "utils": 5,
    "dependencies": ["react", "typescript", "zustand"]
  }
}
```

---

### `analyze_dependencies`
Analyze package dependencies.

```typescript
{}
```

**Returns:**
```json
{
  "success": true,
  "dependencies": {
    "react": "^18.2.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "vite": "^4.0.0"
  }
}
```

---

## 💾 Database Tools

### `db_save_memory`
Save information to persistent memory (zero tokens).

```typescript
{
  "entityName": "UserAuthSystem",
  "entityType": "architecture_decision",
  "observations": [
    "Using JWT tokens for authentication",
    "Tokens stored in secure storage",
    "Refresh token rotation implemented"
  ],
  "relations": [
    { "to": "SecurityBestPractices", "relationType": "implements" }
  ]
}
```

---

### `db_get_memory`
Retrieve saved memory.

```typescript
{
  "entityName": "UserAuthSystem"
}
```

---

### `db_search_memory`
Search through saved memories.

```typescript
{
  "query": "authentication",
  "entityType": "architecture_decision"
}
```

---

### `db_get_all_memory`
Get all saved memories and relations.

```typescript
{}
```

**Returns:**
```json
{
  "success": true,
  "entities": [...],
  "relations": [...],
  "count": 25
}
```

---

## 💬 Conversation Tools

### `db_create_conversation`
Create a new conversation.

```typescript
{
  "title": "Refactor Authentication",
  "agentIds": ["architect", "coder"],
  "projectPath": "/path/to/project"
}
```

---

### `db_save_message`
Save a message to conversation.

```typescript
{
  "conversationId": "conv-123",
  "messageId": "msg-456",
  "role": "assistant",
  "content": "I've refactored the auth system...",
  "agentId": "coder"
}
```

---

### `db_get_messages`
Get conversation messages.

```typescript
{
  "conversationId": "conv-123",
  "limit": 50
}
```

---

### `db_get_recent_messages`
Get recent messages within token limit.

```typescript
{
  "conversationId": "conv-123",
  "maxTokens": 2000
}
```

---

## 🎨 Design Tools

### `generate_palette`
Generate color palette.

```typescript
{
  "baseColor": "#4F46E5",
  "scheme": "complementary"
}
```

**Returns:**
```json
{
  "success": true,
  "palette": {
    "primary": "#4F46E5",
    "secondary": "#E5464F",
    "accent": "#46E54F"
  }
}
```

---

## 🔧 Terminal Tools

### `terminal:execute`
Execute terminal command (safe commands only).

```typescript
{
  "command": "npm install axios",
  "cwd": "/path/to/project"
}
```

**Allowed commands:**
- `npm`, `yarn`, `pnpm`
- `git`
- `ls`, `cd`, `pwd`, `cat`, `grep`, `find`, `echo`
- `node`, `tsc`

**Forbidden:**
- Pipe operators (`|`, `>`, `&&`, `;`)
- Dangerous commands (`rm -rf`)

---

## 📊 Git Tools

### `git:status`
Get git status.

```typescript
{
  "path": "/path/to/project"
}
```

**Returns:**
```json
{
  "success": true,
  "files": [
    { "path": "src/auth.ts", "status": "modified" },
    { "path": "src/new.ts", "status": "new" }
  ]
}
```

---

### `git:diff`
Get git diff.

```typescript
{
  "path": "/path/to/project",
  "file": "src/auth.ts"
}
```

---

### `git:commit`
Commit changes.

```typescript
{
  "message": "Refactor authentication system",
  "files": ["src/auth.ts", "src/utils/token.ts"]
}
```

---

## 🔐 Security & Validation

### Protected Paths
These paths are **forbidden** for safety:

```
❌ node_modules/
❌ release/
❌ dist/
❌ build/
❌ .git/
❌ .nexus/
❌ package-lock.json
❌ yarn.lock
```

### Protected Extensions
These file types are **forbidden**:

```
❌ .exe, .dll, .pak, .bin
❌ .so, .dylib, .app
❌ .deb, .rpm, .msi, .pkg
❌ .zip, .tar, .gz, .rar
❌ .db, .sqlite
```

### Path Validation
All paths are validated for:
- ✅ No path traversal (`../`)
- ✅ No system directories (`/etc/`, `/usr/`)
- ✅ No Windows system paths (`C:\Windows`)
- ✅ Within project boundaries

---

## 🏠 Local Model Tool Usage

### XML-Style (Recommended)
```xml
<tool>filesystem:edit_file</tool>
<args>
{
  "path": "src/auth.ts",
  "edits": [
    {
      "oldText": "const token = localStorage.getItem('token');",
      "newText": "const token = secureStorage.getItem('token');"
    }
  ]
}
</args>
```

### Function-Style
````markdown
```tool filesystem:edit_file
{
  "path": "src/auth.ts",
  "edits": [...]
}
```
````

### JSON-Style
```json
{
  "tool": "filesystem:edit_file",
  "args": {
    "path": "src/auth.ts",
    "edits": [...]
  }
}
```

---

## 📝 Best Practices

### 1. Always Read Before Edit
```typescript
// ✅ Good
1. Read file: filesystem:read_file
2. Understand content
3. Edit file: filesystem:edit_file

// ❌ Bad
1. Edit file directly without reading
```

### 2. Use Surgical Edits
```typescript
// ✅ Good: edit_file with specific changes
{
  "path": "src/auth.ts",
  "edits": [
    { "oldText": "old code", "newText": "new code" }
  ]
}

// ❌ Bad: update_file with entire content
{
  "path": "src/auth.ts",
  "content": "entire file content..."
}
```

### 3. Verify Changes
```typescript
// ✅ Good workflow
1. Edit file
2. Get diagnostics: typescript-analyzer:get_diagnostics
3. Verify no new errors
4. Report to user

// ❌ Bad workflow
1. Edit file
2. Done (no verification)
```

### 4. Use Memory
```typescript
// ✅ Good: Save important decisions
db_save_memory({
  entityName: "AuthRefactoring",
  entityType: "task_completed",
  observations: [
    "Refactored auth system to use secure storage",
    "Added token rotation",
    "Fixed 3 security vulnerabilities"
  ]
})

// Later: Retrieve context
db_search_memory({ query: "auth" })
```

---

## 🎯 Common Workflows

### Workflow 1: Fix Type Errors
```typescript
1. Get diagnostics
   → typescript-analyzer:get_diagnostics { path: "src/User.tsx" }

2. Read file
   → filesystem:read_file { path: "src/User.tsx" }

3. Fix errors
   → filesystem:edit_file {
       path: "src/User.tsx",
       edits: [{ oldText: "...", newText: "..." }]
     }

4. Verify fix
   → typescript-analyzer:get_diagnostics { path: "src/User.tsx" }

5. Save to memory
   → db_save_memory {
       entityName: "UserTypeErrors",
       entityType: "bug_fix",
       observations: ["Fixed 3 type errors in User.tsx"]
     }
```

### Workflow 2: Refactor Code
```typescript
1. Analyze structure
   → analyze_structure { path: "src" }

2. Read files
   → filesystem:read_file { path: "src/auth.ts" }
   → filesystem:read_file { path: "src/utils/token.ts" }

3. Make changes
   → filesystem:edit_file { path: "src/auth.ts", edits: [...] }
   → filesystem:edit_file { path: "src/utils/token.ts", edits: [...] }

4. Verify
   → typescript-analyzer:get_diagnostics { path: "src/auth.ts" }

5. Commit
   → git:commit {
       message: "Refactor auth system",
       files: ["src/auth.ts", "src/utils/token.ts"]
     }
```

### Workflow 3: Create New Feature
```typescript
1. Create files
   → filesystem:create_file {
       path: "src/features/DarkMode.tsx",
       content: "..."
     }

2. Update existing
   → filesystem:edit_file {
       path: "src/App.tsx",
       edits: [{ oldText: "...", newText: "..." }]
     }

3. Verify
   → typescript-analyzer:get_diagnostics { path: "src/features/DarkMode.tsx" }
   → typescript-analyzer:get_diagnostics { path: "src/App.tsx" }

4. Save to memory
   → db_save_memory {
       entityName: "DarkModeFeature",
       entityType: "feature_implemented",
       observations: ["Added dark mode toggle", "Integrated with theme system"]
     }
```

---

## 🔍 Tool Discovery

### List All Tools
```typescript
// In code
const tools = mcpService.getToolsForGemini();
console.log(tools.map(t => t.name));
```

### Check Tool Availability
```typescript
// Tools are always available to both cloud and local models
// No special configuration needed
```

---

## 📚 Additional Resources

- **MCP Service**: `services/mcpService.ts`
- **File Service**: `services/fileService.ts`
- **Database Service**: `services/databaseService.ts`
- **Terminal Service**: `services/terminalService.ts`

---

**Status: ✅ All Tools Available to Local Models**

Local models have **full access** to all MCP tools with the same capabilities as cloud models!

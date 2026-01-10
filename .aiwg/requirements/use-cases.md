# Use Cases

**Project**: MCP-Hound Code Search Server
**Status**: Outlined (Inception)
**Last Updated**: 2026-01-03

## Overview

MCP-Hound exposes 3 MCP tools for code search. Each tool corresponds to a use case.

| Use Case | Tool | Priority | Complexity |
|----------|------|----------|------------|
| UC-01: Search Code | hound_search | High | Medium |
| UC-02: List Repositories | hound_repos | Medium | Low |
| UC-03: Get File Context | hound_file_context | Medium | Medium-High |

---

## UC-01: Search Code

**Tool**: `hound_search`
**Priority**: High (core functionality)
**Issue**: #3

### Description

Developer uses Claude Code to search for code patterns across all indexed repositories using regex queries.

### Actors

- **Primary**: Developer using Claude Code
- **Supporting**: Claude Code (AI agent), Hound API

### Preconditions

1. MCP-Hound server is running and configured in Claude Code
2. Hound server is available at configured URL
3. Repositories are indexed in Hound

### Flow

1. Developer asks Claude about code (natural language)
2. Claude synthesizes appropriate regex pattern
3. Claude invokes `hound_search` with regex query
4. MCP-Hound forwards query to Hound API
5. Hound returns matching files and lines
6. MCP-Hound transforms response (adds Gitea URLs)
7. Claude presents results to developer

### Input Schema (Zod)

```typescript
const HoundSearchInput = z.object({
  query: z.string()
    .describe("Regex pattern to search for"),
  repos: z.string().optional().default("*")
    .describe("Comma-separated repo names or '*' for all"),
  files: z.string().optional()
    .describe("File pattern filter (e.g., '*.ts', '*.py')"),
  ignore_case: z.boolean().optional().default(false)
    .describe("Case-insensitive search"),
  max_results: z.number().optional().default(10)
    .describe("Maximum results per repository")
});
```

### Output Format

```typescript
interface SearchOutput {
  total_matches: number;
  repos_searched: number;
  results: Array<{
    repo: string;      // "roctinam/matric"
    file: string;      // "src/auth/jwt.ts"
    line: number;      // 45
    content: string;   // "export function validateJWT(..."
    url: string;       // "https://git.integrolabs.net/.../jwt.ts#L45"
  }>;
}
```

### Postconditions

- Developer receives formatted search results
- Each result includes clickable Gitea URL
- Results respect max_results limit per repo

### Exception Flows

| Exception | Handling |
|-----------|----------|
| Hound unavailable | Return error: "Hound API unavailable at {url}" |
| Hound timeout | Return error: "Search timed out after {timeout}ms" |
| Invalid regex | Return error: "Invalid regex pattern: {details}" |
| No results | Return: `{ total_matches: 0, results: [] }` |

### Acceptance Criteria

- [ ] Search executes regex query against Hound API
- [ ] Results include repo, file, line, content, URL
- [ ] File pattern filter works correctly
- [ ] Case-insensitive flag works correctly
- [ ] max_results limits results per repository
- [ ] Empty results return gracefully (not error)
- [ ] Timeout returns clear error message
- [ ] Unit tests cover happy path and error cases (85% coverage)

---

## UC-02: List Repositories

**Tool**: `hound_repos`
**Priority**: Medium (discovery)
**Issue**: #4

### Description

Developer uses Claude Code to discover which repositories are indexed and searchable in Hound.

### Actors

- **Primary**: Developer using Claude Code
- **Supporting**: Claude Code (AI agent), Hound API

### Preconditions

1. MCP-Hound server is running and configured
2. Hound server is available

### Flow

1. Developer asks "What repos are searchable?"
2. Claude invokes `hound_repos`
3. MCP-Hound fetches repo list from Hound API
4. MCP-Hound transforms response (display names, Gitea URLs)
5. Claude presents repo list to developer

### Input Schema

No parameters required.

```typescript
const HoundReposInput = z.object({});
```

### Output Format

```typescript
interface ReposOutput {
  count: number;
  repos: Array<{
    name: string;     // "roctinam/matric" (display name)
    key: string;      // "roctinam-matric" (Hound key)
    vcs: string;      // "git"
    url: string;      // "https://git.integrolabs.net/roctinam/matric"
  }>;
}
```

### Postconditions

- Developer receives complete list of indexed repositories
- Each repo includes display name and Gitea URL

### Exception Flows

| Exception | Handling |
|-----------|----------|
| Hound unavailable | Return error: "Hound API unavailable" |
| Hound timeout | Return error: "Request timed out" |

### Acceptance Criteria

- [ ] Returns all indexed repositories
- [ ] Display names formatted correctly (owner/repo)
- [ ] Gitea URLs generated correctly
- [ ] VCS type included for each repo
- [ ] Empty repo list returns gracefully
- [ ] Unit tests cover happy path (90% coverage)

---

## UC-03: Get File Context

**Tool**: `hound_file_context`
**Priority**: Medium (enhancement)
**Issue**: #5

### Description

Developer uses Claude Code to retrieve extended context around a specific line in a file, typically after finding a search match.

### Actors

- **Primary**: Developer using Claude Code
- **Supporting**: Claude Code (AI agent), Gitea API (primary), Hound API (fallback)

### Preconditions

1. MCP-Hound server is running and configured
2. Gitea API is available (or Hound for fallback)
3. Repository and file exist

### Flow

1. Developer finds search match, wants more context
2. Claude invokes `hound_file_context` with repo, file, line
3. MCP-Hound fetches raw file from Gitea API
4. MCP-Hound extracts line range (line ± context)
5. MCP-Hound formats content with line numbers
6. Claude presents context to developer

### Input Schema

```typescript
const HoundFileContextInput = z.object({
  repo: z.string()
    .describe("Repository name (e.g., 'roctinam/matric')"),
  file: z.string()
    .describe("File path (e.g., 'src/auth/jwt.ts')"),
  line: z.number()
    .describe("Center line number"),
  context: z.number().optional().default(10)
    .describe("Lines of context before and after")
});
```

### Output Format

```typescript
interface FileContextOutput {
  repo: string;         // "roctinam/matric"
  file: string;         // "src/auth/jwt.ts"
  start_line: number;   // 35
  end_line: number;     // 55
  content: string;      // Formatted with line numbers
  url: string;          // "https://git.../jwt.ts#L35-L55"
}
```

**Content format** (with line numbers):
```
35  import { SignJWT, jwtVerify } from 'jose';
36
37  const JWT_SECRET = process.env.JWT_SECRET;
38
39  export async function validateJWT(token: string): Promise<boolean> {
40    try {
41      const { payload } = await jwtVerify(token, JWT_SECRET);
42      return payload.exp > Date.now() / 1000;
43    } catch {
44      return false;
45    }
46  }
```

### Postconditions

- Developer receives file content with surrounding context
- Line numbers are displayed
- Gitea URL links to exact line range

### Exception Flows

| Exception | Handling |
|-----------|----------|
| Gitea unavailable | Try Hound fallback, or return error |
| File not found | Return error: "File not found: {repo}/{file}" |
| Repo not found | Return error: "Repository not found: {repo}" |
| Line out of range | Adjust to file bounds, return partial context |
| Binary file | Return error: "Cannot display binary file" |

### Acceptance Criteria

- [ ] Fetches file content from Gitea API
- [ ] Extracts correct line range (line ± context)
- [ ] Formats output with line numbers
- [ ] Generates correct Gitea URL with line anchors
- [ ] Handles file start/end edge cases
- [ ] Returns clear error for missing files
- [ ] Returns clear error for binary files
- [ ] Falls back gracefully if Gitea unavailable
- [ ] Unit tests cover happy path and edge cases (85% coverage)

---

## Use Case Dependencies

```
UC-01: Search Code (standalone)
         ↓ (search results provide repo, file, line)
UC-03: Get File Context (uses search results)

UC-02: List Repositories (standalone, for discovery)
```

## Elaboration Needs

| Use Case | Elaboration Focus |
|----------|-------------------|
| UC-01 | Hound API response parsing, result limiting |
| UC-02 | Repo key to display name transformation |
| UC-03 | Gitea API spike (ADR-003), fallback strategy |

## References

- Issue #3: Implement hound_search MCP tool
- Issue #4: Implement hound_repos MCP tool
- Issue #5: Implement hound_file_context MCP tool
- ADR-002: Hound API Client Design
- ADR-003: File Context Strategy (spike required)

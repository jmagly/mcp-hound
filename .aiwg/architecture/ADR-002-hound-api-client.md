# ADR-002: Hound API Client Design

**Status**: Accepted
**Date**: 2026-01-03
**Deciders**: architect, lead developer
**Context**: Inception phase, API integration design

## Context

MCP-Hound needs to communicate with the Hound code search API to execute searches and retrieve repository information. The client design affects testability, error handling, and maintainability.

Hound API endpoints:
- `GET /api/v1/search?q=<regex>&repos=<list>&i=<case>&files=<pattern>`
- `GET /api/v1/repos` - List indexed repositories
- `GET /healthz` - Health check

## Decision

We will implement a **thin typed wrapper** around the Hound REST API with the following characteristics:

### Design Principles

1. **Regex passthrough**: Query parameter is regex, no NLP/AI translation
2. **Typed responses**: Full TypeScript interfaces for all API responses
3. **Configurable**: Base URL and timeout from environment variables
4. **Error handling**: Typed errors for timeout, network failure, API errors
5. **Testable**: Injectable HTTP client for mocking in tests

### HoundClient Interface

```typescript
interface HoundClientConfig {
  baseUrl: string;      // Default: http://localhost:6080
  timeout: number;      // Default: 30000ms
}

interface HoundClient {
  search(options: SearchOptions): Promise<SearchResponse>;
  listRepos(): Promise<ReposResponse>;
  healthCheck(): Promise<boolean>;
}

interface SearchOptions {
  query: string;        // Regex pattern (required)
  repos?: string;       // Comma-separated or "*" (default: "*")
  files?: string;       // File pattern filter
  ignoreCase?: boolean; // Case insensitive (default: false)
  maxResults?: number;  // Results per repo (default: 10)
}
```

### Response Transformation

Hound API returns nested structure. Client transforms to flat, usable format:

```typescript
// Hound raw response
interface HoundRawResponse {
  Results: {
    [repoKey: string]: {
      Matches: Array<{
        Filename: string;
        Matches: Array<{
          Line: number;
          Before: string[];
          Line: string;
          After: string[];
        }>;
      }>;
    };
  };
}

// Transformed response (what MCP tools receive)
interface SearchResult {
  totalMatches: number;
  reposSearched: number;
  results: Array<{
    repo: string;      // Display name: "roctinam/matric"
    file: string;      // Path: "src/auth/jwt.ts"
    line: number;      // Line number: 45
    content: string;   // Matched line content
    url: string;       // Gitea deep link
  }>;
}
```

### Error Handling

```typescript
class HoundError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'NETWORK' | 'API_ERROR' | 'PARSE_ERROR',
    public readonly statusCode?: number
  ) {
    super(message);
  }
}
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HOUND_URL` | `http://localhost:6080` | Hound server base URL |
| `HOUND_TIMEOUT` | `30000` | Request timeout in milliseconds |

## Alternatives Considered

### Option A: Direct fetch calls in tools

Each tool makes its own HTTP requests.

**Rejected because**:
- Code duplication across 3 tools
- Inconsistent error handling
- Harder to test (no central mock point)
- Harder to change base URL or add headers

### Option B: Full-featured HTTP client library (axios)

Use axios with interceptors, retries, etc.

**Rejected because**:
- Additional dependency
- Native fetch is sufficient for simple GET requests
- No need for interceptors or advanced features
- Keeps bundle size small

### Option C: NLP layer for query translation

Add LLM to translate natural language to regex.

**Rejected because**:
- Adds significant complexity
- Latency increase (LLM call before search)
- AI agents (Claude Code) already synthesize regex well
- Violates thin wrapper principle
- Cost (LLM API calls)

## Consequences

### Positive

- **Clean separation**: Tools don't know about HTTP details
- **Testable**: Mock HoundClient for unit tests
- **Type safe**: Catch response parsing errors at compile time
- **Consistent errors**: All tools handle errors the same way
- **Configurable**: Easy to point to different Hound instances

### Negative

- **Additional abstraction**: One more layer to maintain
- **Transform overhead**: Small performance cost for response transformation

### Risks

- **R2 (Hound API)**: Client handles with timeouts and typed errors

## Implementation Notes

1. **Repo key to name**: Hound uses keys like `roctinam-matric`, transform to `roctinam/matric`
2. **Gitea URL generation**: `https://git.integrolabs.net/{repo}/src/branch/main/{file}#L{line}`
3. **Result limiting**: Apply `maxResults` per repository, not globally
4. **Empty results**: Return `{ totalMatches: 0, results: [] }`, not error

## References

- Hound API documentation: https://github.com/hound-search/hound#api
- Issue #2: Implement Hound API client
- Test endpoint: `curl "http://localhost:6080/api/v1/search?q=test&repos=*"`

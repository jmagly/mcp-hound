# ADR-003: File Context Retrieval Strategy

**Status**: Proposed (requires spike in Elaboration)
**Date**: 2026-01-03
**Deciders**: architect, lead developer
**Context**: Inception phase, addressing Risk R3

## Context

The `hound_file_context` tool needs to retrieve extended context around a specific line in a file. This enables agents to understand code surrounding a search match without switching context.

**Challenge**: Hound API does not provide direct file content retrieval. The search endpoint returns matches with limited context (configurable `Before`/`After` lines), but not arbitrary file ranges.

**Options**:
1. Use Gitea API to fetch raw file content
2. Use Hound search with high context values
3. Hybrid approach

## Decision

**Proposed**: Primary Gitea API with Hound fallback.

### Primary: Gitea API Approach

Use Gitea's raw file API to fetch file content, then extract the requested line range.

```
GET /api/v1/repos/{owner}/{repo}/raw/{ref}/{filepath}
Authorization: token {GITEA_TOKEN}
```

**Implementation**:
1. Parse repo name → owner/repo (e.g., "roctinam/matric")
2. Fetch raw file from Gitea API (default branch: main)
3. Split content by lines
4. Extract lines [line - context, line + context]
5. Format with line numbers
6. Generate Gitea URL with line range anchor

**Pros**:
- Precise line range extraction
- Full file content available
- Works for any line, not just search matches
- Consistent formatting

**Cons**:
- External dependency (Gitea API)
- Requires authentication for private repos
- Additional latency (separate API call)

### Fallback: Hound Search with High Context

If Gitea API fails, fall back to Hound search targeting the specific file.

```
GET /api/v1/search?q=.&repos={repo}&files={filepath}&rng=:1
```

With high `-A` and `-B` context values in the search response.

**Limitations**:
- Requires a pattern that matches the target line
- Context is around match, not arbitrary line
- Less precise than Gitea approach

## GiteaClient Interface

```typescript
interface GiteaClientConfig {
  baseUrl: string;      // Default: https://git.integrolabs.net
  token?: string;       // From GITEA_TOKEN env var
  timeout: number;      // Default: 10000ms
}

interface GiteaClient {
  getRawFile(repo: string, filepath: string, ref?: string): Promise<string>;
}

interface FileContextResult {
  repo: string;
  file: string;
  startLine: number;
  endLine: number;
  content: string;      // Lines with line numbers
  url: string;          // Gitea URL with #L{start}-L{end}
}
```

## Alternatives Considered

### Option A: Hound-only (no Gitea dependency)

Use Hound search with a regex that matches near the target line.

**Rejected because**:
- Imprecise (can't target arbitrary line without match)
- Complex regex construction
- May miss target if line has unusual content

### Option B: Clone repository locally

Clone repo, read file from filesystem.

**Rejected because**:
- Massive complexity (git operations)
- Storage requirements
- Stale data (need to sync)
- Way overkill for context retrieval

### Option C: Gitea-only (no fallback)

Only use Gitea API, fail if unavailable.

**Reasonable alternative**:
- Simpler implementation
- May be sufficient (Gitea is reliable)
- Considered as MVP approach

## Spike Required

Before finalizing, spike during Elaboration to validate:

1. **Gitea API authentication**: Does token work for all indexed repos?
2. **Performance**: Latency for raw file fetch (target: <500ms)
3. **Large files**: How to handle files >1MB? (truncate, error, or stream)
4. **Binary files**: Detect and return appropriate error
5. **Branch handling**: Use default branch or allow specification?

**Spike deliverable**: `architecture/spike-file-context.md` with findings and final recommendation.

## Consequences

### If Gitea Approach Works

- **Positive**: Precise context, consistent behavior, works for any line
- **Negative**: Gitea dependency, token management
- **Risk R3**: Retired

### If Gitea Approach Fails

- **Fallback**: Hound search with high context (degraded precision)
- **Alternative**: Remove file_context tool from MVP, add in future iteration
- **Risk R3**: May increase to HIGH if no viable approach

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GITEA_URL` | `https://git.integrolabs.net` | Gitea server URL |
| `GITEA_TOKEN` | (none) | API token for private repos |
| `GITEA_TIMEOUT` | `10000` | Request timeout in milliseconds |

Token can also be read from `~/.config/gitea/token` if env var not set.

## References

- Risk R3: File Context Implementation (risk-list.md)
- Issue #5: Implement hound_file_context MCP tool
- Gitea API docs: https://docs.gitea.io/en-us/api-usage/
- Gitea raw file endpoint: `GET /api/v1/repos/{owner}/{repo}/raw/{ref}/{filepath}`

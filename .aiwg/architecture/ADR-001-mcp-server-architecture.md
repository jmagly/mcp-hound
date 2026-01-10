# ADR-001: MCP Server Architecture

**Status**: Accepted
**Date**: 2026-01-03
**Deciders**: architect, lead developer
**Context**: Inception phase, initial architecture decision

## Context

We need to design an MCP (Model Context Protocol) server that exposes Hound code search capabilities to Claude Code and other MCP-compatible AI agents. The server must implement 3 tools: `hound_search`, `hound_repos`, and `hound_file_context`.

Key constraints from intake:
- 4-6 week timeline (7 issues)
- 1-2 developers
- 5-10 internal users
- MVP profile with 60% test coverage target
- Quality priority (0.40 weight)

## Decision

We will implement a **simple stateless MCP server** using the official `@modelcontextprotocol/sdk` with stdio transport.

### Architecture Overview

```
Claude Code ──stdio──> MCP Server ──HTTP──> Hound API (:6080)
                           │
                           └──HTTP──> Gitea API (file context)
```

### Key Characteristics

1. **Stateless**: No database, no caching, no session state
2. **Single process**: Node.js MCP server, no workers or background jobs
3. **Thin wrapper**: Direct proxy to Hound API, no NLP/AI layer
4. **Stdio transport**: Standard MCP communication via stdin/stdout
5. **Synchronous**: Request-response only, no async operations

### Project Structure

```
mcp-hound/
├── src/
│   ├── index.ts           # MCP server entry, tool registration
│   ├── tools/
│   │   ├── search.ts      # hound_search implementation
│   │   ├── repos.ts       # hound_repos implementation
│   │   └── context.ts     # hound_file_context implementation
│   ├── clients/
│   │   ├── hound.ts       # Hound API client
│   │   └── gitea.ts       # Gitea API client
│   └── types.ts           # Shared TypeScript interfaces
├── package.json
├── tsconfig.json
└── dist/                  # Compiled output
```

### Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js 18+ | MCP SDK support, team familiarity |
| Language | TypeScript | Type safety, developer experience |
| MCP SDK | @modelcontextprotocol/sdk | Official SDK, protocol compliance |
| Validation | Zod | Schema validation, TypeScript integration |
| HTTP Client | Native fetch | Built-in, no dependencies |
| Testing | Vitest | Fast, TypeScript native, good DX |

## Alternatives Considered

### Option B: MCP Server with Caching Layer

Add in-memory LRU cache for search results (TTL 5 minutes).

**Rejected because**:
- Added complexity (cache invalidation, TTL tuning)
- +1 week timeline estimate
- Premature optimization for 5-10 users
- Can add later if performance issues arise

**Score**: 3.60/5.0 (vs 4.05 for Option A)

### Option C: Distributed MCP Server

Multiple instances, load balancer, Redis shared cache.

**Rejected because**:
- Over-engineered for 5-10 users
- 8-12 week timeline (vs 4-6 weeks)
- Infrastructure costs and operational overhead
- No current need for horizontal scaling

**Score**: 2.65/5.0

## Consequences

### Positive

- **Fast delivery**: Simple architecture enables 4-6 week timeline
- **Easy testing**: Stateless design simplifies unit and integration tests
- **Low operational overhead**: No infrastructure to manage
- **Clear failure modes**: Hound/Gitea down → clear error, no complex state issues
- **High coverage achievable**: Small codebase (<2k LoC) makes 60% coverage easy

### Negative

- **No caching**: Repeated queries always hit Hound API
- **No offline mode**: Requires Hound availability
- **Limited scale**: Single process, ~200 req/min capacity
- **No advanced features**: No semantic search, cross-repo tracing

### Risks

- **R1 (MCP Protocol)**: Mitigated by pinning SDK version, comprehensive testing
- **R2 (Hound API)**: Mitigated by timeouts, graceful error handling

## Compliance

- **Profile**: MVP ✓ (simple architecture, quick iteration)
- **Priority**: Quality 0.40 ✓ (testable, clear boundaries)
- **Timeline**: 4-6 weeks ✓ (minimal complexity)

## References

- Option Matrix analysis: `.aiwg/intake/option-matrix.md` (Step 5, Architectural Options)
- MCP Specification: https://modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk

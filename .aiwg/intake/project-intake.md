# Project Intake Form

**Document Type**: Production Release Preparation
**Generated**: 2026-01-03 (Updated: 2026-01-09)
**Source**: Gitea issues #1-7, itops issue #6, repository metadata, wiki documentation, current codebase state

## Metadata

- **Project name**: MCP-Hound Code Search Server
- **Requestor/owner**: roctinam/Engineering Team
- **Date**: 2026-01-03 (Updated: 2026-01-09 for public release)
- **Stakeholders**: Engineering (TypeScript/Node.js development), DevOps (Hound deployment integration), Developer Experience (Claude Code users), IT Operations (deployment and monitoring)

## System Overview

**Purpose**: Create an MCP (Model Context Protocol) server that exposes Hound code search capabilities to Claude Code and other MCP-compatible AI agents. This enables natural language code search queries directly from agent conversations across 48+ indexed repositories.

**Current Status**: **Transition Phase - Production Release Preparation** (v0.1.0 complete, all 7 issues implemented and tested, local+systemd deployment validated, preparing for public npm + DockerHub release within 1-2 weeks)

**Users**: Currently 5-10 internal developers (validated), expanding to **public npm/DockerHub users** (external community, open-source adoption)

**Tech Stack** (implemented):
- **Languages**: TypeScript/Node.js
- **Frontend**: N/A (MCP server, no UI)
- **Backend**: MCP server using `@modelcontextprotocol/sdk`, Hound REST API client
- **Database**: N/A (stateless server, queries Hound API)
- **Deployment**: npm package, local installation via npx or global install, integrates with Claude Code via settings.json
- **Integration**: Hound API (http://localhost:6080/api/v1/), Gitea API (for file context retrieval)

## Problem and Outcomes

**Problem Statement**: Developers need to search across 48+ indexed repositories to find code examples, understand implementations, and locate specific functions. Currently, this requires switching context from Claude Code to a separate Hound web interface or manual grep/file browsing. This context switching is inefficient and breaks the developer's AI-assisted workflow.

**Target Personas**:
- Primary: Software developers using Claude Code for AI pair programming, needing to search organizational codebase without leaving their conversation context
- Secondary: DevOps engineers exploring infrastructure-as-code across multiple repositories, security engineers auditing code patterns

**Success Metrics (KPIs)**:
- **User adoption**: 80% of Claude Code users (5-10 developers) using hound search tools within 2 weeks of deployment
- **Performance**: p95 search latency <2s (Hound API response + formatting), p95 file context retrieval <1s
- **Usability**: Average 3-5 search queries per developer per day, indicating regular integration into workflow
- **Technical**: All 48 indexed repositories searchable, 95%+ successful query completion rate

## Current Scope and Features

**Core Features** (✓ implemented and validated):
- **✓ hound_search**: Search code across all indexed repositories with regex patterns, file filters, case sensitivity options, configurable result limits (Issue #3 - complete)
- **✓ hound_repos**: List all 48+ indexed repositories to enable discovery of searchable code (Issue #4 - complete)
- **✓ hound_file_context**: Retrieve extended context (configurable lines before/after) around a code match, with Gitea/GitHub deep links to exact line ranges (Issue #5 - complete)
- **✓ Hound API client**: Typed TypeScript client for Hound REST API with error handling, timeouts, environment-based configuration (Issue #2 - complete)
- **✓ MCP server implementation**: Standards-compliant MCP server with proper tool registration, Zod schema validation, stdio + HTTP transports, OAuth2 authentication (Issue #1 - complete)
- **✓ Claude Code integration**: Configuration instructions and examples for settings.json, tested with local + systemd deployments (Issue #6 - complete)
- **✓ Testing**: Vitest test suite with coverage thresholds met, CI pipeline operational (Issue #7 - complete)
- **✓ Deployment options**: Docker Compose, systemd service, local npm install - all validated

**Remaining for Public Release** (current priorities, 1-2 week timeline):
- **✓ Local Gitea deployment testing**: npm package publishing to internal Gitea registry, Docker image building from Gitea sources (validated)
- **→ Public npm testing**: Validate npm package publishing to public npm registry (npmjs.com) with proper scoping (@jmagly/mcp-hound)
- **→ Public Docker testing**: Validate Docker image publishing to DockerHub (jmagly/mcp-hound) with multi-arch builds
- **→ GitHub mirror setup**: Add GPG commit signing keys, push codebase to github.com/jmagly/mcp-hound for public visibility
- **→ Public documentation review**: Ensure README, CONTRIBUTING.md, and examples work for external users (not just internal team)
- **→ Release automation**: Test full CI/CD pipeline for tagged releases (version bumps, changelog, GitHub releases)

**Out-of-Scope** (deferred post-v1.0 release):
- **Advanced search features**: AST-based semantic search, cross-file reference tracing, dependency graphs (v2.0+ features)
- **Write operations**: Code modification, commit creation, PR generation (read-only focus maintained)
- **Caching layer**: Direct proxy to Hound API, no result caching (defer until performance data indicates need)
- **MCP Resources**: Exposing repos as browsable resources (hound://repos/...) - optional enhancement

**Future Considerations** (post-v1.0 public release):
- **Community adoption metrics**: Track npm downloads, GitHub stars, issue/PR activity to measure external adoption
- **Performance optimizations**: Result caching, connection pooling if usage patterns indicate need (monitor post-release)
- **Enhanced integrations**: Gitea webhook for real-time index updates (auto-indexing feature already implemented)
- **Analytics**: Optional telemetry for usage patterns (privacy-respecting, opt-in only)
- **Multi-instance support**: Configure multiple Hound servers for different codebases (enterprise feature)

## Architecture (Implemented)

**Architecture Style**: Simple monolith (single-process MCP server, stateless, thin API wrapper)

**Chosen**: Simple monolith - **Rationale**: Small team (1-2 developers), validated with 5-10 internal users, stateless operation (no data persistence), rapid delivery (completed in planned 4-6 weeks), standard MCP server pattern proven effective

**Components** (implemented and tested):
- **MCP Server (index.ts)**: MCP protocol handler, tool registration, stdin/stdout communication with Claude Code
  - Technology: `@modelcontextprotocol/sdk`, Node.js stdio transport
  - Rationale: Official SDK ensures protocol compliance, stdio is standard for MCP servers
- **Hound API Client (hound-client.ts)**: HTTP client for Hound REST API (/api/v1/search, /api/v1/repos)
  - Technology: Native Node.js fetch or axios, TypeScript interfaces
  - Rationale: Lightweight HTTP client, typed responses for developer experience
- **Gitea API Client (gitea-client.ts)**: HTTP client for raw file retrieval (for file_context tool)
  - Technology: Native Node.js fetch, Gitea API token from environment
  - Rationale: Hound doesn't provide file content API, Gitea has comprehensive REST API
- **Tool Implementations (tools/)**: Three MCP tools with Zod input schemas, formatted output
  - search.ts: Query transformation, result formatting, Gitea URL generation
  - repos.ts: Repository list transformation, display name extraction
  - context.ts: File retrieval, line range extraction, line number formatting
  - Rationale: Separation of concerns, testable units, clear responsibility boundaries

**Data Models** (estimated):
- **SearchRequest**: { query: string, repos?: string, files?: string, ignore_case?: boolean, max_results?: number }
- **SearchResult**: { total_matches: number, repos_searched: number, results: SearchMatch[] }
- **SearchMatch**: { repo: string, file: string, line: number, content: string, url: string }
- **RepoInfo**: { name: string, key: string, vcs: string, url: string }
- **FileContext**: { repo: string, file: string, start_line: number, end_line: number, content: string, url: string }

**Integration Points**:
- **Hound API (http://localhost:6080/api/v1/)**: Primary data source, search and repo list endpoints
  - Authentication: None (local trusted network)
  - Rate limits: None (internal deployment)
- **Gitea API (https://git.integrolabs.net/api/v1/)**: Raw file content retrieval for file_context tool
  - Authentication: Token from ~/.config/gitea/token (environment variable)
  - Rate limits: Standard Gitea limits (generous for internal use)
- **Claude Code**: Consumer of MCP server, configured via ~/.claude/settings.json
  - Communication: stdio (stdin/stdout), JSON-RPC 2.0 (MCP protocol)

## Scale and Performance (Target)

**Target Capacity**:
- **✓ Current users**: 5-10 internal developers using Claude Code (validated, positive feedback)
- **6-month projection**: 15-20 internal developers + **unknown external npm users** (public release in 1-2 weeks)
- **2-year vision**: Community-driven open source project, 100+ external users if adoption succeeds, potential commercial support offering

**Performance Targets** (validated in production):
- **✓ Latency**: p95 <2s for search achieved (Hound API <500ms, formatting <1s), p95 <1s for file context achieved
- **✓ Throughput**: 10-20 requests/minute per developer validated, server handles concurrent users without degradation
- **Availability**: 99% uptime for internal deployment (validated with systemd service), public users responsible for their own Hound infrastructure

**Performance Strategy**:
- **Caching**: None initially (stateless, defer until performance issues identified)
- **Database**: N/A (stateless API proxy)
- **CDN**: N/A (local network, no static assets)
- **Background Jobs**: N/A (synchronous request-response only)
- **Timeouts**: Configurable via HOUND_TIMEOUT environment variable (default 30s), fail fast for unresponsive Hound API

## Security and Compliance (Requirements)

**Security Posture**: **Upgrading from Minimal to Baseline** (public release requires enhanced security)

**Previous (Internal)**: Minimal - Internal-only deployment, no sensitive data (code is already accessible to all developers), local network isolation, Hound has no authentication

**Current (Public Release)**: Baseline - Public npm package, external users, need authentication for HTTP mode (OAuth2 implemented), secrets management (environment variables), SBOM for dependency transparency

**Data Classification**: Internal (company code, not for external sharing, but accessible to all authenticated developers)

**Identified**: Internal - **Evidence**: Code search across organizational repositories, no PII/PHI/payment data, developers already have git access to all indexed repos

**Security Controls** (implemented for public release):
- **Authentication**:
  - stdio mode (local): No auth needed (inherits Claude Code user context)
  - HTTP mode (remote): OAuth2 with PKCE, dynamic client registration (RFC 7591), refresh tokens
- **Authorization**:
  - Network-based for internal (Hound on localhost)
  - Token-based for HTTP mode (OAuth2 bearer tokens)
  - User-managed credentials (Gitea/GitHub API tokens from environment)
- **Data Protection**:
  - TLS in transit for all external APIs (Gitea/GitHub HTTPS)
  - Hound HTTP is localhost-only (local deployments)
  - Nginx reverse proxy with SSL for remote HTTP deployments
- **Secrets Management**:
  - Environment variables for API tokens (GITEA_TOKEN, GITHUB_TOKEN)
  - User credential files (~/.config/gitea/token) for local deployments
  - MCP_CREDENTIALS_FILE for OAuth2 client storage (HTTP mode)
- **Supply Chain**:
  - GPG commit signing (planned for GitHub mirror)
  - npm package integrity (SHA512 checksums)
  - Docker image signing (planned for DockerHub)
  - Dependency scanning (npm audit in CI)

**Compliance Requirements**: None (internal tool, no regulated data, no external users)

## Team and Operations (Planned)

**Team Size**: Small team (1-2 developers, full-stack TypeScript experience)

**Team Skills**:
- **Frontend**: N/A (no UI)
- **Backend**: TypeScript, Node.js, REST API integration, MCP protocol
- **DevOps**: npm packaging, local installation, basic troubleshooting
- **Database**: N/A

**Development Velocity** (target):
- **Sprint length**: 1 week iterations (rapid development, small scope)
- **Release frequency**: Continuous for MVP (4-6 weeks), monthly updates post-launch

**Process Maturity** (achieved):
- **✓ Version Control**: Git with feature branches (Gitea: https://git.integrolabs.net/roctinam/mcp-hound), preparing GitHub mirror with GPG signing
- **✓ Code Review**: PR-based workflow implemented, code quality maintained
- **✓ Testing**: 60%+ coverage achieved (unit tests for tools, integration tests for API clients, CI validates on every commit)
- **✓ CI/CD**: Gitea Actions operational - lint, type check, test, build, Docker publish (internal), npm publish (internal)
- **→ Public CI/CD**: Need to add GitHub Actions for public npm + DockerHub publishing on tagged releases
- **✓ Documentation**: README comprehensive, CONTRIBUTING.md for external contributors, examples/, deploy/ with systemd configs

**Operational Support** (implemented):
- **✓ Monitoring**: Structured JSON logging to stdout/stderr (validated in systemd deployment)
- **✓ Logging**: Error tracking, search query patterns, API failure diagnostics implemented
- **Alerting**: None for public users (self-service, GitHub issues for bug reports), internal deployment monitored via systemd journal
- **On-call**: None (open-source project, community-driven support via GitHub issues/discussions)
- **Public support**: GitHub Issues for bug reports, GitHub Discussions for questions, CONTRIBUTING.md for contributor guidance

## Dependencies and Infrastructure

**Third-Party Services** (proposed):
- **Hound Code Search**: Primary dependency (http://localhost:6080), already deployed (itops #5, closed)
- **Gitea**: File content retrieval (https://git.integrolabs.net/api/v1/), organizational git hosting
- **MCP SDK**: `@modelcontextprotocol/sdk` (npm package, official Anthropic SDK)
- **Validation**: `zod` (npm package, schema validation for tool inputs)

**Infrastructure** (proposed):
- **Hosting**: Local developer machines (npm package installed via npx or global install)
- **Deployment**: npm package distribution, installation instructions in README
- **Database**: N/A (stateless)
- **Caching**: N/A
- **Message Queue**: N/A

## Known Risks and Uncertainties

**Technical Risks**:
- **Hound API stability**: Hound service outages or slow responses will directly impact MCP server
  - Likelihood: Low (stable deployment, internal network)
  - Impact: Medium (search unavailable, users fall back to manual search)
  - Mitigation: Timeout configuration (30s default), clear error messages, encourage Hound monitoring
- **File context API dependency**: Gitea API required for file_context tool, adds external dependency
  - Likelihood: Low (Gitea is organizational standard)
  - Impact: Medium (file_context tool fails, users can still search)
  - Mitigation: Graceful degradation (tool fails with clear message), consider fallback to Hound search with high context)
- **MCP protocol evolution**: MCP spec is relatively new, breaking changes possible
  - Likelihood: Medium (active development)
  - Impact: High (server incompatible with Claude Code)
  - Mitigation: Pin SDK version, monitor MCP changelog, test updates before deployment

**Integration Risks**:
- **Claude Code configuration complexity**: Users may struggle with settings.json configuration
  - Likelihood: Medium (manual configuration required)
  - Impact: Low (documentation and examples mitigate)
  - Mitigation: Clear README instructions, copy-paste examples, troubleshooting guide

**Timeline Risks**:
- **Scope creep from additional tool requests**: Users may request features beyond 3 core tools
  - Likelihood: Medium (developers are creative)
  - Impact: Low (can defer to future iterations)
  - Mitigation: Clear MVP scope, "Future Considerations" section in docs, issue tracking for feature requests

**Team Risks**:
- **Single developer (bus factor)**: If solo developer, project knowledge concentrated
  - Likelihood: High (small team)
  - Impact: Medium (maintenance risk)
  - Mitigation: Comprehensive documentation (README, wiki, code comments), clear architecture

## Why This Intake Update Now?

**Context**: **Transition phase complete** for internal v0.1.0 release, all 7 issues implemented and validated with 5-10 internal users, local + systemd deployments tested successfully. Now preparing for **public v1.0 release** to npm and DockerHub within 1-2 weeks.

**Current Goals**:
- **Validate deployment processes**: Test npm publish to public registry, Docker publish to DockerHub, ensure multi-arch builds work
- **Prepare for external users**: GPG commit signing, GitHub mirror setup, public documentation review
- **Establish public presence**: README polish for external audience, CONTRIBUTING.md guidance, GitHub Issues/Discussions setup
- **Release automation**: GitHub Actions workflow for tagged releases (v1.0.0), automated CHANGELOG generation, release notes

**Triggers**:
- Internal validation complete (5-10 users, positive feedback, no critical bugs)
- Management decision to open-source (community adoption, ecosystem contribution)
- Timeline pressure (1-2 week target for public release)
- Technical readiness (code quality high, documentation comprehensive, testing thorough)

## Attachments

- Solution profile: `.aiwg/intake/solution-profile.md`
- Option matrix: `.aiwg/intake/option-matrix.md`
- Gitea issues: https://git.integrolabs.net/roctinam/mcp-hound/issues
- Gitea wiki: https://git.integrolabs.net/roctinam/mcp-hound/wiki
- Parent issue: https://git.integrolabs.net/roctinam/itops/issues/6

## Next Steps (Public Release Checklist - 1-2 Week Timeline)

**Phase: Transition → Production (Public Release)**

### Week 1: Deployment Validation & GitHub Setup

1. **✓ DONE: Internal deployment tested** (local npm, systemd service working)
2. **→ TODO: Test public npm publishing**:
   - Validate `npm publish --access public` to npmjs.com works
   - Ensure @jmagly scope is properly configured
   - Test installation via `npm install -g @jmagly/mcp-hound`
3. **→ TODO: Test Docker publishing**:
   - Validate DockerHub publishing workflow
   - Multi-arch builds (linux/amd64, linux/arm64)
   - Test pull from `docker pull jmagly/mcp-hound:latest`
4. **→ TODO: GitHub mirror setup**:
   - Create github.com/jmagly/mcp-hound repository
   - Add GPG signing keys for commit verification
   - Push codebase with signed commits
   - Configure GitHub Actions for CI/CD

### Week 2: Public Release & Launch

5. **→ TODO: Final documentation review**:
   - README clarity for external users (not just internal team)
   - CONTRIBUTING.md completeness (how to contribute, code standards)
   - Examples validation (do they work for fresh install?)
6. **→ TODO: Release automation**:
   - GitHub Actions workflow for tagged releases
   - Automated CHANGELOG generation (conventional commits)
   - Release notes template
7. **→ TODO: v1.0.0 release**:
   - Tag v1.0.0 in git
   - Trigger CI/CD pipeline (npm + Docker publish)
   - Create GitHub release with changelog
   - Announce on relevant channels (Twitter/X, Reddit r/ClaudeAI, Hacker News)

### Post-Release Monitoring

8. **Monitor adoption metrics**: npm downloads, GitHub stars, issue activity
9. **Respond to issues**: Triage bugs, answer questions via GitHub Issues/Discussions
10. **Iterate based on feedback**: Prioritize features/fixes based on community needs

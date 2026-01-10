# Solution Profile

**Document Type**: Production Release Profile
**Generated**: 2026-01-03 (Updated: 2026-01-09 for public release)

## Profile Selection

**Profile**: **Production** (upgraded from MVP for public release)

**Selection Logic** (automated based on inputs):
- **Prototype**: Timeline <4 weeks, no external users, experimental/learning, high uncertainty
- **MVP**: Timeline 1-3 months, initial users (internal or limited beta), proving viability
- **Production**: Timeline 3-6 months, established users, revenue-generating or critical operations
- **Enterprise**: Compliance requirements (HIPAA/SOC2/PCI-DSS), >10k users, mission-critical, contracts/SLAs

**Previous**: MVP (internal v0.1.0) - 4-6 week development, 5-10 internal users, proving viability

**Current**: **Production** (public v1.0.0) - **Rationale for Upgrade**:
- **✓ Internal validation complete**: 5-10 developers using successfully, positive feedback, MCP integration proven
- **→ Public release imminent**: npm + DockerHub publication within 1-2 weeks, external community users
- **→ Code quality high**: 60%+ test coverage achieved, comprehensive documentation, OAuth2 authentication implemented
- **→ Deployment validated**: Local npm, systemd service, Docker Compose all tested and working
- **→ Support model changing**: GitHub Issues/Discussions for community support, need production-grade quality

## Profile Characteristics

### Security

**Posture**: **Baseline** (upgraded from Minimal for public release)

**Profile Defaults**:
- **Prototype/MVP**: Baseline (user auth, environment secrets, HTTPS, basic logging)
- **Production**: Strong (threat model, SAST/DAST, secrets manager, audit logs, incident response)
- **Enterprise**: Enterprise (full SDL, penetration testing, compliance controls, SOC2/ISO27001, IR playbooks)

**Previous**: Minimal (internal v0.1.0) - No auth needed, local network isolation sufficient

**Current**: **Baseline** (public v1.0.0) - **Rationale for Upgrade**:
- **Public users**: External npm/Docker users need authentication for HTTP mode (OAuth2 implemented)
- **Supply chain security**: GPG commit signing, npm package integrity (SHA512), Docker image signing planned
- **Dependency transparency**: npm audit in CI, SBOM generation for vulnerability tracking
- **Secrets management**: Environment variables + credential files for user tokens
- **Still lightweight**: stdio mode remains auth-free (local use), only HTTP mode requires OAuth2

**Controls Included** (Baseline for Production):
- **Authentication**:
  - ✓ stdio mode: No auth (inherits Claude Code context, local use only)
  - ✓ HTTP mode: OAuth2 with PKCE, dynamic client registration (RFC 7591), refresh tokens
- **Authorization**:
  - ✓ Network-based for local deployments (Hound localhost-only)
  - ✓ Token-based for HTTP mode (OAuth2 bearer tokens, RFC 6749)
  - ✓ User-managed API tokens (GITEA_TOKEN, GITHUB_TOKEN from environment)
- **Data Protection**:
  - ✓ TLS in transit for all external APIs (Gitea/GitHub HTTPS)
  - ✓ Nginx reverse proxy with SSL for HTTP mode deployments
  - ✓ No PII stored (stateless design)
- **Secrets Management**:
  - ✓ Environment variables (MCP standard: ~/.claude/settings.json, Docker env)
  - ✓ User credential files (~/.config/gitea/token, standard practice)
  - ✓ MCP_CREDENTIALS_FILE for OAuth2 client storage (HTTP mode)
- **Supply Chain**:
  - → GPG commit signing (planned for GitHub mirror, 1-2 week timeline)
  - ✓ npm package integrity (SHA512 checksums automatic)
  - → Docker image signing (planned for DockerHub publication)
  - ✓ Dependency scanning (npm audit in Gitea Actions CI)
- **Audit Logging**: Structured JSON logs (search queries, API errors, auth events) for debugging and security monitoring

**Gaps/Additions**: MVP profile typically includes Baseline security, but reduced to Minimal due to:
- Internal tool (no external attack surface)
- No PII or sensitive data (code repositories)
- Developers already authenticated via Claude Code and git credentials
- Network isolation (Hound localhost-only)
- If published to npm for external use, revisit to add: authentication mechanism, rate limiting, input validation hardening

### Reliability

**Targets**: Based on MVP profile and non-critical internal tool

**Profile Defaults**:
- **Prototype**: 95% uptime, best-effort, no SLA
- **MVP**: 99% uptime, p95 latency <1s, business hours support
- **Production**: 99.9% uptime, p95 latency <500ms, 24/7 monitoring, runbooks
- **Enterprise**: 99.99% uptime, p95 latency <200ms, 24/7 on-call, disaster recovery

**Previous**: MVP (99% uptime, p95 <2s search, <5% error rate)

**Current**: **Production Targets** (for public release):
- **Availability**: **99.5% uptime** (higher than MVP 99%, but not mission-critical 99.9%)
  - Rationale: Public users expect reliability, but Hound dependency limits guarantees (users run their own Hound)
  - ✓ Validated with systemd deployment (auto-restart on failure)
- **Latency**: **✓ p95 <2s for search, ✓ p95 <1s for file context** (targets met in production use)
  - Rationale: Conversational search workflow, latency acceptable to internal users, no complaints
- **Error Rate**: **✓ <3%** (improved from MVP <5% target through better error handling)
  - Rationale: Graceful degradation implemented, clear error messages guide users to fixes

**Monitoring Strategy**:
- **Prototype**: Basic logging (stdout), no metrics
- **MVP**: Structured logs + basic metrics (request count, latency, errors)
- **Production**: APM (Datadog/New Relic), distributed tracing, dashboards, alerts
- **Enterprise**: Full observability (metrics, logs, traces), SLO tracking, automated remediation

**Current**: **Production Monitoring** (structured logs + optional metrics):
- **✓ Logs**: Structured JSON format implemented (timestamp, level, message, context)
  - Search queries: { query, repos, files, result_count, duration_ms }
  - API errors: { api: "hound"|"gitea"|"github", endpoint, status_code, error_message }
  - Auth events: { event: "token_issued"|"token_refreshed", client_id, timestamp }
  - Tool invocations: { tool, params, success, duration_ms }
- **Metrics**: None currently (sufficient for current scale, defer Prometheus until needed)
- **Dashboards**: None (users monitor their own deployments, systemd journal for internal use)
- **Alerts**: None for public users (self-service model, GitHub Issues for bug reports)
- **Health Endpoint**: /health (HTTP mode) for uptime monitoring

### Testing & Quality

**Coverage Targets**: Based on MVP profile, small team, 4-6 week timeline

**Profile Defaults**:
- **Prototype**: 0-30% (manual testing OK, fast iteration priority)
- **MVP**: 30-60% (critical paths covered, some integration tests)
- **Production**: 60-80% (comprehensive unit + integration, some e2e)
- **Enterprise**: 80-95% (comprehensive coverage, full e2e, performance/load testing)

**Previous**: 60% target (MVP upper bound)

**Current**: **✓ 60%+ achieved** (Production validated) - **Status**:
- ✓ Vitest coverage thresholds met (60% minimum enforced in CI)
- ✓ Per-component targets from Issue #7 achieved (HoundClient 90%, tools 85-90%)
- ✓ CI pipeline enforces coverage on every commit (prevents regressions)
- Small codebase (actual: ~2k LoC) makes comprehensive testing maintainable

**Test Types** (implemented and validated):
- **✓ Unit**: Vitest for all components (search.ts, repos.ts, context.ts, HoundClient, GiteaClient, auth.ts)
  - ✓ Coverage targets achieved: HoundClient 90%+, tools 85-90%+, overall 60%+
  - ✓ Mock API responses for deterministic testing
- **✓ Integration**: API client integration tests (verify HTTP requests, response parsing, error handling)
  - ✓ Hound API client tested against mock /api/v1/search, /api/v1/repos
  - ✓ Gitea/GitHub API clients tested against mock raw file endpoints
  - ✓ OAuth2 flow tested with mock authorization server
- **✓ E2E**: Manual testing with Claude Code completed
  - ✓ MCP protocol compliance verified (stdio + HTTP transports)
  - ✓ Tool discoverability tested (all 3 tools appear in Claude Code)
  - ✓ Result formatting validated with real searches
  - ✓ systemd deployment tested (auto-restart, journal logging)
- **Performance**: None currently (no scale issues identified, defer until needed)
- **✓ Security**: Dependency scanning (npm audit in CI pipeline)

**Quality Gates**:
- **Prototype**: None (manual review only)
- **MVP**: Linting, unit tests pass (CI required)
- **Production**: Linting, tests pass, coverage threshold, security scan, code review required
- **Enterprise**: All Production gates + penetration testing, compliance scan, performance benchmarks

**Current**: **Production Gates** (enforced in CI):
1. **✓ Lint**: ESLint with TypeScript rules (zero errors required for merge)
2. **✓ Type check**: tsc --noEmit (zero type errors required)
3. **✓ Unit tests**: Vitest (100% tests passing required, no flaky tests)
4. **✓ Coverage**: Vitest coverage thresholds (60% minimum enforced, blocks merge if below)
5. **✓ Build**: tsc (successful compilation to dist/ required)
6. **✓ CI platform**: Gitea Actions (runs on every push, PR required for main)
7. **→ PUBLIC CI**: GitHub Actions (planned for npm + DockerHub publishing on tags)

### Process Rigor

**SDLC Adoption**: Based on small team (1-2 developers) and MVP profile

**Profile Defaults**:
- **Prototype**: Minimal (README, ad-hoc, trunk-based)
- **MVP**: Moderate (user stories, basic architecture docs, feature branches, PRs for review)
- **Production**: Full (requirements docs, SAD, ADRs, test plans, runbooks, traceability)
- **Enterprise**: Enterprise (full artifact suite, compliance evidence, change control, audit trails)

**Chosen**: Moderate (MVP standard) - **Rationale**: Small team (1-2 developers) benefits from lightweight process. Issues #1-7 provide clear user stories. Wiki contains architecture, API reference, configuration, and development guide (comprehensive documentation for MVP). Feature branches with PRs for code review (if 2 developers, solo developer uses lightweight review).

**Key Artifacts** (required for MVP):
- **README**: Installation, configuration (Claude Code settings.json), tool reference, examples (Issue #6)
- **User stories**: Gitea issues #1-7 (clear acceptance criteria, task breakdowns)
- **Architecture documentation**: Wiki pages (Architecture, API Reference, Configuration, Development)
- **Test strategy**: Issue #7 (coverage targets, test types, CI pipeline)
- **Runbook**: Basic troubleshooting (README section: common errors, log review, dependency checks)

**Tailoring Notes**:
- **Skipped artifacts**: No formal requirements document (issues serve as user stories), no SAD (wiki Architecture page sufficient for small scope), no ADRs (architecture decisions documented in wiki and issue comments)
- **If team expands**: Add ADRs for significant decisions (e.g., caching strategy, authentication layer), formalize test plan document
- **If published to npm**: Add CHANGELOG.md (semantic versioning), CONTRIBUTING.md (external contributor guide), security policy (responsible disclosure)

## Improvement Roadmap

**✓ Phase 1 COMPLETE (Internal v0.1.0)**:
1. **✓ TypeScript project initialized**: npm, tsconfig, MCP SDK, Zod, ESLint all configured
2. **✓ Hound API client implemented**: HoundClient with search/repos/health methods
3. **✓ Core MCP tools implemented**: hound_search, hound_repos, hound_file_context with Zod schemas
4. **✓ Testing complete**: Unit tests (60%+ coverage), integration tests, CI pipeline operational
5. **✓ Documentation complete**: README, CONTRIBUTING.md, examples/, deploy/ configs

**✓ Phase 2 COMPLETE (Internal Validation)**:
1. **✓ Testing complete**: 60%+ coverage achieved, integration tests, coverage enforced in CI
2. **✓ Documentation complete**: Examples/, CHANGELOG.md, LICENSE (MIT), troubleshooting in README
3. **✓ User acceptance**: 5-10 internal developers tested, positive feedback, bugs fixed
4. **✓ Performance validated**: Latency targets met (p95 <2s search, <1s context), no complaints
5. **✓ Deployment validated**: Local npm install, systemd service, Docker Compose all working

**→ Phase 3 IN PROGRESS (Public Release - 1-2 Weeks)**:
**Immediate Actions for v1.0.0 Public Release**:
1. **→ Test public npm publishing**: Validate `npm publish` to npmjs.com, ensure @jmagly scope works
2. **→ Test Docker publishing**: Validate DockerHub publishing, multi-arch builds (amd64, arm64)
3. **→ GitHub mirror setup**: Create github.com/jmagly/mcp-hound, add GPG signing keys
4. **→ GitHub Actions CI/CD**: Add workflow for tagged releases (npm + Docker publish automation)
5. **→ Final documentation polish**: README review for external audience, ensure examples work fresh
6. **→ v1.0.0 release**: Tag, publish, announce (Twitter/X, Reddit, Hacker News)

**Phase 4 (Post-Release - 6-12 Months)**:
**Post-v1.0 Growth & Community Building**:
- **Monitor adoption**: Track npm downloads, GitHub stars, issue activity, user feedback
- **Community support**: Respond to GitHub Issues/Discussions, merge external PRs, maintain CHANGELOG
- **Performance monitoring**: If users report issues, add caching (in-memory LRU) or metrics (Prometheus)
- **Feature requests**: Prioritize based on community demand (MCP Resources, advanced search, multi-Hound support)

**Potential Enterprise Upgrade Triggers** (if commercial demand):
- >100 active external users (npm downloads trending upward)
- Enterprise inquiries for commercial support/SLA
- Revenue opportunity (consulting, hosted service, premium features)
- Mission-critical adoption (users depend on it for production workflows)

**Enterprise Features** (if triggers met):
- **Security**: Rate limiting, input validation hardening (regex DoS prevention)
- **Reliability**: 99.9% uptime SLA, monitoring dashboard, runbooks
- **Testing**: Increase to 80% coverage, automated e2e tests, load testing
- **Support**: Commercial support offering, SLA guarantees, priority bug fixes

## Overrides and Customizations

**Security Overrides**:
- **Deviation**: Minimal instead of Baseline (typical for MVP)
- **Rationale**: Internal-only tool, no PII, network-isolated Hound service, developers already authenticated
- **Revisit Trigger**: If published to npm (external users), add Baseline security (authentication, rate limiting, input validation)

**Reliability Overrides**:
- **Deviation**: p95 <2s instead of <1s (MVP typical target)
- **Rationale**: Conversational search workflow (not interactive UI), Hound API latency variable (depends on query complexity), formatting overhead acceptable
- **Revisit Trigger**: If user feedback indicates latency issues, add caching or optimize formatting

**Testing Overrides**:
- **Deviation**: 60% target instead of 30-60% range (aiming for upper bound)
- **Rationale**: Issue #7 explicitly targets high coverage (85-90% per component), small codebase makes high coverage achievable, MCP tools are critical integration points
- **Revisit Trigger**: If timeline pressure increases, reduce to 40% (critical paths only)

**Process Overrides**:
- **Deviation**: None (standard MVP moderate rigor)
- **Rationale**: Small team, clear scope, comprehensive wiki documentation, issues provide user stories

## Key Decisions

**Decision #1: Profile Selection**
- **Chosen**: MVP
- **Alternative Considered**: Prototype (faster timeline, lower quality bar)
- **Rationale**: 4-6 week timeline fits MVP (Prototype <4 weeks), 7 well-defined issues indicate structured approach (not experimental), internal user validation phase (not pure prototype), comprehensive testing planned (Issue #7 targets 60%+ coverage, exceeds Prototype expectations)
- **Revisit Trigger**: If external publication planned (npm), upgrade to Production profile (authentication, monitoring, 80% coverage)

**Decision #2: Security Posture**
- **Chosen**: Minimal
- **Alternative Considered**: Baseline (typical MVP default with auth + secrets management)
- **Rationale**: Internal tool (no external attack surface), no PII (organizational code repositories), network isolation (Hound localhost-only), developers already authenticated (Claude Code + git credentials), Gitea token is standard user credential
- **Revisit Trigger**: External publication (npm) → add authentication, rate limiting; if sensitive repos indexed → add authorization layer

**Decision #3: Test Coverage Target**
- **Chosen**: 60% (upper end of MVP range, per-component targets 85-90% from Issue #7)
- **Alternative Considered**: 30% (lower MVP bound, faster delivery)
- **Rationale**: Issue #7 explicitly plans comprehensive testing, small codebase (<2k LoC estimated) makes high coverage achievable, MCP tools are critical integration points (breaking changes disrupt all users), strong quality culture indicated by CI pipeline (lint + type + test + coverage)
- **Revisit Trigger**: If timeline pressure increases (scope creep, blockers) → reduce to 40% (critical paths only), if external publication → increase to 80% (Production standard)

## Next Steps

1. Review profile selection and customizations
2. Validate that security/reliability/testing targets align with priorities from `option-matrix.md`
3. Ensure process rigor matches team size and coordination needs
4. Start Inception with profile-appropriate templates and agents
5. Revisit profile selection at phase transitions (Inception → Elaboration → Construction → Transition)

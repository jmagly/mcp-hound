# Risk Register

**Project**: MCP-Hound Code Search Server
**Baselined**: 2026-01-03 (Inception)
**Last Updated**: 2026-01-03

## Risk Summary

| ID | Risk | Probability | Impact | Score | Status | Owner |
|----|------|-------------|--------|-------|--------|-------|
| R1 | MCP Protocol Compliance | Medium | High | 6 | Mitigating | architect |
| R2 | Hound API Stability | Low | Medium | 3 | Monitoring | devops-engineer |
| R3 | File Context Implementation | Medium | Medium | 4 | Identified | architect |
| R4 | User Adoption | Low | Low | 2 | Accepted | developer-experience |

**Score**: Probability (1-3) × Impact (1-3), where 3 = High

---

## Risk Details

### R1: MCP Protocol Compliance

**Category**: Technical
**Probability**: Medium (2)
**Impact**: High (3)
**Score**: 6

**Description**: MCP specification is relatively new and actively evolving. Breaking changes in the protocol or SDK could cause incompatibility with Claude Code. Incorrect tool registration or schema validation could prevent tools from being discovered or invoked.

**Consequences**:
- MCP server fails to register with Claude Code
- Tools not discoverable or invocations fail
- SDK upgrade breaks existing functionality
- Users unable to use code search features

**Mitigation Strategies**:
1. **Pin SDK version** - Lock `@modelcontextprotocol/sdk` to specific version in package.json
2. **Follow official examples** - Use SDK documentation and example servers as reference
3. **Comprehensive testing** - 85-90% coverage on tool implementations, verify MCP protocol compliance
4. **Manual integration testing** - Test with actual Claude Code before release
5. **Monitor changelog** - Watch MCP SDK releases for breaking changes

**Contingency**: If SDK breaks, roll back to pinned version and wait for stable release.

**Status**: Mitigating (active mitigation during development)
**Owner**: architect
**Review Date**: Weekly during Construction

---

### R2: Hound API Stability

**Category**: External Dependency
**Probability**: Low (1)
**Impact**: Medium (2)
**Score**: 3

**Description**: Hound service outages, slow responses, or API changes would directly impact MCP server functionality. As a thin wrapper, MCP-Hound has no fallback when Hound is unavailable.

**Consequences**:
- Search requests fail when Hound is down
- Slow Hound responses cause timeouts
- API changes break client implementation
- Users unable to search code

**Mitigation Strategies**:
1. **Configurable timeout** - HOUND_TIMEOUT environment variable (default 30s)
2. **Clear error messages** - Inform users when Hound is unavailable
3. **Health check endpoint** - Query /healthz before search operations
4. **Graceful degradation** - Return informative error, suggest checking Hound status

**Contingency**: Users fall back to Hound web UI (https://code.integrolabs.net) during outages.

**Status**: Monitoring (Hound is stable internal deployment)
**Owner**: devops-engineer
**Review Date**: Monthly

---

### R3: File Context Implementation

**Category**: Technical
**Probability**: Medium (2)
**Impact**: Medium (2)
**Score**: 4

**Description**: The `hound_file_context` tool requires retrieving file content with line context. Hound API doesn't provide direct file access, requiring either Gitea API integration or creative use of Hound search with high context values.

**Consequences**:
- Additional external dependency (Gitea API)
- Authentication complexity (Gitea token required for private repos)
- Implementation more complex than search/repos tools
- Potential performance issues with large files

**Mitigation Strategies**:
1. **Spike in Elaboration** - Prototype both approaches before committing
2. **Gitea API approach** - Use `/api/v1/repos/{owner}/{repo}/raw/{ref}/{filepath}`
3. **Hound fallback** - If Gitea fails, search with high `-A`/`-B` context values
4. **Graceful degradation** - If file_context fails, return error with Gitea URL for manual access

**Contingency**: If Gitea integration proves too complex, implement file_context as Hound search with 20+ lines of context (less precise but simpler).

**Status**: Identified (needs spike during Elaboration)
**Owner**: architect
**Review Date**: End of Elaboration phase

---

### R4: User Adoption

**Category**: Business
**Probability**: Low (1)
**Impact**: Low (1)
**Score**: 2

**Description**: Users may struggle with Claude Code configuration (settings.json), or may not integrate the tools into their workflow due to learning curve or preference for existing search methods.

**Consequences**:
- Low tool usage despite successful implementation
- Wasted development effort if no adoption
- Reduced ROI on project investment

**Mitigation Strategies**:
1. **Clear documentation** - README with copy-paste configuration examples
2. **Troubleshooting guide** - Common errors and solutions
3. **Team demo** - Walk through setup and usage with target users
4. **Gather feedback** - 2-3 beta users during Construction for early feedback
5. **Iterate on UX** - Improve error messages and result formatting based on feedback

**Contingency**: If adoption is low, conduct user interviews to understand barriers and iterate.

**Status**: Accepted (low priority, will address with documentation)
**Owner**: developer-experience
**Review Date**: Post-launch (2 weeks after deployment)

---

## Risk Matrix

```
           │ Low (1)     │ Medium (2)  │ High (3)
───────────┼─────────────┼─────────────┼─────────────
High (3)   │             │             │ R1
───────────┼─────────────┼─────────────┼─────────────
Medium (2) │             │ R3          │
───────────┼─────────────┼─────────────┼─────────────
Low (1)    │ R4          │ R2          │
───────────┴─────────────┴─────────────┴─────────────
             IMPACT →
```

## Risk Trends

| Review Date | R1 | R2 | R3 | R4 | Notes |
|-------------|----|----|----|----|-------|
| 2026-01-03 | 6 | 3 | 4 | 2 | Initial baseline (Inception) |

## Next Review

- **R1 (MCP Protocol)**: Weekly during Construction
- **R2 (Hound API)**: Monthly (stable, low priority)
- **R3 (File Context)**: End of Elaboration (spike result)
- **R4 (User Adoption)**: Post-launch

## Retired Risks

None yet. Risks will be retired when:
- R1: MCP server successfully tested with Claude Code
- R2: 30 days of stable operation
- R3: File context implementation validated
- R4: >50% adoption among target users

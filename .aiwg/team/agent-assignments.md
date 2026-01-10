# Team & Agent Assignments

**Project**: MCP-Hound Code Search Server
**Profile**: MVP (small team, moderate rigor)
**Updated**: 2026-01-03

## Team Structure

### Human Team

| Role | Responsibilities | Capacity |
|------|-----------------|----------|
| Lead Developer | Architecture, implementation, code review | Primary (full ownership) |
| Secondary Developer | Implementation support, testing, documentation | As available |

### AI Agent Assignments

Based on MVP profile and project needs, the following agents are assigned:

| Agent | Role | Phase Focus | Key Artifacts |
|-------|------|-------------|---------------|
| **architect** | Architecture design, ADRs, technical decisions | Inception, Elaboration | ADRs, SAD outline |
| **requirements-analyst** | Use case elaboration, acceptance criteria | Inception, Elaboration | Use cases, requirements |
| **code-reviewer** | PR review, code quality, best practices | Construction | Review feedback |
| **test-engineer** | Test strategy, test design, coverage | Elaboration, Construction | Test strategy, test cases |
| **devops-engineer** | CI/CD, deployment, operational readiness | Construction, Transition | CI pipeline, runbook |

### Agents Not Required (MVP Profile)

| Agent | Reason for Exclusion |
|-------|---------------------|
| security-gatekeeper | Minimal security posture, internal tool |
| security-auditor | No compliance requirements |
| compliance-validator | No regulatory requirements |
| incident-responder | Best-effort support, no SLA |
| reliability-engineer | Low scale (5-10 users), simple architecture |
| legal-liaison | MIT license, no contracts |
| privacy-officer | No PII, internal tool |

## Phase Assignments

### Inception (Current)

| Activity | Lead Agent | Supporting |
|----------|------------|------------|
| Risk register | architect | - |
| Architecture decisions (ADRs) | architect | - |
| Use case outline | requirements-analyst | architect |
| Team setup | (human lead) | - |
| Gate check | architect | requirements-analyst |

### Elaboration (Upcoming)

| Activity | Lead Agent | Supporting |
|----------|------------|------------|
| Architecture baseline (prototype) | architect | devops-engineer |
| File context spike (R3) | architect | - |
| Use case elaboration | requirements-analyst | architect |
| Test strategy | test-engineer | architect |
| Iteration planning | (human lead) | all agents |
| Gate check | architect | test-engineer |

### Construction (Future)

| Activity | Lead Agent | Supporting |
|----------|------------|------------|
| Implementation review | code-reviewer | architect |
| Unit test design | test-engineer | code-reviewer |
| Integration test design | test-engineer | devops-engineer |
| CI/CD pipeline | devops-engineer | - |
| Documentation review | requirements-analyst | code-reviewer |
| Iteration assessments | test-engineer | code-reviewer |
| Gate check | test-engineer | devops-engineer |

### Transition (Future)

| Activity | Lead Agent | Supporting |
|----------|------------|------------|
| Deployment readiness | devops-engineer | architect |
| Documentation finalization | requirements-analyst | - |
| User acceptance | (human lead) | test-engineer |
| Gate check | devops-engineer | test-engineer |

## Communication

### Sync Points

- **Daily**: Agent outputs reviewed by human lead
- **Per PR**: code-reviewer provides feedback
- **Per iteration**: test-engineer provides assessment
- **Per phase gate**: All relevant agents contribute to gate check

### Escalation Path

1. Agent identifies blocker → Document in artifact
2. Human lead reviews → Makes decision or seeks input
3. If cross-cutting → Architect consulted for technical decisions

## Agent Invocation Guide

### During Development

```
# Architecture questions
"Ask the architect about..."
"Review this design decision..."

# Requirements clarification
"Elaborate this use case..."
"Define acceptance criteria for..."

# Code review
"Review this PR..."
"Check this implementation against..."

# Testing
"Design tests for..."
"What's our coverage for..."

# DevOps
"Set up CI for..."
"How should we deploy..."
```

### Quality Gates

Before each phase transition, invoke relevant agents for gate check:

```
# Inception gate
Architect: Architecture direction validated?
Requirements-analyst: Critical use cases identified?

# Elaboration gate
Architect: Executable baseline complete?
Test-engineer: Test strategy defined?

# Construction gate
Test-engineer: Coverage targets met?
Code-reviewer: Quality standards met?
DevOps-engineer: Deployment pipeline working?

# Transition gate
DevOps-engineer: Production ready?
Test-engineer: Acceptance tests passed?
```

## Notes

- MVP profile = lightweight agent usage, human-led decisions
- Agents provide analysis and recommendations, human makes final calls
- Agent artifacts stored in `.aiwg/` directory structure
- All agents have access to intake documentation for context

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub provider support alongside Gitea for file context and deep links
- Docker infrastructure with production and development configurations
- Gitea CI/CD workflow with test, build, and publish pipeline
- Pagination support for `hound_search` with `offset`, `limit`, and `hasMore`

### Changed
- Minimum Node.js version bumped from 18 to 20
- Tool descriptions updated for provider-agnostic language

### Fixed
- HTTP transport sessionId storage timing issue

## [0.1.0] - 2026-01-03

### Added
- Initial release of MCP-Hound
- `hound_search` tool for regex-based code search across repositories
- `hound_repos` tool for listing indexed repositories
- `hound_file_context` tool for getting extended context around code matches
- HoundClient for typed communication with Hound API
- Gitea integration for file context and deep links
- Comprehensive unit tests with 83%+ coverage
- GitHub Actions CI pipeline
- MIT license and contribution guidelines

### Technical Details
- Built with TypeScript and MCP SDK
- Uses Zod for input validation
- Supports Node.js 20+
- Configurable via environment variables

[Unreleased]: https://github.com/jmagly/mcp-hound/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jmagly/mcp-hound/releases/tag/v0.1.0

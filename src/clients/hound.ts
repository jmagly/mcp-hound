/**
 * Hound API Client
 *
 * Thin typed wrapper around Hound REST API.
 * See ADR-002 for design decisions.
 */

import type {
  HoundClientConfig,
  HoundRawSearchResponse,
  HoundRawReposResponse,
  SearchOptions,
  SearchResult,
  SearchMatch,
  ReposResult,
  RepoInfo,
  HoundErrorCode,
} from '../types.js';

/**
 * Custom error class for Hound API errors
 */
export class HoundError extends Error {
  constructor(
    message: string,
    public readonly code: HoundErrorCode,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'HoundError';
  }
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: HoundClientConfig = {
  baseUrl: process.env.HOUND_URL || 'http://localhost:6080',
  timeout: parseInt(process.env.HOUND_TIMEOUT || '30000', 10),
};

/**
 * Git provider configuration for URL generation
 */
type GitProvider = 'gitea' | 'github';

interface ProviderConfig {
  provider: GitProvider;
  webUrl: string;
}

/**
 * Get git provider config lazily to allow test mocking
 * Priority: GITEA_URL > GITHUB_URL/GITHUB_TOKEN
 */
function getProviderConfig(): ProviderConfig | null {
  const giteaUrl = process.env.GITEA_URL;
  if (giteaUrl) {
    return { provider: 'gitea', webUrl: giteaUrl };
  }

  const githubUrl = process.env.GITHUB_URL || (process.env.GITHUB_TOKEN ? 'https://github.com' : '');
  if (githubUrl || process.env.GITHUB_TOKEN) {
    return { provider: 'github', webUrl: githubUrl || 'https://github.com' };
  }

  return null;
}

/**
 * Generate web URL for a file at a specific line
 */
function generateFileUrl(repo: string, file: string, line: number): string {
  const config = getProviderConfig();
  if (!config) {
    return '';
  }

  if (config.provider === 'github') {
    // GitHub: /blob/{branch}/{file}#L{line}
    return `${config.webUrl}/${repo}/blob/main/${file}#L${line}`;
  } else {
    // Gitea: /src/branch/{branch}/{file}#L{line}
    return `${config.webUrl}/${repo}/src/branch/main/${file}#L${line}`;
  }
}

/**
 * Generate web URL for a repository
 */
function generateRepoUrl(repo: string): string {
  const config = getProviderConfig();
  if (!config) {
    return '';
  }
  return `${config.webUrl}/${repo}`;
}

/**
 * Hound API Client
 */
export class HoundClient {
  private readonly config: HoundClientConfig;

  constructor(config: Partial<HoundClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search code across repositories
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const {
      query,
      repos = '*',
      files,
      ignoreCase = false,
      limit = 20,
      offset = 0,
    } = options;

    const effectiveLimit = Math.min(limit, 100);

    // Convert repo display names to Hound keys if not wildcard
    let reposParam = repos;
    if (repos !== '*') {
      reposParam = repos
        .split(',')
        .map((r) => this.repoNameToKey(r.trim()))
        .join(',');
    }

    const params = new URLSearchParams({
      q: query,
      repos: reposParam,
      i: ignoreCase ? 'fosho' : 'nope',
    });

    // Convert glob pattern to regex for files filter
    if (files) {
      params.set('files', this.globToRegex(files));
    }

    const url = `${this.config.baseUrl}/api/v1/search?${params}`;

    try {
      const response = await this.fetch(url);
      const data = (await response.json()) as HoundRawSearchResponse;
      return this.transformSearchResponse(data, effectiveLimit, offset);
    } catch (error) {
      if (error instanceof HoundError) throw error;
      throw new HoundError(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK'
      );
    }
  }

  /**
   * List all indexed repositories
   */
  async listRepos(): Promise<ReposResult> {
    const url = `${this.config.baseUrl}/api/v1/repos`;

    try {
      const response = await this.fetch(url);
      const data = (await response.json()) as HoundRawReposResponse;
      return this.transformReposResponse(data);
    } catch (error) {
      if (error instanceof HoundError) throw error;
      throw new HoundError(
        `Failed to list repos: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK'
      );
    }
  }

  /**
   * Check if Hound server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetch(`${this.config.baseUrl}/healthz`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Internal fetch wrapper with timeout and error handling
   */
  private async fetch(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new HoundError(
          `Hound API returned ${response.status}: ${response.statusText}`,
          'API_ERROR',
          response.status
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HoundError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HoundError(
          `Request timed out after ${this.config.timeout}ms`,
          'TIMEOUT'
        );
      }

      throw new HoundError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Transform Hound search response to clean format with pagination
   */
  private transformSearchResponse(
    data: HoundRawSearchResponse,
    limit: number,
    offset: number
  ): SearchResult {
    // Collect ALL matches first (no per-repo limit)
    const allMatches: SearchMatch[] = [];
    const reposSearched = Object.keys(data.Results || {}).length;

    for (const [repoKey, repoData] of Object.entries(data.Results || {})) {
      const repoName = this.repoKeyToName(repoKey);

      for (const fileMatch of repoData.Matches || []) {
        for (const match of fileMatch.Matches || []) {
          allMatches.push({
            repo: repoName,
            file: fileMatch.Filename,
            line: match.LineNumber,
            content: match.Line,
            url: generateFileUrl(repoName, fileMatch.Filename, match.LineNumber),
          });
        }
      }
    }

    const totalMatches = allMatches.length;

    // Apply pagination: slice based on offset and limit
    const paginatedResults = allMatches.slice(offset, offset + limit);
    const hasMore = offset + limit < totalMatches;
    const nextOffset = hasMore ? offset + limit : null;

    return {
      totalMatches,
      reposSearched,
      results: paginatedResults,
      count: paginatedResults.length,
      offset,
      hasMore,
      nextOffset,
    };
  }

  /**
   * Transform Hound repos response to clean format
   */
  private transformReposResponse(data: HoundRawReposResponse): ReposResult {
    const repos: RepoInfo[] = [];

    for (const [key, value] of Object.entries(data || {})) {
      const repoName = this.repoKeyToName(key);
      repos.push({
        name: repoName,
        key,
        vcs: value.vcs || 'git',
        url: generateRepoUrl(repoName),
      });
    }

    return {
      count: repos.length,
      repos: repos.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /**
   * Convert Hound repo key to display name
   * Example: "roctinam-matric" -> "roctinam/matric"
   */
  private repoKeyToName(key: string): string {
    // Hound uses hyphens, convert first hyphen to slash for owner/repo format
    const firstHyphen = key.indexOf('-');
    if (firstHyphen > 0) {
      return `${key.slice(0, firstHyphen)}/${key.slice(firstHyphen + 1)}`;
    }
    return key;
  }

  /**
   * Convert display name to Hound repo key
   * Example: "roctinam/matric" -> "roctinam-matric"
   */
  private repoNameToKey(name: string): string {
    // Convert owner/repo format to Hound's hyphen format
    return name.replace('/', '-');
  }

  /**
   * Convert glob pattern to regex pattern for Hound
   * Examples: "*.ts" -> ".*\\.ts$", "src/*.js" -> "src/.*\\.js$"
   */
  private globToRegex(glob: string): string {
    // Escape regex special chars except * and ?
    let regex = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Convert glob wildcards to regex
    regex = regex.replace(/\*/g, '.*');
    regex = regex.replace(/\?/g, '.');
    // Anchor at end if it looks like a file extension pattern
    if (glob.startsWith('*.') || glob.includes('/*.')) {
      regex = regex + '$';
    }
    return regex;
  }

}

/**
 * Default client instance
 */
export const houndClient = new HoundClient();

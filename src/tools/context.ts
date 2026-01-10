/**
 * hound_file_context MCP Tool
 *
 * Get extended context around a specific line in a file.
 * Supports both Gitea and GitHub as git providers.
 * See ADR-003 for implementation strategy.
 */

import { z } from 'zod';

/**
 * Input schema for hound_file_context tool
 */
export const houndFileContextSchema = {
  type: 'object' as const,
  properties: {
    repo: {
      type: 'string',
      description: 'Repository name (e.g., "owner/repo")',
    },
    file: {
      type: 'string',
      description: 'File path (e.g., "src/auth/jwt.ts")',
    },
    line: {
      type: 'number',
      description: 'Center line number',
    },
    context: {
      type: 'number',
      description: 'Lines of context before and after (default: 10)',
    },
  },
  required: ['repo', 'file', 'line'],
};

/**
 * Zod schema for runtime validation
 */
const FileContextInputSchema = z.object({
  repo: z.string().min(1, 'Repository name is required (format: "owner/repo")'),
  file: z.string().min(1, 'File path is required (e.g., "src/index.ts", "README.md")'),
  line: z.number().min(1, 'Line number must be positive (use line number from hound_search results)'),
  context: z.number().min(1).max(50).optional().default(10),
});

//=============================================================================
// Git Provider Configuration
//=============================================================================

type GitProvider = 'gitea' | 'github';

interface ProviderConfig {
  provider: GitProvider;
  apiUrl: string;
  webUrl: string;
  token?: string;
}

/**
 * Get provider configuration - read lazily to allow test mocking
 * Priority: GITEA_URL > GITHUB_URL
 */
function getProviderConfig(): ProviderConfig | null {
  // Check Gitea first
  const giteaUrl = process.env.GITEA_URL;
  if (giteaUrl) {
    return {
      provider: 'gitea',
      apiUrl: `${giteaUrl}/api/v1`,
      webUrl: giteaUrl,
      token: process.env.GITEA_TOKEN,
    };
  }

  // Check GitHub
  const githubUrl = process.env.GITHUB_URL || (process.env.GITHUB_TOKEN ? 'https://github.com' : '');
  if (githubUrl || process.env.GITHUB_TOKEN) {
    // GitHub API is always api.github.com for public GitHub
    // For GitHub Enterprise, it would be {GITHUB_URL}/api/v3
    const isEnterprise = githubUrl && !githubUrl.includes('github.com');
    return {
      provider: 'github',
      apiUrl: isEnterprise ? `${githubUrl}/api/v3` : 'https://api.github.com',
      webUrl: githubUrl || 'https://github.com',
      token: process.env.GITHUB_TOKEN,
    };
  }

  return null;
}

function getTimeout(): number {
  return parseInt(process.env.GITEA_TIMEOUT || process.env.GITHUB_TIMEOUT || '10000', 10);
}

//=============================================================================
// Branch Cache
//=============================================================================

const defaultBranchCache = new Map<string, string>();

/**
 * Clear the default branch cache (for testing)
 */
export function clearDefaultBranchCache(): void {
  defaultBranchCache.clear();
}

/**
 * Get the default branch for a repository
 */
async function getDefaultBranch(
  config: ProviderConfig,
  owner: string,
  repoName: string
): Promise<string> {
  const cacheKey = `${config.provider}:${owner}/${repoName}`;
  const cached = defaultBranchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${config.apiUrl}/repos/${owner}/${repoName}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (config.token) {
    // GitHub uses "Bearer" or "token", Gitea uses "token"
    headers['Authorization'] = config.provider === 'github'
      ? `Bearer ${config.token}`
      : `token ${config.token}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const data = (await response.json()) as { default_branch?: string };
      const branch = data.default_branch || 'main';
      defaultBranchCache.set(cacheKey, branch);
      return branch;
    }
  } catch {
    // Fall through to default
  }

  return 'main';
}

//=============================================================================
// File Fetching
//=============================================================================

/**
 * Contents API response (compatible with both GitHub and Gitea)
 */
interface ContentsResponse {
  content?: string;
  encoding?: string;
  sha?: string;
  size?: number;
  type?: string;
}

/**
 * Fetch file content from git provider
 */
async function fetchFileContent(
  config: ProviderConfig,
  repo: string,
  file: string,
  ref?: string
): Promise<string> {
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error(`Invalid repository format: ${repo}. Expected "owner/repo".`);
  }

  const branch = ref || (await getDefaultBranch(config, owner, repoName));

  // URL-encode the file path
  const encodedFile = file
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  const url = `${config.apiUrl}/repos/${owner}/${repoName}/contents/${encodedFile}?ref=${branch}`;

  const controller = new AbortController();
  const timeout = getTimeout();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (config.token) {
      headers['Authorization'] = config.provider === 'github'
        ? `Bearer ${config.token}`
        : `token ${config.token}`;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${repo}/${file} (branch: ${branch})`);
      }
      if (response.status === 401 || response.status === 403) {
        const tokenVar = config.provider === 'github' ? 'GITHUB_TOKEN' : 'GITEA_TOKEN';
        throw new Error(
          `Unauthorized: Cannot access ${repo}. Set ${tokenVar} environment variable for private repos.`
        );
      }
      throw new Error(`${config.provider} API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ContentsResponse;

    // Check if it's a file (not a directory)
    if (data.type === 'dir' || Array.isArray(data)) {
      throw new Error(`Path is a directory, not a file: ${repo}/${file}`);
    }

    // Decode base64 content
    if (!data.content || data.encoding !== 'base64') {
      throw new Error(`Unexpected response format for file: ${repo}/${file}`);
    }

    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

//=============================================================================
// Output Formatting
//=============================================================================

/**
 * Extract line range from file content
 */
function extractLineRange(
  content: string,
  centerLine: number,
  contextLines: number
): { lines: string[]; startLine: number; endLine: number } {
  const allLines = content.split('\n');
  const totalLines = allLines.length;

  const startLine = Math.max(1, centerLine - contextLines);
  const endLine = Math.min(totalLines, centerLine + contextLines);
  const lines = allLines.slice(startLine - 1, endLine);

  return { lines, startLine, endLine };
}

/**
 * Format content with line numbers
 */
function formatWithLineNumbers(lines: string[], startLine: number): string {
  const maxLineNum = startLine + lines.length - 1;
  const lineNumWidth = String(maxLineNum).length;

  return lines
    .map((line, index) => {
      const lineNum = String(startLine + index).padStart(lineNumWidth, ' ');
      return `${lineNum}  ${line}`;
    })
    .join('\n');
}

/**
 * Generate web URL for viewing file
 */
function generateWebUrl(
  config: ProviderConfig,
  repo: string,
  file: string,
  startLine: number,
  endLine: number,
  branch: string
): string {
  if (config.provider === 'github') {
    // GitHub: /blob/{branch}/{file}#L{start}-L{end}
    if (startLine === endLine) {
      return `${config.webUrl}/${repo}/blob/${branch}/${file}#L${startLine}`;
    }
    return `${config.webUrl}/${repo}/blob/${branch}/${file}#L${startLine}-L${endLine}`;
  } else {
    // Gitea: /src/branch/{branch}/{file}#L{start}-L{end}
    if (startLine === endLine) {
      return `${config.webUrl}/${repo}/src/branch/${branch}/${file}#L${startLine}`;
    }
    return `${config.webUrl}/${repo}/src/branch/${branch}/${file}#L${startLine}-L${endLine}`;
  }
}

/**
 * Get provider display name for output
 */
function getProviderDisplayName(provider: GitProvider): string {
  return provider === 'github' ? 'GitHub' : 'Gitea';
}

//=============================================================================
// Main Tool Implementation
//=============================================================================

/**
 * Execute hound_file_context tool
 */
export async function houndFileContext(args: unknown) {
  // Validate input
  const parsed = FileContextInputSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid input: ${parsed.error.errors.map((e) => e.message).join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  const { repo, file, line, context } = parsed.data;

  // Get provider config
  const config = getProviderConfig();
  if (!config) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: No git provider configured.

Set one of the following:
- GITEA_URL (e.g., "https://gitea.example.com") for Gitea
- GITHUB_TOKEN for GitHub (GITHUB_URL optional, defaults to github.com)`,
        },
      ],
      isError: true,
    };
  }

  try {
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      return {
        content: [{ type: 'text', text: `Invalid repository format: ${repo}. Expected "owner/repo".` }],
        isError: true,
      };
    }

    // Get default branch
    const branch = await getDefaultBranch(config, owner, repoName);

    // Fetch file content
    const content = await fetchFileContent(config, repo, file);

    // Check for binary content
    if (content.includes('\0')) {
      return {
        content: [
          {
            type: 'text',
            text: `Cannot display binary file: ${repo}/${file}`,
          },
        ],
        isError: true,
      };
    }

    // Extract and format
    const { lines, startLine, endLine } = extractLineRange(content, line, context);
    const formattedContent = formatWithLineNumbers(lines, startLine);
    const url = generateWebUrl(config, repo, file, startLine, endLine, branch);
    const providerName = getProviderDisplayName(config.provider);

    let output = `**${repo}**: ${file} (lines ${startLine}-${endLine})\n\n`;
    output += '```\n';
    output += formattedContent;
    output += '\n```\n\n';
    output += `[View in ${providerName}](${url})`;

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
}

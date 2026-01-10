/**
 * hound_search MCP Tool
 *
 * Search code across all indexed repositories using regex patterns.
 */

import { z } from 'zod';
import { houndClient, HoundError } from '../clients/hound.js';

/**
 * Input schema for hound_search tool
 */
export const houndSearchSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string',
      description: 'Regex pattern to search for (e.g., "validateJWT|verifyToken", "func\\s+\\w+", "TODO|FIXME")',
    },
    repos: {
      type: 'string',
      description: 'Comma-separated repo names (e.g., "roctinam/matric,roctinam/itops") or "*" for all (default: "*")',
    },
    files: {
      type: 'string',
      description: 'File pattern filter using glob syntax (e.g., "*.ts", "*.py", "src/*.js")',
    },
    ignore_case: {
      type: 'boolean',
      description: 'Case-insensitive search (default: false)',
    },
    limit: {
      type: 'number',
      description: 'Number of results to return, 1-100 (default: 20). Use with offset for pagination.',
    },
    offset: {
      type: 'number',
      description: 'Number of results to skip for pagination (default: 0). Use nextOffset from previous response.',
    },
  },
  required: ['query'],
};

/**
 * Zod schema for runtime validation
 */
const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query is required. Provide a regex pattern (e.g., "TODO|FIXME", "function\\s+\\w+", "import.*react")'),
  repos: z.string().optional().default('*'),
  files: z.string().optional(),
  ignore_case: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

/**
 * Execute hound_search tool
 */
export async function houndSearch(args: unknown) {
  // Validate input
  const parsed = SearchInputSchema.safeParse(args);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return {
      content: [
        {
          type: 'text',
          text: `Invalid input: ${errors}\n\nUsage: hound_search({ query: "regex pattern", repos?: "owner/repo", files?: "*.ts", limit?: 20, offset?: 0 })`,
        },
      ],
      isError: true,
    };
  }

  const { query, repos, files, ignore_case, limit, offset } = parsed.data;

  try {
    const result = await houndClient.search({
      query,
      repos,
      files,
      ignoreCase: ignore_case,
      limit,
      offset,
    });

    // Format results for display
    let output = '';

    // Pagination header
    if (offset > 0) {
      output += `Results ${offset + 1}-${offset + result.count} of ${result.totalMatches} matches`;
    } else {
      output += `Found ${result.totalMatches} matches`;
    }
    output += ` across ${result.reposSearched} repositories.\n\n`;

    if (result.results.length === 0) {
      if (offset > 0) {
        output += `No more results. You've reached the end of ${result.totalMatches} total matches.`;
      } else {
        output += 'No matches found. Try:\n';
        output += '- A different regex pattern\n';
        output += '- Removing the files filter\n';
        output += '- Using ignore_case: true\n';
        output += '- Checking repos with hound_repos()';
      }
    } else {
      for (const match of result.results) {
        output += `**${match.repo}**: ${match.file}:${match.line}\n`;
        output += `\`\`\`\n${match.content}\n\`\`\`\n`;
        output += `[View source](${match.url})\n\n`;
      }

      // Pagination footer
      if (result.hasMore) {
        output += `\n---\n`;
        output += `**Page info:** Showing ${result.count} of ${result.totalMatches} total matches.\n`;
        output += `**Next page:** Use \`offset: ${result.nextOffset}\` to see more results.`;
      } else if (result.totalMatches > result.count) {
        output += `\n---\n_Showing final ${result.count} results (${result.totalMatches} total)._`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    if (error instanceof HoundError) {
      let message = error.message;
      let hint = '';

      if (error.code === 'TIMEOUT') {
        message = 'Search timed out.';
        hint = '\n\nTry:\n- A more specific regex pattern\n- Limiting to specific repos: repos: "owner/repo"\n- Adding a files filter: files: "*.ts"';
      } else if (error.code === 'NETWORK') {
        const url = process.env.HOUND_URL || 'http://localhost:6080';
        message = `Cannot reach Hound server at ${url}.`;
        hint = '\n\nCheck:\n- Is the Hound server running?\n- Is HOUND_URL environment variable correct?';
      } else if (error.code === 'API_ERROR') {
        hint = '\n\nThe Hound server returned an error. Check server logs for details.';
      }

      return {
        content: [{ type: 'text', text: `Error: ${message}${hint}` }],
        isError: true,
      };
    }
    throw error;
  }
}

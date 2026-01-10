/**
 * hound_repos MCP Tool
 *
 * List all repositories indexed by Hound code search.
 */

import { houndClient, HoundError } from '../clients/hound.js';

/**
 * Input schema for hound_repos tool (no parameters required)
 */
export const houndReposSchema = {
  type: 'object' as const,
  properties: {},
  required: [],
};

/**
 * Execute hound_repos tool
 */
export async function houndRepos() {
  try {
    const result = await houndClient.listRepos();

    // Format results for display
    let output = `**${result.count} repositories indexed**\n\n`;

    if (result.repos.length === 0) {
      output += 'No repositories found. Check Hound configuration.';
    } else {
      output += '| Repository | VCS | URL |\n';
      output += '|------------|-----|-----|\n';

      for (const repo of result.repos) {
        output += `| ${repo.name} | ${repo.vcs} | [View](${repo.url}) |\n`;
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
      if (error.code === 'NETWORK') {
        message = `Cannot reach Hound server at ${process.env.HOUND_URL || 'http://localhost:6080'}. Is it running?`;
      }
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
    throw error;
  }
}

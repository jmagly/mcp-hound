/**
 * hound_repos tool unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { houndRepos, houndReposSchema } from './repos.js';
import { HoundError } from '../clients/hound.js';

// Mock the hound client
vi.mock('../clients/hound.js', async () => {
  const HoundError = class extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'HoundError';
    }
  };

  return {
    HoundError,
    houndClient: {
      listRepos: vi.fn(),
    },
  };
});

import { houndClient } from '../clients/hound.js';

describe('houndRepos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('result formatting', () => {
    it('should format repository list', async () => {
      vi.mocked(houndClient.listRepos).mockResolvedValueOnce({
        count: 2,
        repos: [
          { name: 'roctinam/devops', key: 'roctinam-devops', vcs: 'git', url: 'https://git.integrolabs.net/roctinam/devops' },
          { name: 'roctinam/matric', key: 'roctinam-matric', vcs: 'git', url: 'https://git.integrolabs.net/roctinam/matric' },
        ],
      });

      const result = await houndRepos();

      expect(result.content[0].text).toContain('2 repositories indexed');
      expect(result.content[0].text).toContain('roctinam/devops');
      expect(result.content[0].text).toContain('roctinam/matric');
      expect(result.content[0].text).toContain('| Repository | VCS | URL |');
    });

    it('should show empty message when no repos', async () => {
      vi.mocked(houndClient.listRepos).mockResolvedValueOnce({
        count: 0,
        repos: [],
      });

      const result = await houndRepos();

      expect(result.content[0].text).toContain('0 repositories indexed');
      expect(result.content[0].text).toContain('No repositories found');
      expect(result.content[0].text).toContain('Check Hound configuration');
    });

    it('should include repository links', async () => {
      vi.mocked(houndClient.listRepos).mockResolvedValueOnce({
        count: 1,
        repos: [
          { name: 'roctinam/itops', key: 'roctinam-itops', vcs: 'git', url: 'https://git.example.com/roctinam/itops' },
        ],
      });

      const result = await houndRepos();

      expect(result.content[0].text).toContain('[View](https://git.example.com/roctinam/itops)');
    });

    it('should show VCS type', async () => {
      vi.mocked(houndClient.listRepos).mockResolvedValueOnce({
        count: 1,
        repos: [
          { name: 'test/repo', key: 'test-repo', vcs: 'hg', url: 'https://example.com/test/repo' },
        ],
      });

      const result = await houndRepos();

      expect(result.content[0].text).toContain('| hg |');
    });
  });

  describe('error handling', () => {
    it('should handle network error', async () => {
      vi.mocked(houndClient.listRepos).mockRejectedValueOnce(
        new HoundError('Network failed', 'NETWORK')
      );

      const result = await houndRepos();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot reach Hound server');
    });

    it('should handle API error', async () => {
      vi.mocked(houndClient.listRepos).mockRejectedValueOnce(
        new HoundError('Server error', 'API_ERROR', 500)
      );

      const result = await houndRepos();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Server error');
    });

    it('should rethrow non-HoundError exceptions', async () => {
      vi.mocked(houndClient.listRepos).mockRejectedValueOnce(new Error('Unknown'));

      await expect(houndRepos()).rejects.toThrow('Unknown');
    });
  });
});

describe('houndReposSchema', () => {
  it('should have no required properties', () => {
    expect(houndReposSchema.required).toEqual([]);
  });

  it('should have empty properties', () => {
    expect(Object.keys(houndReposSchema.properties)).toHaveLength(0);
  });
});

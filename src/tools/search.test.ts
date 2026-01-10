/**
 * hound_search tool unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { houndSearch, houndSearchSchema } from './search.js';
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
      search: vi.fn(),
    },
  };
});

import { houndClient } from '../clients/hound.js';

describe('houndSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should reject empty query', async () => {
      const result = await houndSearch({ query: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid input');
    });

    it('should reject missing query', async () => {
      const result = await houndSearch({});

      expect(result.isError).toBe(true);
    });

    it('should accept valid query', async () => {
      vi.mocked(houndClient.search).mockResolvedValueOnce({
        totalMatches: 0,
        reposSearched: 0,
        results: [],
        count: 0,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      });

      const result = await houndSearch({ query: 'test' });

      expect(result.isError).toBeUndefined();
    });

    it('should use default values for optional params', async () => {
      vi.mocked(houndClient.search).mockResolvedValueOnce({
        totalMatches: 0,
        reposSearched: 0,
        results: [],
        count: 0,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      });

      await houndSearch({ query: 'test' });

      expect(houndClient.search).toHaveBeenCalledWith({
        query: 'test',
        repos: '*',
        files: undefined,
        ignoreCase: false,
        limit: 20,
        offset: 0,
      });
    });

    it('should pass all optional params when provided', async () => {
      vi.mocked(houndClient.search).mockResolvedValueOnce({
        totalMatches: 0,
        reposSearched: 0,
        results: [],
        count: 0,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      });

      await houndSearch({
        query: 'func\\s+\\w+',
        repos: 'roctinam-matric',
        files: '*.ts',
        ignore_case: true,
        limit: 25,
        offset: 10,
      });

      expect(houndClient.search).toHaveBeenCalledWith({
        query: 'func\\s+\\w+',
        repos: 'roctinam-matric',
        files: '*.ts',
        ignoreCase: true,
        limit: 25,
        offset: 10,
      });
    });

    it('should reject limit > 100', async () => {
      const result = await houndSearch({ query: 'test', limit: 150 });

      expect(result.isError).toBe(true);
    });

    it('should reject limit < 1', async () => {
      const result = await houndSearch({ query: 'test', limit: 0 });

      expect(result.isError).toBe(true);
    });

    it('should reject negative offset', async () => {
      const result = await houndSearch({ query: 'test', offset: -1 });

      expect(result.isError).toBe(true);
    });
  });

  describe('result formatting', () => {
    it('should format search results', async () => {
      vi.mocked(houndClient.search).mockResolvedValueOnce({
        totalMatches: 1,
        reposSearched: 1,
        results: [
          {
            repo: 'roctinam/matric',
            file: 'src/auth.ts',
            line: 42,
            content: 'function verifyToken() {}',
            url: 'https://git.integrolabs.net/roctinam/matric/src/branch/main/src/auth.ts#L42',
          },
        ],
        count: 1,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      });

      const result = await houndSearch({ query: 'verifyToken' });

      expect(result.content[0].text).toContain('Found 1 matches');
      expect(result.content[0].text).toContain('roctinam/matric');
      expect(result.content[0].text).toContain('src/auth.ts:42');
      expect(result.content[0].text).toContain('verifyToken');
      expect(result.content[0].text).toContain('View source');
    });

    it('should show no matches message when empty', async () => {
      vi.mocked(houndClient.search).mockResolvedValueOnce({
        totalMatches: 0,
        reposSearched: 5,
        results: [],
        count: 0,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      });

      const result = await houndSearch({ query: 'nonexistent' });

      expect(result.content[0].text).toContain('Found 0 matches');
      expect(result.content[0].text).toContain('No matches found');
    });

    it('should show pagination info when more results available', async () => {
      vi.mocked(houndClient.search).mockResolvedValueOnce({
        totalMatches: 100,
        reposSearched: 10,
        results: [
          {
            repo: 'roctinam/matric',
            file: 'test.ts',
            line: 1,
            content: 'test',
            url: 'https://test',
          },
        ],
        count: 1,
        offset: 0,
        hasMore: true,
        nextOffset: 20,
      });

      const result = await houndSearch({ query: 'common' });

      expect(result.content[0].text).toContain('Showing 1 of 100');
      expect(result.content[0].text).toContain('offset: 20');
    });

    it('should show offset range for paginated results', async () => {
      vi.mocked(houndClient.search).mockResolvedValueOnce({
        totalMatches: 100,
        reposSearched: 10,
        results: [
          {
            repo: 'roctinam/matric',
            file: 'test.ts',
            line: 1,
            content: 'test',
            url: 'https://test',
          },
        ],
        count: 1,
        offset: 20,
        hasMore: true,
        nextOffset: 40,
      });

      const result = await houndSearch({ query: 'common', offset: 20 });

      expect(result.content[0].text).toContain('Results 21-21 of 100');
    });
  });

  describe('error handling', () => {
    it('should handle timeout error', async () => {
      vi.mocked(houndClient.search).mockRejectedValueOnce(
        new HoundError('Timeout', 'TIMEOUT')
      );

      const result = await houndSearch({ query: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('should handle network error', async () => {
      vi.mocked(houndClient.search).mockRejectedValueOnce(
        new HoundError('Network failed', 'NETWORK')
      );

      const result = await houndSearch({ query: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot reach Hound server');
    });

    it('should handle API error', async () => {
      vi.mocked(houndClient.search).mockRejectedValueOnce(
        new HoundError('Server error', 'API_ERROR', 500)
      );

      const result = await houndSearch({ query: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Server error');
    });

    it('should rethrow non-HoundError exceptions', async () => {
      vi.mocked(houndClient.search).mockRejectedValueOnce(new Error('Unknown'));

      await expect(houndSearch({ query: 'test' })).rejects.toThrow('Unknown');
    });
  });
});

describe('houndSearchSchema', () => {
  it('should have required query property', () => {
    expect(houndSearchSchema.required).toContain('query');
  });

  it('should define all expected properties', () => {
    expect(houndSearchSchema.properties).toHaveProperty('query');
    expect(houndSearchSchema.properties).toHaveProperty('repos');
    expect(houndSearchSchema.properties).toHaveProperty('files');
    expect(houndSearchSchema.properties).toHaveProperty('ignore_case');
    expect(houndSearchSchema.properties).toHaveProperty('limit');
    expect(houndSearchSchema.properties).toHaveProperty('offset');
  });
});

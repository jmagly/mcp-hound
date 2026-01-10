/**
 * HoundClient unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set GITEA_URL before importing the module
vi.stubEnv('GITEA_URL', 'https://git.integrolabs.net');

import { HoundClient, HoundError } from './hound.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('HoundClient', () => {
  let client: HoundClient;

  beforeEach(() => {
    client = new HoundClient({ baseUrl: 'http://test-hound:6080', timeout: 5000 });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return search results', async () => {
      const mockResponse = {
        Results: {
          'roctinam-matric': {
            Matches: [
              {
                Filename: 'src/auth/jwt.ts',
                Matches: [
                  {
                    LineNumber: 42,
                    Line: 'export function verifyToken(token: string) {',
                    Before: ['// Verify JWT token'],
                    After: ['  const decoded = jwt.verify(token, secret);'],
                  },
                ],
              },
            ],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.search({ query: 'verifyToken' });

      expect(result.totalMatches).toBe(1);
      expect(result.reposSearched).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        repo: 'roctinam/matric',
        file: 'src/auth/jwt.ts',
        line: 42,
        content: 'export function verifyToken(token: string) {',
        url: 'https://git.integrolabs.net/roctinam/matric/src/branch/main/src/auth/jwt.ts#L42',
      });
    });

    it('should handle multiple matches across repos', async () => {
      const mockResponse = {
        Results: {
          'roctinam-matric': {
            Matches: [
              {
                Filename: 'src/auth.ts',
                Matches: [
                  { LineNumber: 10, Line: 'function auth1() {}', Before: [], After: [] },
                  { LineNumber: 20, Line: 'function auth2() {}', Before: [], After: [] },
                ],
              },
            ],
          },
          'roctinam-devops': {
            Matches: [
              {
                Filename: 'scripts/auth.sh',
                Matches: [
                  { LineNumber: 5, Line: '# auth script', Before: [], After: [] },
                ],
              },
            ],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.search({ query: 'auth' });

      expect(result.totalMatches).toBe(3);
      expect(result.reposSearched).toBe(2);
    });

    it('should respect limit for pagination', async () => {
      const mockResponse = {
        Results: {
          'roctinam-matric': {
            Matches: [
              {
                Filename: 'src/auth.ts',
                Matches: [
                  { LineNumber: 1, Line: 'line1', Before: [], After: [] },
                  { LineNumber: 2, Line: 'line2', Before: [], After: [] },
                  { LineNumber: 3, Line: 'line3', Before: [], After: [] },
                  { LineNumber: 4, Line: 'line4', Before: [], After: [] },
                  { LineNumber: 5, Line: 'line5', Before: [], After: [] },
                ],
              },
            ],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.search({ query: 'line', limit: 2 });

      expect(result.totalMatches).toBe(5);
      expect(result.results).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextOffset).toBe(2);
    });

    it('should handle offset for pagination', async () => {
      const mockResponse = {
        Results: {
          'roctinam-matric': {
            Matches: [
              {
                Filename: 'src/auth.ts',
                Matches: [
                  { LineNumber: 1, Line: 'line1', Before: [], After: [] },
                  { LineNumber: 2, Line: 'line2', Before: [], After: [] },
                  { LineNumber: 3, Line: 'line3', Before: [], After: [] },
                  { LineNumber: 4, Line: 'line4', Before: [], After: [] },
                  { LineNumber: 5, Line: 'line5', Before: [], After: [] },
                ],
              },
            ],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.search({ query: 'line', limit: 2, offset: 2 });

      expect(result.totalMatches).toBe(5);
      expect(result.results).toHaveLength(2);
      expect(result.offset).toBe(2);
      expect(result.results[0].content).toBe('line3');
      expect(result.hasMore).toBe(true);
      expect(result.nextOffset).toBe(4);
    });

    it('should indicate no more results when at end', async () => {
      const mockResponse = {
        Results: {
          'roctinam-matric': {
            Matches: [
              {
                Filename: 'src/auth.ts',
                Matches: [
                  { LineNumber: 1, Line: 'line1', Before: [], After: [] },
                  { LineNumber: 2, Line: 'line2', Before: [], After: [] },
                ],
              },
            ],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.search({ query: 'line', limit: 10 });

      expect(result.totalMatches).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextOffset).toBeNull();
    });

    it('should pass search options to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Results: {} }),
      });

      await client.search({
        query: 'test',
        repos: 'roctinam/matric',
        files: '*.ts',
        ignoreCase: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test'),
        expect.any(Object)
      );
      // repos should be converted from display format (owner/repo) to Hound key format (owner-repo)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('repos=roctinam-matric'),
        expect.any(Object)
      );
      // files glob should be converted to regex (*.ts -> .*\.ts$)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/files=.*%5C\.ts%24/), // URL-encoded .*\.ts$
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('i=fosho'),
        expect.any(Object)
      );
    });

    it('should handle empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Results: {} }),
      });

      const result = await client.search({ query: 'nonexistent' });

      expect(result.totalMatches).toBe(0);
      expect(result.reposSearched).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should throw HoundError on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const promise = client.search({ query: 'test' });
      await expect(promise).rejects.toThrow(HoundError);
      await expect(promise).rejects.toMatchObject({
        code: 'API_ERROR',
        statusCode: 500,
      });
    });

    it('should throw HoundError on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network failed'));

      const promise = client.search({ query: 'test' });
      await expect(promise).rejects.toThrow(HoundError);
      await expect(promise).rejects.toMatchObject({
        code: 'NETWORK',
      });
    });

    it('should throw HoundError on timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const promise = client.search({ query: 'test' });
      await expect(promise).rejects.toThrow(HoundError);
      await expect(promise).rejects.toMatchObject({
        code: 'TIMEOUT',
      });
    });
  });

  describe('listRepos', () => {
    it('should return list of repositories', async () => {
      const mockResponse = {
        'roctinam-matric': { url: 'https://git.integrolabs.net/roctinam/matric', vcs: 'git' },
        'roctinam-devops': { url: 'https://git.integrolabs.net/roctinam/devops', vcs: 'git' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.listRepos();

      expect(result.count).toBe(2);
      expect(result.repos).toHaveLength(2);
      expect(result.repos[0].name).toBe('roctinam/devops');
      expect(result.repos[1].name).toBe('roctinam/matric');
    });

    it('should handle empty repos list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await client.listRepos();

      expect(result.count).toBe(0);
      expect(result.repos).toEqual([]);
    });

    it('should throw HoundError on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const promise = client.listRepos();
      await expect(promise).rejects.toThrow(HoundError);
      await expect(promise).rejects.toMatchObject({
        code: 'API_ERROR',
      });
    });
  });

  describe('healthCheck', () => {
    it('should return true when server is healthy', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when server is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('repoKeyToName', () => {
    it('should convert repo key to display name', async () => {
      const mockResponse = {
        'roctinam-some-repo-name': { url: 'test', vcs: 'git' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.listRepos();

      expect(result.repos[0].name).toBe('roctinam/some-repo-name');
    });

    it('should handle repo key without hyphen', async () => {
      const mockResponse = {
        'simplerepo': { url: 'test', vcs: 'git' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.listRepos();

      expect(result.repos[0].name).toBe('simplerepo');
    });
  });
});

describe('HoundError', () => {
  it('should create error with code and message', () => {
    const error = new HoundError('Test error', 'NETWORK');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('NETWORK');
    expect(error.name).toBe('HoundError');
  });

  it('should include status code when provided', () => {
    const error = new HoundError('API error', 'API_ERROR', 500);

    expect(error.statusCode).toBe(500);
  });
});

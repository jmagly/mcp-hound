/**
 * hound_file_context tool unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set GITEA_URL before importing the module
vi.stubEnv('GITEA_URL', 'https://test-gitea.example.com');

import { houndFileContext, houndFileContextSchema, clearDefaultBranchCache } from './context.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/**
 * Helper to encode content as base64 (simulating Gitea contents API)
 */
function toBase64(content: string): string {
  return Buffer.from(content).toString('base64');
}

/**
 * Helper to set up mocks for both getDefaultBranch and file fetch
 */
function setupMocks(options: {
  branchResponse?: { ok: boolean; default_branch?: string };
  fileResponse?: { ok: boolean; status?: number; statusText?: string; content?: string; type?: string };
}) {
  const { branchResponse, fileResponse } = options;

  mockFetch.mockImplementation((url: string) => {
    // Repo info call for getDefaultBranch (doesn't include /contents/ or /raw/)
    if (url.includes('/api/v1/repos/') && !url.includes('/contents/') && !url.includes('/raw/')) {
      if (branchResponse?.ok === false) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ default_branch: branchResponse?.default_branch || 'main' }),
      });
    }
    // Contents API call (returns base64-encoded content)
    if (url.includes('/contents/')) {
      if (fileResponse) {
        if (!fileResponse.ok) {
          return Promise.resolve({
            ok: false,
            status: fileResponse.status,
            statusText: fileResponse.statusText,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            content: toBase64(fileResponse.content || ''),
            encoding: 'base64',
            type: fileResponse.type || 'file',
          }),
        });
      }
    }
    return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
  });
}

describe('houndFileContext', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearDefaultBranchCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should reject missing repo', async () => {
      const result = await houndFileContext({ file: 'test.ts', line: 10 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid input');
    });

    it('should reject missing file', async () => {
      const result = await houndFileContext({ repo: 'roctinam/matric', line: 10 });

      expect(result.isError).toBe(true);
    });

    it('should reject missing line', async () => {
      const result = await houndFileContext({ repo: 'roctinam/matric', file: 'test.ts' });

      expect(result.isError).toBe(true);
    });

    it('should reject empty repo', async () => {
      const result = await houndFileContext({ repo: '', file: 'test.ts', line: 10 });

      expect(result.isError).toBe(true);
    });

    it('should reject negative line number', async () => {
      const result = await houndFileContext({ repo: 'roctinam/matric', file: 'test.ts', line: -1 });

      expect(result.isError).toBe(true);
    });

    it('should reject context > 50', async () => {
      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 10,
        context: 51,
      });

      expect(result.isError).toBe(true);
    });

    it('should accept valid input with default context', async () => {
      setupMocks({
        fileResponse: { ok: true, content: 'line1\nline2\nline3' },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'src/index.ts',
        line: 2,
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('file fetching', () => {
    it('should fetch file from Gitea API', async () => {
      const fileContent = 'line1\nline2\nline3\nline4\nline5';
      setupMocks({
        fileResponse: { ok: true, content: fileContent },
      });

      await houndFileContext({
        repo: 'roctinam/matric',
        file: 'src/index.ts',
        line: 3,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/repos/roctinam/matric/contents/src/index.ts'),
        expect.any(Object)
      );
    });

    it('should handle invalid repo format', async () => {
      const result = await houndFileContext({
        repo: 'invalidrepo',
        file: 'test.ts',
        line: 1,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid repository format');
    });

    it('should handle 404 not found', async () => {
      setupMocks({
        fileResponse: { ok: false, status: 404 },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'nonexistent.ts',
        line: 1,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
    });

    it('should handle 401 unauthorized', async () => {
      setupMocks({
        fileResponse: { ok: false, status: 401 },
      });

      const result = await houndFileContext({
        repo: 'roctinam/private-repo',
        file: 'secret.ts',
        line: 1,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unauthorized');
      expect(result.content[0].text).toContain('GITEA_TOKEN');
    });

    it('should handle 403 forbidden', async () => {
      setupMocks({
        fileResponse: { ok: false, status: 403 },
      });

      const result = await houndFileContext({
        repo: 'roctinam/private-repo',
        file: 'secret.ts',
        line: 1,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unauthorized');
    });

    it('should handle other API errors', async () => {
      setupMocks({
        fileResponse: { ok: false, status: 500, statusText: 'Internal Server Error' },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 1,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('500');
    });

    it('should handle timeout', async () => {
      mockFetch.mockImplementation((url: string) => {
        // Branch lookup succeeds
        if (url.includes('/api/v1/repos/') && !url.includes('/contents/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ default_branch: 'main' }),
          });
        }
        // File fetch times out
        const error = new Error('Aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 1,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timed out');
    });

    it('should handle binary file', async () => {
      setupMocks({
        fileResponse: { ok: true, content: 'binary\x00content' },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'image.png',
        line: 1,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('binary file');
    });
  });

  describe('line extraction', () => {
    it('should extract lines around center line', async () => {
      const lines = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');
      setupMocks({
        fileResponse: { ok: true, content: lines },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 15,
        context: 5,
      });

      expect(result.content[0].text).toContain('lines 10-20');
      expect(result.content[0].text).toContain('line 10');
      expect(result.content[0].text).toContain('line 15');
      expect(result.content[0].text).toContain('line 20');
    });

    it('should handle start of file', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
      setupMocks({
        fileResponse: { ok: true, content: lines },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 1,
        context: 5,
      });

      expect(result.content[0].text).toContain('lines 1-6');
    });

    it('should handle end of file', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
      setupMocks({
        fileResponse: { ok: true, content: lines },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 10,
        context: 5,
      });

      expect(result.content[0].text).toContain('lines 5-10');
    });

    it('should format with line numbers', async () => {
      setupMocks({
        fileResponse: { ok: true, content: 'line1\nline2\nline3' },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 2,
        context: 1,
      });

      expect(result.content[0].text).toContain('1  line1');
      expect(result.content[0].text).toContain('2  line2');
      expect(result.content[0].text).toContain('3  line3');
    });
  });

  describe('output formatting', () => {
    it('should include repo and file info', async () => {
      setupMocks({
        fileResponse: { ok: true, content: 'test content' },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'src/auth/jwt.ts',
        line: 1,
      });

      expect(result.content[0].text).toContain('roctinam/matric');
      expect(result.content[0].text).toContain('src/auth/jwt.ts');
    });

    it('should include Gitea link with line range', async () => {
      const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1}`).join('\n');
      setupMocks({
        fileResponse: { ok: true, content: lines },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'src/index.ts',
        line: 15,
        context: 5,
      });

      expect(result.content[0].text).toContain('View in Gitea');
      expect(result.content[0].text).toContain('#L10-L20');
    });

    it('should use single line anchor when start equals end', async () => {
      setupMocks({
        fileResponse: { ok: true, content: 'single line' },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 1,
        context: 1,
      });

      // Single line file, so anchor is just #L1
      expect(result.content[0].text).toContain('#L1');
      expect(result.content[0].text).not.toContain('#L1-L');
    });

    it('should use correct branch from Gitea API', async () => {
      setupMocks({
        branchResponse: { ok: true, default_branch: 'master' },
        fileResponse: { ok: true, content: 'test content' },
      });

      const result = await houndFileContext({
        repo: 'roctinam/matric',
        file: 'test.ts',
        line: 1,
      });

      expect(result.content[0].text).toContain('/branch/master/');
    });
  });
});

describe('houndFileContextSchema', () => {
  it('should require repo, file, and line', () => {
    expect(houndFileContextSchema.required).toContain('repo');
    expect(houndFileContextSchema.required).toContain('file');
    expect(houndFileContextSchema.required).toContain('line');
  });

  it('should have context as optional', () => {
    expect(houndFileContextSchema.required).not.toContain('context');
    expect(houndFileContextSchema.properties.context).toBeDefined();
  });
});

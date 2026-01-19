/**
 * Demo Plugin Tests
 * 
 * Tests each executor type using free public APIs.
 * No API keys required.
 */

import { describe, it, expect } from 'vitest';
import { aos } from '../../../tests/utils/fixtures';

const plugin = 'demo';

describe('Demo Plugin', () => {
  // ===========================================================================
  // Command Executor
  // ===========================================================================
  describe('Command Executor', () => {
    it('echo - runs shell command', async () => {
      const result = await aos().call('UsePlugin', {
        plugin,
        tool: 'echo',
        params: { message: 'hello world' },
      });

      expect(result).toBeDefined();
      expect(result.output).toContain('hello world');
    });
  });

  // ===========================================================================
  // REST Executor
  // ===========================================================================
  describe('REST Executor', () => {
    it('http_get - basic GET request', async () => {
      const result = await aos().call('UsePlugin', {
        plugin,
        tool: 'http_get',
        params: {},
      });

      expect(result).toBeDefined();
      expect(result.origin).toBeDefined();
      expect(result.url).toBe('https://httpbin.org/get');
    });

    it('get_ip - GET with response mapping', async () => {
      const result = await aos().call('UsePlugin', {
        plugin,
        tool: 'get_ip',
        params: {},
      });

      expect(result).toBeDefined();
      expect(result.ip).toBeDefined();
      expect(result.country).toBeDefined();
    });

    it('get_iss_position - nested response extraction', async () => {
      const result = await aos().call('UsePlugin', {
        plugin,
        tool: 'get_iss_position',
        params: {},
      });

      expect(result).toBeDefined();
      expect(result.latitude).toBeDefined();
      expect(result.longitude).toBeDefined();
    });

    it('http_post - POST with request body', async () => {
      const result = await aos().call('UsePlugin', {
        plugin,
        tool: 'http_post',
        params: { data: 'test message' },
      });

      expect(result).toBeDefined();
      expect(result.data).toBe('test message');
      expect(result.url).toBe('https://httpbin.org/post');
    });
  });

  // ===========================================================================
  // Operations (Entity Returns)
  // ===========================================================================
  describe('Operations', () => {
    it('webpage.search - returns webpage[] from DuckDuckGo', async () => {
      const result = await aos().call('UsePlugin', {
        plugin,
        tool: 'webpage.search',
        params: { query: 'rust programming' },
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

/**
 * Messages App Tests
 * 
 * Tests for the unified messaging interface across all connectors.
 */

import { describe, it, expect } from 'vitest';
import { aos } from '../../../tests/utils/fixtures';

describe('Messages App', () => {
  describe('Actions', () => {
    it('should support list action', async () => {
      const result = await aos().call('Messages', { action: 'readme' });
      expect(result).toContain('list');
    });

    it('should support list_conversations action', async () => {
      const result = await aos().call('Messages', { action: 'readme' });
      expect(result).toContain('list_conversations');
    });

    it('should support send action', async () => {
      const result = await aos().call('Messages', { action: 'readme' });
      expect(result).toContain('send');
    });
  });
});

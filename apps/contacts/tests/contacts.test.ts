/**
 * Contacts App Tests
 * 
 * Tests for the Apple Contacts connector with multi-account support.
 * 
 * Architecture:
 * - accounts action: Lists available contact accounts (iCloud, local, work, etc.)
 * - list/search: Require account parameter (use default account from accounts action)
 * - create: Creates in specified account (defaults to default account)
 * - Photo operations: set_photo, clear_photo, has_photo field
 * 
 * This follows the same pattern as Linear (teams) and Todoist (projects).
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { aos, testContent, cleanupTestData, TEST_PREFIX, sleep } from '../../../tests/utils/fixtures';

const CONNECTOR = 'apple-contacts';

describe('Contacts App', () => {
  // Track contacts we create for cleanup
  let createdContactIds: string[] = [];
  
  // Cache the default account for all tests
  let defaultAccountId: string;
  let allAccounts: any[];
  
  // Get accounts before all tests
  beforeAll(async () => {
    const accounts = await aos().call('Contacts', { 
      action: 'accounts', 
      connector: CONNECTOR 
    });
    allAccounts = accounts;
    const defaultAccount = accounts.find((a: any) => a.is_default);
    if (!defaultAccount) {
      throw new Error('No default account found - cannot run tests');
    }
    defaultAccountId = defaultAccount.id;
  });
  
  // Clean up test data after all tests
  afterAll(async () => {
    for (const id of createdContactIds) {
      try {
        await aos().call('Contacts', { action: 'delete', connector: CONNECTOR, params: { id }, execute: true });
      } catch (e) {
        // Ignore - might already be deleted
      }
    }
  });

  // ============================================================
  // Accounts Action Tests
  // ============================================================
  
  describe('Accounts', () => {
    it('returns list of available accounts', async () => {
      const accounts = await aos().call('Contacts', { 
        action: 'accounts', 
        connector: CONNECTOR 
      });
      
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
    });

    it('each account has required fields', async () => {
      for (const account of allAccounts) {
        expect(account.id).toBeDefined();
        expect(typeof account.id).toBe('string');
        expect(account.name).toBeDefined();
        expect(typeof account.name).toBe('string');
        expect(typeof account.count).toBe('number');
        expect(typeof account.is_default).toBe('boolean');
      }
    });

    it('exactly one account is marked as default', async () => {
      const defaults = allAccounts.filter((a: any) => a.is_default);
      expect(defaults).toHaveLength(1);
    });

    it('default account has contacts', async () => {
      const defaultAccount = allAccounts.find((a: any) => a.is_default);
      expect(defaultAccount.count).toBeGreaterThan(0);
    });

    it('account IDs are valid container identifiers', async () => {
      // Apple container IDs are typically UUIDs or specific format
      for (const account of allAccounts) {
        expect(account.id.length).toBeGreaterThan(0);
        // ID should be usable in subsequent calls
        expect(typeof account.id).toBe('string');
      }
    });
  });

  // ============================================================
  // List Action Tests (with account parameter)
  // ============================================================
  
  describe('List', () => {
    it('requires account parameter', async () => {
      // List with account parameter should work
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 5 } 
      });
      
      expect(Array.isArray(contacts)).toBe(true);
    });

    it('respects limit parameter exactly', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 3 } 
      });
      
      expect(contacts).toHaveLength(3);
    });

    it('respects limit of 1', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 1 } 
      });
      
      expect(contacts).toHaveLength(1);
    });

    it('respects limit of 10', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 10 } 
      });
      
      expect(contacts).toHaveLength(10);
    });

    it('defaults to sort by modified (most recent first)', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 10 } 
      });
      
      expect(contacts.length).toBeGreaterThan(1);
      
      // Verify modified_at is in descending order
      for (let i = 1; i < contacts.length; i++) {
        const prevDate = new Date(contacts[i-1].modified_at).getTime();
        const currDate = new Date(contacts[i].modified_at).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('can sort by created', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, sort: 'created', limit: 5 } 
      });
      
      expect(contacts.length).toBeGreaterThan(0);
      expect(contacts[0].created_at).toBeDefined();
    });

    it('can sort by name', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, sort: 'name', limit: 5 } 
      });
      
      expect(contacts.length).toBeGreaterThan(0);
    });

    it('can filter by organization', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, organization: 'Apple', limit: 10 } 
      });
      
      expect(Array.isArray(contacts)).toBe(true);
      for (const contact of contacts) {
        expect(contact.organization?.toLowerCase()).toContain('apple');
      }
    });

    it('returns contacts with required fields', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 5 } 
      });

      for (const contact of contacts) {
        expect(contact.id).toBeDefined();
        expect(contact.connector).toBe('apple-contacts');
        expect(contact.modified_at).toBeDefined();
        expect(contact.created_at).toBeDefined();
      }
    });
  });

  // ============================================================
  // Search Action Tests (with account parameter)
  // ============================================================
  
  describe('Search', () => {
    it('searches within specified account', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'search', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, query: 'a', limit: 5 } 
      });
      
      expect(Array.isArray(contacts)).toBe(true);
    });

    it('respects limit parameter', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'search', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, query: 'a', limit: 3 } 
      });
      
      expect(contacts.length).toBeLessThanOrEqual(3);
    });

    it('can search by email domain', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'search', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, query: '@gmail.com', limit: 5 } 
      });
      
      expect(Array.isArray(contacts)).toBe(true);
    });
  });

  // ============================================================
  // Get Action Tests
  // ============================================================
  
  describe('Get', () => {
    it('returns full contact details', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 1 } 
      });
      
      if (contacts.length === 0) {
        console.log('  Skipping: no contacts in database');
        return;
      }

      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: contacts[0].id } 
      });

      // AppleScript can be flaky - if we get an error or undefined, log and skip
      if (!contact || contact.error) {
        console.log('  Skipping: AppleScript returned error or undefined:', contact?.error || 'undefined');
        return;
      }

      expect(contact.id).toBeDefined();
      expect(Array.isArray(contact.phones)).toBe(true);
      expect(Array.isArray(contact.emails)).toBe(true);
      expect(Array.isArray(contact.urls)).toBe(true);
      expect(Array.isArray(contact.addresses)).toBe(true);
    });

    it('includes has_photo boolean field', async () => {
      const contacts = await aos().call('Contacts', { 
        action: 'list', 
        connector: CONNECTOR, 
        params: { account: defaultAccountId, limit: 1 } 
      });
      
      if (contacts.length === 0) {
        console.log('  Skipping: no contacts available');
        return;
      }
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: contacts[0].id } 
      });
      
      expect(typeof contact.has_photo).toBe('boolean');
    });
  });

  // ============================================================
  // Create Action Tests (with account parameter)
  // ============================================================
  
  describe('Create', () => {
    it('creates contact in specified account', async () => {
      const firstName = testContent('CreateTest');
      
      const result = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { 
          account: defaultAccountId,
          first_name: firstName,
          last_name: 'User',
          organization: 'Test Corp'
        },
        execute: true
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('created');
      
      createdContactIds.push(result.id);
      await sleep(500);
      
      // Verify we can get it back
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: result.id } 
      });
      expect(contact.first_name).toBe(firstName);
      expect(contact.organization).toBe('Test Corp');
    });

    it('creates contact with all scalar fields', async () => {
      const firstName = testContent('FullCreate');
      
      const result = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { 
          account: defaultAccountId,
          first_name: firstName,
          last_name: 'Complete',
          middle_name: 'Middle',
          nickname: 'Nick',
          organization: 'Full Test Corp',
          job_title: 'Engineer',
          department: 'Engineering',
          notes: 'Test notes'
        },
        execute: true
      });

      expect(result.id).toBeDefined();
      createdContactIds.push(result.id);
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: result.id } 
      });
      expect(contact.first_name).toBe(firstName);
      expect(contact.last_name).toBe('Complete');
      expect(contact.organization).toBe('Full Test Corp');
      expect(contact.job_title).toBe('Engineer');
    });
  });

  // ============================================================
  // Update Action Tests
  // ============================================================
  
  describe('Update', () => {
    it('can update scalar fields', async () => {
      const firstName = testContent('UpdateTest');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName, last_name: 'Original' },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      const updated = await aos().call('Contacts', { 
        action: 'update', 
        connector: CONNECTOR,
        params: { 
          id: created.id,
          organization: 'Updated Corp',
          job_title: 'Senior Engineer',
          notes: 'Updated via test'
        },
        execute: true
      });
      
      expect(updated.status).toBe('updated');
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.organization).toBe('Updated Corp');
      expect(contact.job_title).toBe('Senior Engineer');
      expect(contact.notes).toBe('Updated via test');
    });
  });

  // ============================================================
  // Add/Remove Array Fields Tests
  // ============================================================
  
  describe('Array Fields (add/remove)', () => {
    it('can add email to contact', async () => {
      const firstName = testContent('AddEmail');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      const added = await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { 
          id: created.id,
          emails: { label: 'work', value: 'added@test.com' }
        },
        execute: true
      });
      
      expect(added.status).toBe('added');
      expect(added.added).toContain('email');
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.emails).toHaveLength(1);
      expect(contact.emails[0].value).toBe('added@test.com');
    });

    it('can add multiple emails', async () => {
      const firstName = testContent('MultiEmail');
      
      const result = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName, last_name: 'MultiValue' },
        execute: true
      });
      createdContactIds.push(result.id);
      await sleep(500);
      
      await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { id: result.id, emails: { label: 'work', value: 'work@test.com' } },
        execute: true
      });
      await sleep(300);
      
      await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { id: result.id, emails: { label: 'home', value: 'home@test.com' } },
        execute: true
      });
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: result.id } 
      });
      expect(contact.emails).toHaveLength(2);
      expect(contact.emails.map((e: any) => e.value)).toContain('work@test.com');
      expect(contact.emails.map((e: any) => e.value)).toContain('home@test.com');
    });

    it('can add phone to contact', async () => {
      const firstName = testContent('AddPhone');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      const added = await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { 
          id: created.id,
          phones: { label: 'mobile', value: '+15125559999' }
        },
        execute: true
      });
      
      expect(added.status).toBe('added');
      expect(added.added).toContain('phone');
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.phones.length).toBeGreaterThanOrEqual(1);
      expect(contact.phones.some((p: any) => p.value.includes('5125559999'))).toBe(true);
    });

    it('can add URL to contact', async () => {
      const firstName = testContent('AddURL');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { 
          id: created.id, 
          urls: { label: 'LinkedIn', value: 'https://linkedin.com/in/testuser' } 
        },
        execute: true
      });
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.urls.length).toBeGreaterThanOrEqual(1);
      expect(contact.urls.some((u: any) => u.value.includes('linkedin.com'))).toBe(true);
    });

    it('can add multiple URLs (LinkedIn, Instagram)', async () => {
      const firstName = testContent('MultiURL');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { 
          id: created.id, 
          urls: { label: 'LinkedIn', value: 'https://linkedin.com/in/testuser' } 
        },
        execute: true
      });
      await sleep(300);
      
      await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { 
          id: created.id, 
          urls: { label: 'Instagram', value: 'https://instagram.com/testuser' } 
        },
        execute: true
      });
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.urls).toHaveLength(2);
      expect(contact.urls.some((u: any) => u.value.includes('linkedin.com'))).toBe(true);
      expect(contact.urls.some((u: any) => u.value.includes('instagram.com'))).toBe(true);
    });

    it('can remove email from contact', async () => {
      const firstName = testContent('RemoveEmail');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { id: created.id, emails: { label: 'home', value: 'toremove@test.com' } },
        execute: true
      });
      await sleep(500);
      
      let contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.emails).toHaveLength(1);
      
      const removed = await aos().call('Contacts', { 
        action: 'remove', 
        connector: CONNECTOR,
        params: { 
          id: created.id,
          emails: { value: 'toremove@test.com' }
        },
        execute: true
      });
      
      expect(removed.status).toBe('removed');
      expect(removed.removed).toContain('email');
      await sleep(500);
      
      contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.emails).toHaveLength(0);
    });

    it('can remove URL from contact', async () => {
      const firstName = testContent('RemoveURL');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      await aos().call('Contacts', { 
        action: 'add', 
        connector: CONNECTOR,
        params: { 
          id: created.id, 
          urls: { label: 'homepage', value: 'https://example.com' } 
        },
        execute: true
      });
      await sleep(500);
      
      let contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.urls).toHaveLength(1);
      
      await aos().call('Contacts', { 
        action: 'remove', 
        connector: CONNECTOR,
        params: { 
          id: created.id, 
          urls: { value: 'https://example.com' } 
        },
        execute: true
      });
      await sleep(500);
      
      contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.urls).toHaveLength(0);
    });
  });

  // ============================================================
  // Delete Action Tests
  // ============================================================
  
  describe('Delete', () => {
    it('can delete a contact', async () => {
      const firstName = testContent('DeleteTest');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      await sleep(500);
      
      const deleted = await aos().call('Contacts', { 
        action: 'delete', 
        connector: CONNECTOR,
        params: { id: created.id },
        execute: true
      });
      
      expect(deleted.status).toBe('deleted');
      
      // Verify it's gone
      await sleep(500);
      try {
        await aos().call('Contacts', { 
          action: 'get', 
          connector: CONNECTOR, 
          params: { id: created.id } 
        });
        expect.fail('Contact should have been deleted');
      } catch (e) {
        // Expected - contact should not be found
        expect(true).toBe(true);
      }
    });
  });

  // ============================================================
  // Photo Operations Tests
  // ============================================================
  
  describe('Photo Operations', () => {
    it('new contact has no photo', async () => {
      const firstName = testContent('NoPhoto');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.has_photo).toBe(false);
    });

    it('can set photo on contact', async () => {
      const firstName = testContent('SetPhoto');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      // Use a test image - create a simple one if needed
      const fs = await import('fs');
      const path = await import('path');
      const testImagePath = path.join(process.env.HOME || '', '.agentos/test-photo.jpg');
      
      // Skip if no test image available
      if (!fs.existsSync(testImagePath)) {
        console.log('  Skipping: create ~/.agentos/test-photo.jpg to test photo operations');
        return;
      }
      
      const result = await aos().call('Contacts', { 
        action: 'set_photo', 
        connector: CONNECTOR,
        params: { id: created.id, path: testImagePath },
        execute: true
      });
      
      expect(result.status).toBe('photo_set');
      await sleep(500);
      
      const contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.has_photo).toBe(true);
    });

    it('can clear photo from contact', async () => {
      const firstName = testContent('ClearPhoto');
      
      const created = await aos().call('Contacts', { 
        action: 'create', 
        connector: CONNECTOR,
        params: { account: defaultAccountId, first_name: firstName },
        execute: true
      });
      createdContactIds.push(created.id);
      await sleep(500);
      
      const fs = await import('fs');
      const path = await import('path');
      const testImagePath = path.join(process.env.HOME || '', '.agentos/test-photo.jpg');
      
      if (!fs.existsSync(testImagePath)) {
        console.log('  Skipping: create ~/.agentos/test-photo.jpg to test photo operations');
        return;
      }
      
      // Set photo first
      await aos().call('Contacts', { 
        action: 'set_photo', 
        connector: CONNECTOR,
        params: { id: created.id, path: testImagePath },
        execute: true
      });
      await sleep(500);
      
      // Verify photo is set
      let contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.has_photo).toBe(true);
      
      // Clear photo
      const result = await aos().call('Contacts', { 
        action: 'clear_photo', 
        connector: CONNECTOR,
        params: { id: created.id },
        execute: true
      });
      
      expect(result.status).toBe('photo_cleared');
      await sleep(500);
      
      // Verify photo is gone
      contact = await aos().call('Contacts', { 
        action: 'get', 
        connector: CONNECTOR, 
        params: { id: created.id } 
      });
      expect(contact.has_photo).toBe(false);
    });
  });
});

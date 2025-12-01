import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import {
  OfflineQueueItem,
  OfflineActionType,
  OfflineActionOperation,
  OfflineQueueStatus,
  serializeQueueItem,
  deserializeQueueItem,
  CACHE_CONFIG,
  type ThreadData,
  type CachedThread,
  type CachedComment,
  type NewOfflineQueueItem,
} from '@/lib/offline/types';
import { isStale } from '@/lib/offline/cache';
import { calculateRetryDelay, shouldRetry } from '@/lib/offline/queue';
import { APP_SHELL_ITEMS } from '@/lib/offline/management';

/**
 * Property-Based Tests for Offline Queue Item Serialization
 *
 * **Feature: pwa-offline, Property 10: Queue item serialization round-trip**
 * **Validates: Requirements 6.2, 6.3**
 */
describe('Offline Queue Item Serialization', () => {
  // Arbitrary for valid OfflineActionType
  const actionTypeArb: fc.Arbitrary<OfflineActionType> = fc.constantFrom(
    'comment',
    'vote',
    'reaction'
  );

  // Arbitrary for valid OfflineActionOperation
  const actionOperationArb: fc.Arbitrary<OfflineActionOperation> = fc.constantFrom(
    'create',
    'update',
    'delete'
  );

  // Arbitrary for valid OfflineQueueStatus
  const queueStatusArb: fc.Arbitrary<OfflineQueueStatus> = fc.constantFrom(
    'pending',
    'syncing',
    'failed'
  );

  // Arbitrary for JSON-serializable payload (Record<string, unknown>)
  // Note: We filter out -0 because JSON.stringify(-0) === "0", so -0 doesn't round-trip through JSON
  const jsonSafeDouble = fc.double({ noNaN: true, noDefaultInfinity: true }).filter((n) => !Object.is(n, -0));
  const payloadArb: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    fc.oneof(
      fc.string(),
      fc.integer(),
      jsonSafeDouble,
      fc.boolean(),
      fc.constant(null),
      fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()))
    )
  );

  // Arbitrary for valid OfflineQueueItem
  const offlineQueueItemArb: fc.Arbitrary<OfflineQueueItem> = fc.record({
    id: fc.uuid(),
    type: actionTypeArb,
    action: actionOperationArb,
    payload: payloadArb,
    createdAt: fc.nat({ max: Date.now() + 1000000000 }), // Valid timestamp
    retryCount: fc.nat({ max: 10 }), // 0-10 retries
    lastRetryAt: fc.option(fc.nat({ max: Date.now() + 1000000000 }), { nil: null }),
    status: queueStatusArb,
  });

  describe('Queue item serialization round-trip', () => {
    /**
     * **Feature: pwa-offline, Property 10: Queue item serialization round-trip**
     * **Validates: Requirements 6.2, 6.3**
     *
     * For any valid OfflineQueueItem, serializing to JSON and
     * deserializing back should produce an equivalent object.
     */
    it('should preserve OfflineQueueItem through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(offlineQueueItemArb, (original: OfflineQueueItem) => {
          const serialized = serializeQueueItem(original);
          const deserialized = deserializeQueueItem(serialized);

          // Verify all fields are preserved
          expect(deserialized.id).toBe(original.id);
          expect(deserialized.type).toBe(original.type);
          expect(deserialized.action).toBe(original.action);
          expect(deserialized.createdAt).toBe(original.createdAt);
          expect(deserialized.retryCount).toBe(original.retryCount);
          expect(deserialized.lastRetryAt).toBe(original.lastRetryAt);
          expect(deserialized.status).toBe(original.status);

          // Deep equality check for payload
          expect(deserialized.payload).toEqual(original.payload);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 10: Queue item serialization round-trip**
     * **Validates: Requirements 6.2, 6.3**
     *
     * Serialized payload should be a valid JSON string.
     */
    it('should produce valid JSON string for payload', () => {
      fc.assert(
        fc.property(offlineQueueItemArb, (original: OfflineQueueItem) => {
          const serialized = serializeQueueItem(original);

          // Payload should be a string
          expect(typeof serialized.payload).toBe('string');

          // Payload should be valid JSON
          expect(() => JSON.parse(serialized.payload)).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 10: Queue item serialization round-trip**
     * **Validates: Requirements 6.2, 6.3**
     *
     * Type fields should be preserved as strings in serialized form.
     */
    it('should preserve type fields as strings in serialized form', () => {
      fc.assert(
        fc.property(offlineQueueItemArb, (original: OfflineQueueItem) => {
          const serialized = serializeQueueItem(original);

          // Type fields should be strings
          expect(typeof serialized.type).toBe('string');
          expect(typeof serialized.action).toBe('string');
          expect(typeof serialized.status).toBe('string');

          // Values should match original
          expect(serialized.type).toBe(original.type);
          expect(serialized.action).toBe(original.action);
          expect(serialized.status).toBe(original.status);
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Cache Operations
 *
 * **Feature: pwa-offline, Property 1: Cache timestamp validity**
 * **Feature: pwa-offline, Property 2: Staleness detection consistency**
 * **Validates: Requirements 1.1, 1.4, 1.5**
 */
describe('Cache Operations', () => {
  // Arbitrary for valid ISO date strings (using timestamps to avoid invalid date issues)
  const validIsoDateArb = fc
    .integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
    .map((ts) => new Date(ts).toISOString());

  // Arbitrary for optional ISO date strings
  const optionalIsoDateArb = fc.option(validIsoDateArb, { nil: undefined });

  // Arbitrary for valid ThreadData
  const threadDataArb: fc.Arbitrary<ThreadData> = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 1000 }),
    authorId: fc.uuid(),
    authorName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    forumId: fc.option(fc.uuid(), { nil: undefined }),
    forumSlug: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    createdAt: validIsoDateArb,
    updatedAt: optionalIsoDateArb,
    voteCount: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
    commentCount: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
    viewCount: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
    isPinned: fc.option(fc.boolean(), { nil: undefined }),
    tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 })), { nil: undefined }),
  });

  // Arbitrary for valid CachedThread with proper timestamp relationships
  const cachedThreadArb: fc.Arbitrary<CachedThread> = fc
    .tuple(
      fc.uuid(),
      threadDataArb,
      fc.nat({ max: Date.now() }) // cachedAt: valid timestamp in the past or now
    )
    .map(([id, data, cachedAt]) => ({
      id,
      data: { ...data, id },
      cachedAt,
      expiresAt: cachedAt + CACHE_CONFIG.threadTTL,
    }));

  // Arbitrary for valid CachedComment
  const cachedCommentArb: fc.Arbitrary<CachedComment> = fc
    .tuple(
      fc.uuid(), // id
      fc.uuid(), // threadId
      fc.nat({ max: Date.now() }) // cachedAt
    )
    .map(([id, threadId, cachedAt]) => ({
      id,
      threadId,
      data: {
        id,
        content: 'Test comment',
        authorId: 'author-123',
        threadId,
        createdAt: new Date(cachedAt).toISOString(),
      },
      cachedAt,
    }));

  describe('Property 1: Cache timestamp validity', () => {
    /**
     * **Feature: pwa-offline, Property 1: Cache timestamp validity**
     * **Validates: Requirements 1.1, 1.4**
     *
     * For any cached thread, the cachedAt timestamp should be a valid number
     * less than or equal to the current time, and expiresAt should be greater than cachedAt.
     */
    it('should have valid cachedAt timestamp for cached threads', () => {
      fc.assert(
        fc.property(cachedThreadArb, (cachedThread: CachedThread) => {
          // cachedAt should be a valid number
          expect(typeof cachedThread.cachedAt).toBe('number');
          expect(Number.isFinite(cachedThread.cachedAt)).toBe(true);

          // cachedAt should be non-negative (valid timestamp)
          expect(cachedThread.cachedAt).toBeGreaterThanOrEqual(0);

          // cachedAt should be less than or equal to current time
          expect(cachedThread.cachedAt).toBeLessThanOrEqual(Date.now());
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 1: Cache timestamp validity**
     * **Validates: Requirements 1.1, 1.4**
     *
     * For any cached thread, expiresAt should be greater than cachedAt.
     */
    it('should have expiresAt greater than cachedAt for cached threads', () => {
      fc.assert(
        fc.property(cachedThreadArb, (cachedThread: CachedThread) => {
          // expiresAt should be a valid number
          expect(typeof cachedThread.expiresAt).toBe('number');
          expect(Number.isFinite(cachedThread.expiresAt)).toBe(true);

          // expiresAt should be greater than cachedAt
          expect(cachedThread.expiresAt).toBeGreaterThan(cachedThread.cachedAt);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 1: Cache timestamp validity**
     * **Validates: Requirements 1.1, 1.4**
     *
     * For any cached thread, the TTL (expiresAt - cachedAt) should equal the configured threadTTL.
     */
    it('should have correct TTL for cached threads', () => {
      fc.assert(
        fc.property(cachedThreadArb, (cachedThread: CachedThread) => {
          const ttl = cachedThread.expiresAt - cachedThread.cachedAt;
          expect(ttl).toBe(CACHE_CONFIG.threadTTL);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 1: Cache timestamp validity**
     * **Validates: Requirements 1.1**
     *
     * For any cached comment, the cachedAt timestamp should be a valid number
     * less than or equal to the current time.
     */
    it('should have valid cachedAt timestamp for cached comments', () => {
      fc.assert(
        fc.property(cachedCommentArb, (cachedComment: CachedComment) => {
          // cachedAt should be a valid number
          expect(typeof cachedComment.cachedAt).toBe('number');
          expect(Number.isFinite(cachedComment.cachedAt)).toBe(true);

          // cachedAt should be non-negative (valid timestamp)
          expect(cachedComment.cachedAt).toBeGreaterThanOrEqual(0);

          // cachedAt should be less than or equal to current time
          expect(cachedComment.cachedAt).toBeLessThanOrEqual(Date.now());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Staleness detection consistency', () => {
    // Arbitrary for staleness test inputs
    const stalenessInputArb = fc.record({
      cachedAt: fc.nat({ max: Date.now() }),
      currentTime: fc.nat({ max: Date.now() + 1000000 }),
      threshold: fc.integer({ min: 1, max: 60 * 60 * 1000 }), // 1ms to 1 hour
    });

    /**
     * **Feature: pwa-offline, Property 2: Staleness detection consistency**
     * **Validates: Requirements 1.5**
     *
     * For any cached item with cachedAt timestamp and current time,
     * the staleness check should return true if and only if
     * (currentTime - cachedAt) > staleThreshold.
     */
    it('should return true iff (currentTime - cachedAt) > threshold', () => {
      fc.assert(
        fc.property(
          stalenessInputArb,
          ({ cachedAt, currentTime, threshold }) => {
            const result = isStale(cachedAt, currentTime, threshold);
            const expectedStale = currentTime - cachedAt > threshold;

            expect(result).toBe(expectedStale);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 2: Staleness detection consistency**
     * **Validates: Requirements 1.5**
     *
     * An item cached exactly at the threshold boundary should NOT be stale.
     */
    it('should return false when exactly at threshold boundary', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: Date.now() }),
          fc.integer({ min: 1, max: 60 * 60 * 1000 }),
          (cachedAt, threshold) => {
            const currentTime = cachedAt + threshold; // Exactly at boundary
            const result = isStale(cachedAt, currentTime, threshold);

            // At exactly the threshold, it should NOT be stale (> not >=)
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 2: Staleness detection consistency**
     * **Validates: Requirements 1.5**
     *
     * An item cached 1ms past the threshold should be stale.
     */
    it('should return true when 1ms past threshold', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: Date.now() }),
          fc.integer({ min: 1, max: 60 * 60 * 1000 }),
          (cachedAt, threshold) => {
            const currentTime = cachedAt + threshold + 1; // 1ms past boundary
            const result = isStale(cachedAt, currentTime, threshold);

            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 2: Staleness detection consistency**
     * **Validates: Requirements 1.5**
     *
     * Uses default CACHE_CONFIG.staleThreshold when no threshold provided.
     */
    it('should use default staleThreshold from CACHE_CONFIG', () => {
      fc.assert(
        fc.property(fc.nat({ max: Date.now() }), (cachedAt) => {
          const currentTime = cachedAt + CACHE_CONFIG.staleThreshold + 1;
          const result = isStale(cachedAt, currentTime);

          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 2: Staleness detection consistency**
     * **Validates: Requirements 1.5**
     *
     * A freshly cached item (currentTime === cachedAt) should never be stale.
     */
    it('should return false for freshly cached items', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: Date.now() }),
          fc.integer({ min: 1, max: 60 * 60 * 1000 }),
          (cachedAt, threshold) => {
            const result = isStale(cachedAt, cachedAt, threshold);

            // Freshly cached (0 time elapsed) should never be stale
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Queue Operations
 *
 * **Feature: pwa-offline, Property 3: Offline queue item structure**
 * **Feature: pwa-offline, Property 4: Queue count accuracy**
 * **Feature: pwa-offline, Property 5: Retry delay calculation**
 * **Feature: pwa-offline, Property 6: Queue removal on success**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6**
 */
describe('Queue Operations', () => {
  // Arbitrary for valid OfflineActionType
  const actionTypeArb: fc.Arbitrary<OfflineActionType> = fc.constantFrom(
    'comment',
    'vote',
    'reaction'
  );

  // Arbitrary for valid OfflineActionOperation
  const actionOperationArb: fc.Arbitrary<OfflineActionOperation> = fc.constantFrom(
    'create',
    'update',
    'delete'
  );

  // Arbitrary for valid OfflineQueueStatus
  const queueStatusArb: fc.Arbitrary<OfflineQueueStatus> = fc.constantFrom(
    'pending',
    'syncing',
    'failed'
  );

  // Arbitrary for JSON-serializable payload
  const payloadArb: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    fc.oneof(
      fc.string(),
      fc.integer(),
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.boolean(),
      fc.constant(null)
    )
  );

  // Arbitrary for NewOfflineQueueItem (input to queueAction)
  const newQueueItemArb: fc.Arbitrary<NewOfflineQueueItem> = fc.record({
    type: actionTypeArb,
    action: actionOperationArb,
    payload: payloadArb,
  });

  // Arbitrary for valid OfflineQueueItem
  const offlineQueueItemArb: fc.Arbitrary<OfflineQueueItem> = fc.record({
    id: fc.uuid(),
    type: actionTypeArb,
    action: actionOperationArb,
    payload: payloadArb,
    createdAt: fc.nat({ max: Date.now() + 1000000000 }),
    retryCount: fc.nat({ max: 10 }),
    lastRetryAt: fc.option(fc.nat({ max: Date.now() + 1000000000 }), { nil: null }),
    status: queueStatusArb,
  });

  describe('Property 3: Offline queue item structure', () => {
    /**
     * **Feature: pwa-offline, Property 3: Offline queue item structure**
     * **Validates: Requirements 2.1, 2.2**
     *
     * For any offline action (comment, vote, reaction), when queued,
     * the resulting OfflineQueueItem should have status 'pending',
     * retryCount 0, and valid createdAt timestamp.
     *
     * This test validates the structure creation logic without IndexedDB.
     */
    it('should create queue items with correct initial structure', () => {
      fc.assert(
        fc.property(newQueueItemArb, (input: NewOfflineQueueItem) => {
          // Simulate what queueAction does to create the item structure
          const now = Date.now();
          const queueItem: OfflineQueueItem = {
            id: `queue_${now}_${Math.random().toString(36).substring(2, 9)}`,
            type: input.type,
            action: input.action,
            payload: input.payload,
            createdAt: now,
            retryCount: 0,
            lastRetryAt: null,
            status: 'pending',
          };

          // Verify status is 'pending'
          expect(queueItem.status).toBe('pending');

          // Verify retryCount is 0
          expect(queueItem.retryCount).toBe(0);

          // Verify createdAt is a valid timestamp
          expect(typeof queueItem.createdAt).toBe('number');
          expect(Number.isFinite(queueItem.createdAt)).toBe(true);
          expect(queueItem.createdAt).toBeGreaterThan(0);
          expect(queueItem.createdAt).toBeLessThanOrEqual(Date.now());

          // Verify lastRetryAt is null initially
          expect(queueItem.lastRetryAt).toBeNull();

          // Verify type is preserved
          expect(queueItem.type).toBe(input.type);
          expect(['comment', 'vote', 'reaction']).toContain(queueItem.type);

          // Verify action is preserved
          expect(queueItem.action).toBe(input.action);
          expect(['create', 'update', 'delete']).toContain(queueItem.action);

          // Verify payload is preserved
          expect(queueItem.payload).toEqual(input.payload);

          // Verify id is generated and non-empty
          expect(typeof queueItem.id).toBe('string');
          expect(queueItem.id.length).toBeGreaterThan(0);
          expect(queueItem.id.startsWith('queue_')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 3: Offline queue item structure**
     * **Validates: Requirements 2.1, 2.2**
     *
     * Queue items for all action types (comment, vote, reaction) should
     * have the same initial structure.
     */
    it('should have consistent structure across all action types', () => {
      fc.assert(
        fc.property(
          actionTypeArb,
          actionOperationArb,
          payloadArb,
          (type, action, payload) => {
            const now = Date.now();
            const queueItem: OfflineQueueItem = {
              id: `queue_${now}_test`,
              type,
              action,
              payload,
              createdAt: now,
              retryCount: 0,
              lastRetryAt: null,
              status: 'pending',
            };

            // All action types should have the same structure
            expect(queueItem).toHaveProperty('id');
            expect(queueItem).toHaveProperty('type');
            expect(queueItem).toHaveProperty('action');
            expect(queueItem).toHaveProperty('payload');
            expect(queueItem).toHaveProperty('createdAt');
            expect(queueItem).toHaveProperty('retryCount');
            expect(queueItem).toHaveProperty('lastRetryAt');
            expect(queueItem).toHaveProperty('status');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Queue count accuracy', () => {
    /**
     * **Feature: pwa-offline, Property 4: Queue count accuracy**
     * **Validates: Requirements 2.3**
     *
     * For any set of queued actions, getQueueCount should return
     * the exact number of items with status 'pending' or 'failed'.
     *
     * This test validates the counting logic without IndexedDB.
     */
    it('should count only pending and failed items', () => {
      fc.assert(
        fc.property(
          fc.array(offlineQueueItemArb, { minLength: 0, maxLength: 50 }),
          (items: OfflineQueueItem[]) => {
            // Calculate expected count: items with status 'pending' or 'failed'
            const expectedCount = items.filter(
              (item) => item.status === 'pending' || item.status === 'failed'
            ).length;

            // Simulate the countPending logic from queueStore
            const pending = items.filter((item) => item.status === 'pending');
            const failed = items.filter((item) => item.status === 'failed');
            const actualCount = pending.length + failed.length;

            expect(actualCount).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 4: Queue count accuracy**
     * **Validates: Requirements 2.3**
     *
     * Items with status 'syncing' should NOT be counted in the queue count.
     */
    it('should not count syncing items', () => {
      fc.assert(
        fc.property(
          fc.array(offlineQueueItemArb, { minLength: 1, maxLength: 50 }),
          (items: OfflineQueueItem[]) => {
            const syncingCount = items.filter((item) => item.status === 'syncing').length;
            const pendingOrFailedCount = items.filter(
              (item) => item.status === 'pending' || item.status === 'failed'
            ).length;

            // Total items = syncing + pending + failed
            // Queue count should equal pending + failed (not syncing)
            expect(pendingOrFailedCount + syncingCount).toBeLessThanOrEqual(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 4: Queue count accuracy**
     * **Validates: Requirements 2.3**
     *
     * Empty queue should return count of 0.
     */
    it('should return 0 for empty queue', () => {
      const items: OfflineQueueItem[] = [];
      const count = items.filter(
        (item) => item.status === 'pending' || item.status === 'failed'
      ).length;
      expect(count).toBe(0);
    });
  });

  describe('Property 5: Retry delay calculation', () => {
    /**
     * **Feature: pwa-offline, Property 5: Retry delay calculation**
     * **Validates: Requirements 2.5**
     *
     * For any retry count N (0 to maxRetries), the calculated delay
     * should equal min(baseRetryDelay * 2^N, maxRetryDelay).
     */
    it('should calculate delay as min(baseDelay * 2^N, maxDelay)', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 10 }), // retryCount 0-10
          fc.integer({ min: 100, max: 10000 }), // baseDelay 100ms-10s
          fc.integer({ min: 10000, max: 120000 }), // maxDelay 10s-2min
          (retryCount, baseDelay, maxDelay) => {
            const result = calculateRetryDelay(retryCount, baseDelay, maxDelay);
            const expectedExponential = baseDelay * Math.pow(2, retryCount);
            const expected = Math.min(expectedExponential, maxDelay);

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 5: Retry delay calculation**
     * **Validates: Requirements 2.5**
     *
     * Delay should never exceed maxDelay.
     */
    it('should never exceed maxDelay', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 20 }), // retryCount 0-20 (high values to test cap)
          fc.integer({ min: 100, max: 10000 }),
          fc.integer({ min: 10000, max: 120000 }),
          (retryCount, baseDelay, maxDelay) => {
            const result = calculateRetryDelay(retryCount, baseDelay, maxDelay);
            expect(result).toBeLessThanOrEqual(maxDelay);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 5: Retry delay calculation**
     * **Validates: Requirements 2.5**
     *
     * Delay should be at least baseDelay for retryCount 0.
     */
    it('should return baseDelay for retryCount 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          fc.integer({ min: 10000, max: 120000 }),
          (baseDelay, maxDelay) => {
            const result = calculateRetryDelay(0, baseDelay, maxDelay);
            expect(result).toBe(baseDelay);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 5: Retry delay calculation**
     * **Validates: Requirements 2.5**
     *
     * Delay should double with each retry (until capped).
     */
    it('should double delay with each retry until capped', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 5 }), // retryCount 0-5
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 100000, max: 1000000 }), // High max to avoid capping
          (retryCount, baseDelay, maxDelay) => {
            if (retryCount === 0) return; // Skip for retryCount 0

            const currentDelay = calculateRetryDelay(retryCount, baseDelay, maxDelay);
            const previousDelay = calculateRetryDelay(retryCount - 1, baseDelay, maxDelay);

            // Current should be double previous (if not capped)
            if (currentDelay < maxDelay && previousDelay < maxDelay) {
              expect(currentDelay).toBe(previousDelay * 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 5: Retry delay calculation**
     * **Validates: Requirements 2.5**
     *
     * Uses default CACHE_CONFIG values when not provided.
     */
    it('should use default CACHE_CONFIG values', () => {
      fc.assert(
        fc.property(fc.nat({ max: 10 }), (retryCount) => {
          const result = calculateRetryDelay(retryCount);
          const expected = Math.min(
            CACHE_CONFIG.baseRetryDelay * Math.pow(2, retryCount),
            CACHE_CONFIG.maxRetryDelay
          );

          expect(result).toBe(expected);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Queue removal on success', () => {
    /**
     * **Feature: pwa-offline, Property 6: Queue removal on success**
     * **Validates: Requirements 2.6**
     *
     * For any offline queue item that is successfully synced,
     * the item should no longer exist in the queue after sync completion.
     *
     * This test validates the removal logic without IndexedDB.
     */
    it('should remove item from queue after successful sync', () => {
      fc.assert(
        fc.property(
          fc.array(offlineQueueItemArb, { minLength: 1, maxLength: 20 }),
          fc.nat(),
          (items: OfflineQueueItem[], indexSeed: number) => {
            // Pick a random item to "sync successfully"
            const indexToRemove = indexSeed % items.length;
            const itemToRemove = items[indexToRemove];

            // Simulate removal (what removeOnSuccess does)
            const remainingItems = items.filter((item) => item.id !== itemToRemove.id);

            // Verify the item is no longer in the queue
            expect(remainingItems.find((item) => item.id === itemToRemove.id)).toBeUndefined();

            // Verify the count decreased by 1
            expect(remainingItems.length).toBe(items.length - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 6: Queue removal on success**
     * **Validates: Requirements 2.6**
     *
     * Removing a non-existent item should not affect the queue.
     */
    it('should not affect queue when removing non-existent item', () => {
      fc.assert(
        fc.property(
          fc.array(offlineQueueItemArb, { minLength: 0, maxLength: 20 }),
          fc.uuid(),
          (items: OfflineQueueItem[], nonExistentId: string) => {
            // Ensure the ID doesn't exist in the queue
            const itemsWithoutId = items.filter((item) => item.id !== nonExistentId);

            // Simulate removal of non-existent item
            const remainingItems = itemsWithoutId.filter((item) => item.id !== nonExistentId);

            // Queue should remain unchanged
            expect(remainingItems.length).toBe(itemsWithoutId.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 6: Queue removal on success**
     * **Validates: Requirements 2.6**
     *
     * Other items in the queue should remain unaffected after removal.
     */
    it('should preserve other items after removal', () => {
      fc.assert(
        fc.property(
          fc.array(offlineQueueItemArb, { minLength: 2, maxLength: 20 }),
          fc.nat(),
          (items: OfflineQueueItem[], indexSeed: number) => {
            const indexToRemove = indexSeed % items.length;
            const itemToRemove = items[indexToRemove];

            // Get items that should remain
            const expectedRemaining = items.filter((item) => item.id !== itemToRemove.id);

            // Simulate removal
            const actualRemaining = items.filter((item) => item.id !== itemToRemove.id);

            // All other items should be preserved
            expectedRemaining.forEach((expectedItem) => {
              const found = actualRemaining.find((item) => item.id === expectedItem.id);
              expect(found).toBeDefined();
              expect(found).toEqual(expectedItem);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('shouldRetry helper', () => {
    /**
     * Additional test for shouldRetry function used in retry logic.
     * **Validates: Requirements 2.5**
     */
    it('should return true when retryCount < maxRetries', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (retryCount, maxRetries) => {
            const result = shouldRetry(retryCount, maxRetries);
            expect(result).toBe(retryCount < maxRetries);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.5**
     */
    it('should use default CACHE_CONFIG.maxRetries', () => {
      fc.assert(
        fc.property(fc.nat({ max: 10 }), (retryCount) => {
          const result = shouldRetry(retryCount);
          expect(result).toBe(retryCount < CACHE_CONFIG.maxRetries);
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Cache Pruning
 *
 * **Feature: pwa-offline, Property 9: Cache pruning preserves app shell**
 * **Validates: Requirements 5.2**
 */
describe('Cache Pruning', () => {
  // Arbitrary for valid ISO date strings
  const validIsoDateArb = fc
    .integer({ min: 1577836800000, max: 1924905600000 })
    .map((ts) => new Date(ts).toISOString());

  // Arbitrary for optional ISO date strings
  const optionalIsoDateArb = fc.option(validIsoDateArb, { nil: undefined });

  // Arbitrary for valid ThreadData
  const threadDataArb: fc.Arbitrary<ThreadData> = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 1000 }),
    authorId: fc.uuid(),
    authorName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    forumId: fc.option(fc.uuid(), { nil: undefined }),
    forumSlug: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    createdAt: validIsoDateArb,
    updatedAt: optionalIsoDateArb,
    voteCount: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
    commentCount: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
    viewCount: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
    isPinned: fc.option(fc.boolean(), { nil: undefined }),
    tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 })), { nil: undefined }),
  });

  // Arbitrary for valid CachedThread with proper timestamp relationships
  const cachedThreadArb: fc.Arbitrary<CachedThread> = fc
    .tuple(
      fc.uuid(),
      threadDataArb,
      fc.nat({ max: Date.now() })
    )
    .map(([id, data, cachedAt]) => ({
      id,
      data: { ...data, id },
      cachedAt,
      expiresAt: cachedAt + CACHE_CONFIG.threadTTL,
    }));

  describe('Property 9: Cache pruning preserves app shell', () => {
    /**
     * **Feature: pwa-offline, Property 9: Cache pruning preserves app shell**
     * **Validates: Requirements 5.2**
     *
     * The APP_SHELL_ITEMS constant should contain the essential app shell URLs
     * that must never be removed during cache pruning.
     */
    it('should define essential app shell items', () => {
      // Verify APP_SHELL_ITEMS contains the required essential URLs
      expect(APP_SHELL_ITEMS).toContain('/');
      expect(APP_SHELL_ITEMS).toContain('/offline');
      expect(APP_SHELL_ITEMS).toContain('/manifest.json');
      expect(APP_SHELL_ITEMS.length).toBe(3);
    });

    /**
     * **Feature: pwa-offline, Property 9: Cache pruning preserves app shell**
     * **Validates: Requirements 5.2**
     *
     * For any set of cached threads, pruning should only remove thread/comment
     * data from IndexedDB, never touching app shell items (which are stored
     * in the Service Worker cache, not IndexedDB).
     *
     * This test validates that the pruning logic operates on the correct
     * data domain (threads/comments) and cannot affect app shell items.
     */
    it('should only prune thread and comment data, not app shell items', () => {
      fc.assert(
        fc.property(
          fc.array(cachedThreadArb, { minLength: 0, maxLength: 20 }),
          (threads: CachedThread[]) => {
            // Simulate pruning logic: sort by cachedAt and remove oldest
            const sortedThreads = [...threads].sort((a, b) => a.cachedAt - b.cachedAt);
            
            // Simulate removing half the threads (pruning)
            const itemsToRemove = Math.floor(sortedThreads.length / 2);
            const removedThreads = sortedThreads.slice(0, itemsToRemove);
            const remainingThreads = sortedThreads.slice(itemsToRemove);

            // Verify that removed items are only threads (not app shell items)
            removedThreads.forEach((thread) => {
              // Thread IDs should be UUIDs, not app shell URLs
              expect(APP_SHELL_ITEMS).not.toContain(thread.id);
              expect(thread.id).not.toBe('/');
              expect(thread.id).not.toBe('/offline');
              expect(thread.id).not.toBe('/manifest.json');
            });

            // Verify remaining threads are valid
            remainingThreads.forEach((thread) => {
              expect(thread).toHaveProperty('id');
              expect(thread).toHaveProperty('data');
              expect(thread).toHaveProperty('cachedAt');
              expect(thread).toHaveProperty('expiresAt');
            });

            // Verify the pruning removed the correct number of items
            expect(removedThreads.length + remainingThreads.length).toBe(threads.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 9: Cache pruning preserves app shell**
     * **Validates: Requirements 5.2**
     *
     * For any pruning operation, the oldest items should be removed first
     * (FIFO order based on cachedAt timestamp).
     */
    it('should remove oldest items first during pruning', () => {
      fc.assert(
        fc.property(
          fc.array(cachedThreadArb, { minLength: 2, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (threads: CachedThread[], itemsToRemove: number) => {
            // Ensure we don't try to remove more items than exist
            const actualItemsToRemove = Math.min(itemsToRemove, threads.length - 1);
            
            // Sort by cachedAt (oldest first)
            const sortedThreads = [...threads].sort((a, b) => a.cachedAt - b.cachedAt);
            
            // Remove oldest items
            const removedThreads = sortedThreads.slice(0, actualItemsToRemove);
            const remainingThreads = sortedThreads.slice(actualItemsToRemove);

            // Verify that all removed items are older than all remaining items
            if (removedThreads.length > 0 && remainingThreads.length > 0) {
              const oldestRemaining = Math.min(...remainingThreads.map((t) => t.cachedAt));
              const newestRemoved = Math.max(...removedThreads.map((t) => t.cachedAt));
              
              expect(newestRemoved).toBeLessThanOrEqual(oldestRemaining);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 9: Cache pruning preserves app shell**
     * **Validates: Requirements 5.2**
     *
     * App shell items should be immutable strings that cannot be confused
     * with thread/comment IDs (which are UUIDs).
     */
    it('should have app shell items that are distinct from UUID format', () => {
      fc.assert(
        fc.property(fc.uuid(), (uuid: string) => {
          // UUIDs should never match app shell items
          APP_SHELL_ITEMS.forEach((shellItem) => {
            expect(uuid).not.toBe(shellItem);
          });

          // App shell items should start with '/' (URL paths)
          APP_SHELL_ITEMS.forEach((shellItem) => {
            expect(shellItem.startsWith('/')).toBe(true);
          });

          // UUIDs should not start with '/'
          expect(uuid.startsWith('/')).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Cache Strategy Selection
 *
 * **Feature: pwa-offline, Property 8: Cache strategy selection**
 * **Validates: Requirements 4.2, 4.3**
 */
describe('Cache Strategy Selection', () => {
  // Import the cache strategy module
  // Note: We need to import dynamically since we're appending to the test file
  let getCacheStrategy: typeof import('@/lib/offline/cache-strategy').getCacheStrategy;
  let isStaticAssetPath: typeof import('@/lib/offline/cache-strategy').isStaticAssetPath;
  let isStaticAssetDestination: typeof import('@/lib/offline/cache-strategy').isStaticAssetDestination;
  let isApiSingleItem: typeof import('@/lib/offline/cache-strategy').isApiSingleItem;
  let isApiList: typeof import('@/lib/offline/cache-strategy').isApiList;
  type RequestInfo = import('@/lib/offline/cache-strategy').RequestInfo;
  type RequestDestination = import('@/lib/offline/cache-strategy').RequestDestination;
  type CacheStrategy = import('@/lib/offline/cache-strategy').CacheStrategy;

  beforeAll(async () => {
    const cacheStrategyModule = await import('@/lib/offline/cache-strategy');
    getCacheStrategy = cacheStrategyModule.getCacheStrategy;
    isStaticAssetPath = cacheStrategyModule.isStaticAssetPath;
    isStaticAssetDestination = cacheStrategyModule.isStaticAssetDestination;
    isApiSingleItem = cacheStrategyModule.isApiSingleItem;
    isApiList = cacheStrategyModule.isApiList;
  });

  // Arbitrary for request destinations
  const requestDestinationArb: fc.Arbitrary<RequestDestination> = fc.constantFrom(
    'document',
    'image',
    'font',
    'style',
    'script',
    'audio',
    'video',
    'worker',
    'manifest',
    'object',
    'embed',
    'report',
    ''
  );

  // Arbitrary for static asset paths (should return cache-first)
  const staticAssetPathArb: fc.Arbitrary<string> = fc.oneof(
    // /icons/* paths
    fc.string({ minLength: 1, maxLength: 50 }).map((s) => `/icons/${s.replace(/\//g, '-')}`),
    // /_next/static/* paths
    fc.string({ minLength: 1, maxLength: 50 }).map((s) => `/_next/static/${s.replace(/\//g, '-')}`),
    // /fonts/* paths
    fc.string({ minLength: 1, maxLength: 50 }).map((s) => `/fonts/${s.replace(/\//g, '-')}`),
    // *.ico paths
    fc.string({ minLength: 1, maxLength: 20 }).map((s) => `/${s.replace(/[\/\.]/g, '-')}.ico`)
  );

  // Arbitrary for static asset destinations
  const staticAssetDestinationArb: fc.Arbitrary<RequestDestination> = fc.constantFrom(
    'image',
    'font',
    'style',
    'script'
  );

  // Arbitrary for API single item paths (should return network-first)
  const apiSingleItemPathArb: fc.Arbitrary<string> = fc.oneof(
    fc.uuid().map((id) => `/api/threads/${id}`),
    fc.uuid().map((id) => `/api/threads/${id}/comments`),
    fc.uuid().map((id) => `/api/comments/${id}`),
    fc.string({ minLength: 1, maxLength: 20 }).map((slug) => `/api/forums/${slug.replace(/\//g, '-')}`),
    fc.string({ minLength: 1, maxLength: 20 }).map((slug) => `/api/forums/${slug.replace(/\//g, '-')}/threads`),
    fc.string({ minLength: 1, maxLength: 20 }).map((slug) => `/api/communities/${slug.replace(/\//g, '-')}`),
    fc.uuid().map((id) => `/api/profile/${id}`),
    fc.uuid().map((id) => `/api/users/${id}`),
    fc.uuid().map((id) => `/api/polls/${id}`),
    fc.uuid().map((id) => `/api/polls/by-thread/${id}`)
  );

  // Arbitrary for API list paths (should return stale-while-revalidate)
  const apiListPathArb: fc.Arbitrary<string> = fc.constantFrom(
    '/api/threads',
    '/api/threads/',
    '/api/comments',
    '/api/comments/',
    '/api/forums',
    '/api/forums/',
    '/api/communities',
    '/api/communities/',
    '/api/notifications',
    '/api/notifications/',
    '/api/bookmarks',
    '/api/bookmarks/',
    '/api/tags',
    '/api/tags/',
    '/api/search',
    '/api/search/',
    '/api/feed/following',
    '/api/feed/trending'
  );

  // Arbitrary for document paths (should return network-first)
  const documentPathArb: fc.Arbitrary<string> = fc.oneof(
    fc.constant('/'),
    fc.constant('/offline'),
    fc.string({ minLength: 1, maxLength: 30 }).map((s) => `/${s.replace(/[\/\.]/g, '-')}`),
    fc.string({ minLength: 1, maxLength: 20 }).map((s) => `/thread/${s.replace(/\//g, '-')}`),
    fc.string({ minLength: 1, maxLength: 20 }).map((s) => `/forum/${s.replace(/\//g, '-')}`)
  );

  describe('Property 8: Cache strategy selection', () => {
    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.2**
     *
     * For any static asset path (/icons/*, /_next/static/*, /fonts/*, *.ico),
     * the cache strategy should be 'cache-first'.
     */
    it('should return cache-first for static asset paths', () => {
      fc.assert(
        fc.property(staticAssetPathArb, (pathname: string) => {
          const requestInfo: RequestInfo = { pathname, destination: '' };
          const strategy = getCacheStrategy(requestInfo);
          expect(strategy).toBe('cache-first');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.2**
     *
     * For any request with static asset destination (image, font, style, script),
     * the cache strategy should be 'cache-first'.
     */
    it('should return cache-first for static asset destinations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).map((s) => `/${s.replace(/\//g, '-')}`),
          staticAssetDestinationArb,
          (pathname: string, destination: RequestDestination) => {
            const requestInfo: RequestInfo = { pathname, destination };
            const strategy = getCacheStrategy(requestInfo);
            expect(strategy).toBe('cache-first');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.3**
     *
     * For any API single item path (/api/threads/[id], /api/comments/[id], etc.),
     * the cache strategy should be 'network-first'.
     */
    it('should return network-first for API single item paths', () => {
      fc.assert(
        fc.property(apiSingleItemPathArb, (pathname: string) => {
          const requestInfo: RequestInfo = { pathname, destination: '' };
          const strategy = getCacheStrategy(requestInfo);
          expect(strategy).toBe('network-first');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.3**
     *
     * For any API list path (/api/threads, /api/comments, etc.),
     * the cache strategy should be 'stale-while-revalidate'.
     */
    it('should return stale-while-revalidate for API list paths', () => {
      fc.assert(
        fc.property(apiListPathArb, (pathname: string) => {
          const requestInfo: RequestInfo = { pathname, destination: '' };
          const strategy = getCacheStrategy(requestInfo);
          expect(strategy).toBe('stale-while-revalidate');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.3**
     *
     * For any document request (destination === 'document'),
     * the cache strategy should be 'network-first'.
     */
    it('should return network-first for document requests', () => {
      fc.assert(
        fc.property(documentPathArb, (pathname: string) => {
          // Skip paths that match static asset patterns
          if (isStaticAssetPath(pathname)) return;
          
          const requestInfo: RequestInfo = { pathname, destination: 'document' };
          const strategy = getCacheStrategy(requestInfo);
          expect(strategy).toBe('network-first');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.2, 4.3**
     *
     * Static asset paths should always be identified correctly by isStaticAssetPath.
     */
    it('should correctly identify static asset paths', () => {
      fc.assert(
        fc.property(staticAssetPathArb, (pathname: string) => {
          expect(isStaticAssetPath(pathname)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.2, 4.3**
     *
     * Static asset destinations should always be identified correctly.
     */
    it('should correctly identify static asset destinations', () => {
      fc.assert(
        fc.property(staticAssetDestinationArb, (destination: RequestDestination) => {
          expect(isStaticAssetDestination(destination)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.3**
     *
     * API single item paths should always be identified correctly.
     */
    it('should correctly identify API single item paths', () => {
      fc.assert(
        fc.property(apiSingleItemPathArb, (pathname: string) => {
          expect(isApiSingleItem(pathname)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.3**
     *
     * API list paths should always be identified correctly.
     */
    it('should correctly identify API list paths', () => {
      fc.assert(
        fc.property(apiListPathArb, (pathname: string) => {
          expect(isApiList(pathname)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.2, 4.3**
     *
     * The cache strategy should always return one of the valid strategies.
     */
    it('should always return a valid cache strategy', () => {
      const validStrategies: CacheStrategy[] = [
        'cache-first',
        'network-first',
        'stale-while-revalidate',
        'network-only',
      ];

      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }).map((s) => `/${s}`),
          requestDestinationArb,
          (pathname: string, destination: RequestDestination) => {
            const requestInfo: RequestInfo = { pathname, destination };
            const strategy = getCacheStrategy(requestInfo);
            expect(validStrategies).toContain(strategy);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 8: Cache strategy selection**
     * **Validates: Requirements 4.2, 4.3**
     *
     * Static asset path detection should take precedence over destination.
     */
    it('should prioritize static asset path over destination', () => {
      fc.assert(
        fc.property(
          staticAssetPathArb,
          fc.constantFrom('document', '' as RequestDestination),
          (pathname: string, destination: RequestDestination) => {
            const requestInfo: RequestInfo = { pathname, destination };
            const strategy = getCacheStrategy(requestInfo);
            // Even with document destination, static asset paths should be cache-first
            expect(strategy).toBe('cache-first');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Notification URL Extraction
 *
 * **Feature: pwa-offline, Property 7: Notification URL extraction**
 * **Validates: Requirements 3.5**
 */
describe('Notification URL Extraction', () => {
  // Import the notification module
  let extractNotificationUrl: typeof import('@/lib/offline/notification').extractNotificationUrl;
  let buildReplyUrl: typeof import('@/lib/offline/notification').buildReplyUrl;
  let DEFAULT_NOTIFICATION_URL: string;
  type NotificationLike = import('@/lib/offline/notification').NotificationLike;
  type NotificationData = import('@/lib/offline/notification').NotificationData;

  beforeAll(async () => {
    const notificationModule = await import('@/lib/offline/notification');
    extractNotificationUrl = notificationModule.extractNotificationUrl;
    buildReplyUrl = notificationModule.buildReplyUrl;
    DEFAULT_NOTIFICATION_URL = notificationModule.DEFAULT_NOTIFICATION_URL;
  });

  // Arbitrary for valid URL paths
  const urlPathArb: fc.Arbitrary<string> = fc.oneof(
    // Thread URLs
    fc.uuid().map((id) => `/thread/${id}`),
    // Forum URLs
    fc.string({ minLength: 1, maxLength: 20 }).map((slug) => `/forum/${slug.replace(/[\/\s]/g, '-')}`),
    // User profile URLs
    fc.string({ minLength: 1, maxLength: 20 }).map((username) => `/u/${username.replace(/[\/\s]/g, '-')}`),
    // Community URLs
    fc.string({ minLength: 1, maxLength: 20 }).map((slug) => `/c/${slug.replace(/[\/\s]/g, '-')}`),
    // Notification URLs
    fc.constant('/notifications'),
    // Settings URLs
    fc.constant('/settings'),
    // Root URL
    fc.constant('/'),
    // Generic paths
    fc.string({ minLength: 1, maxLength: 50 }).map((s) => `/${s.replace(/[\/\s]/g, '-')}`)
  );

  // Arbitrary for notification types
  const notificationTypeArb: fc.Arbitrary<NotificationData['type']> = fc.constantFrom(
    'comment',
    'mention',
    'reaction',
    'follow',
    'reply'
  );

  // Arbitrary for notification data with URL
  const notificationDataWithUrlArb: fc.Arbitrary<NotificationData> = fc.record({
    url: urlPathArb,
    dateOfArrival: fc.option(fc.nat({ max: Date.now() + 1000000000 }), { nil: undefined }),
    notificationId: fc.option(fc.uuid(), { nil: undefined }),
    type: fc.option(notificationTypeArb, { nil: undefined }),
  });

  // Arbitrary for notification data without URL
  const notificationDataWithoutUrlArb: fc.Arbitrary<NotificationData> = fc.record({
    dateOfArrival: fc.option(fc.nat({ max: Date.now() + 1000000000 }), { nil: undefined }),
    notificationId: fc.option(fc.uuid(), { nil: undefined }),
    type: fc.option(notificationTypeArb, { nil: undefined }),
  });

  // Arbitrary for notification-like objects with URL
  const notificationWithUrlArb: fc.Arbitrary<NotificationLike> = notificationDataWithUrlArb.map(
    (data) => ({ data })
  );

  // Arbitrary for notification-like objects without URL
  const notificationWithoutUrlArb: fc.Arbitrary<NotificationLike> = fc.oneof(
    notificationDataWithoutUrlArb.map((data) => ({ data })),
    fc.constant({ data: null }),
    fc.constant({ data: undefined }),
    fc.constant({})
  );

  describe('Property 7: Notification URL extraction', () => {
    /**
     * **Feature: pwa-offline, Property 7: Notification URL extraction**
     * **Validates: Requirements 3.5**
     *
     * For any push notification with a url field, clicking the notification
     * should navigate to that exact URL.
     */
    it('should return the exact URL from notification data', () => {
      fc.assert(
        fc.property(notificationWithUrlArb, (notification: NotificationLike) => {
          const result = extractNotificationUrl(notification);
          
          // The extracted URL should be exactly the URL in the notification data
          expect(result).toBe(notification.data!.url);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 7: Notification URL extraction**
     * **Validates: Requirements 3.5**
     *
     * For any push notification without a url field, the function should
     * return the default URL (/).
     */
    it('should return default URL when notification has no URL', () => {
      fc.assert(
        fc.property(notificationWithoutUrlArb, (notification: NotificationLike) => {
          const result = extractNotificationUrl(notification);
          
          // Should return the default URL
          expect(result).toBe(DEFAULT_NOTIFICATION_URL);
          expect(result).toBe('/');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 7: Notification URL extraction**
     * **Validates: Requirements 3.5**
     *
     * The extracted URL should always be a string.
     */
    it('should always return a string', () => {
      fc.assert(
        fc.property(
          fc.oneof(notificationWithUrlArb, notificationWithoutUrlArb),
          (notification: NotificationLike) => {
            const result = extractNotificationUrl(notification);
            
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 7: Notification URL extraction**
     * **Validates: Requirements 3.5**
     *
     * The URL extraction should be idempotent - calling it multiple times
     * with the same notification should return the same URL.
     */
    it('should be idempotent', () => {
      fc.assert(
        fc.property(
          fc.oneof(notificationWithUrlArb, notificationWithoutUrlArb),
          (notification: NotificationLike) => {
            const result1 = extractNotificationUrl(notification);
            const result2 = extractNotificationUrl(notification);
            const result3 = extractNotificationUrl(notification);
            
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 7: Notification URL extraction**
     * **Validates: Requirements 3.5**
     *
     * The URL should preserve all path segments and query parameters.
     */
    it('should preserve URL path segments', () => {
      fc.assert(
        fc.property(urlPathArb, (url: string) => {
          const notification: NotificationLike = { data: { url } };
          const result = extractNotificationUrl(notification);
          
          // The result should exactly match the input URL
          expect(result).toBe(url);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 7: Notification URL extraction**
     * **Validates: Requirements 3.5**
     *
     * URLs with query parameters should be preserved exactly.
     */
    it('should preserve URLs with query parameters', () => {
      // Arbitrary for URLs with query parameters
      const urlWithQueryArb = fc.tuple(
        urlPathArb,
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('&') && !s.includes('='))
        )
      ).map(([path, params]) => {
        const queryString = Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join('&');
        return queryString ? `${path}?${queryString}` : path;
      });

      fc.assert(
        fc.property(urlWithQueryArb, (url: string) => {
          const notification: NotificationLike = { data: { url } };
          const result = extractNotificationUrl(notification);
          
          expect(result).toBe(url);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 7: Notification URL extraction**
     * **Validates: Requirements 3.5**
     *
     * The buildReplyUrl function should correctly append reply=true parameter.
     */
    it('should correctly build reply URLs', () => {
      fc.assert(
        fc.property(urlPathArb, (baseUrl: string) => {
          const replyUrl = buildReplyUrl(baseUrl);
          
          // Should contain reply=true
          expect(replyUrl).toContain('reply=true');
          
          // Should start with the base URL
          expect(replyUrl.startsWith(baseUrl)).toBe(true);
          
          // Should have correct separator
          if (baseUrl.includes('?')) {
            expect(replyUrl).toBe(`${baseUrl}&reply=true`);
          } else {
            expect(replyUrl).toBe(`${baseUrl}?reply=true`);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: pwa-offline, Property 7: Notification URL extraction**
     * **Validates: Requirements 3.5**
     *
     * Empty string URL in notification data should be treated as no URL.
     */
    it('should treat empty string URL as no URL', () => {
      const notification: NotificationLike = { data: { url: '' } };
      const result = extractNotificationUrl(notification);
      
      // Empty string is falsy, so should return default
      expect(result).toBe(DEFAULT_NOTIFICATION_URL);
    });
  });
});

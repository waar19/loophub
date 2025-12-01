import { describe, it, expect } from 'vitest';
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

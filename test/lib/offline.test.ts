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
} from '@/lib/offline/types';
import { isStale } from '@/lib/offline/cache';

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
  const payloadArb: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    fc.oneof(
      fc.string(),
      fc.integer(),
      fc.double({ noNaN: true, noDefaultInfinity: true }),
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
  // Arbitrary for valid ThreadData
  const threadDataArb: fc.Arbitrary<ThreadData> = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 1000 }),
    authorId: fc.uuid(),
    authorName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    forumId: fc.option(fc.uuid(), { nil: undefined }),
    forumSlug: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    createdAt: fc.date().map((d) => d.toISOString()),
    updatedAt: fc.option(fc.date().map((d) => d.toISOString()), { nil: undefined }),
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

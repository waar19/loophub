import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ReactionSummary,
  ReactorInfo,
  REACTION_TYPES,
  serializeReactionSummary,
  deserializeReactionSummary,
  serializeReactorInfo,
  deserializeReactorInfo,
} from '@/lib/reactions';

/**
 * Property-Based Tests for Reaction System Serialization
 * 
 * **Feature: comment-reactions, Property 6: Serialization round-trip**
 * **Validates: Requirements 6.3, 6.4**
 */
describe('Reactions Serialization', () => {
  // Arbitrary for valid ReactionType
  const reactionTypeArb = fc.constantFrom(...REACTION_TYPES);

  // Arbitrary for ReactionSummary
  const reactionSummaryArb: fc.Arbitrary<ReactionSummary> = fc.record({
    type: reactionTypeArb,
    count: fc.nat({ max: 10000 }), // Non-negative integers up to 10000
    hasReacted: fc.boolean(),
  });

  // Arbitrary for ReactorInfo
  const reactorInfoArb: fc.Arbitrary<ReactorInfo> = fc.record({
    userId: fc.uuid(),
    username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    avatarUrl: fc.option(fc.webUrl(), { nil: null }),
    reactedAt: fc.date().map(d => d.toISOString()),
  });

  describe('ReactionSummary serialization round-trip', () => {
    /**
     * **Feature: comment-reactions, Property 6: Serialization round-trip**
     * **Validates: Requirements 6.3, 6.4**
     * 
     * For any valid ReactionSummary object, serializing to JSON and 
     * deserializing back should produce an equivalent object.
     */
    it('should preserve ReactionSummary through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(reactionSummaryArb, (original: ReactionSummary) => {
          const serialized = serializeReactionSummary(original);
          const deserialized = deserializeReactionSummary(serialized);

          expect(deserialized.type).toBe(original.type);
          expect(deserialized.count).toBe(original.count);
          expect(deserialized.hasReacted).toBe(original.hasReacted);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('ReactorInfo serialization round-trip', () => {
    /**
     * **Feature: comment-reactions, Property 6: Serialization round-trip**
     * **Validates: Requirements 6.3, 6.4**
     * 
     * For any valid ReactorInfo object, serializing to JSON and 
     * deserializing back should produce an equivalent object.
     */
    it('should preserve ReactorInfo through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(reactorInfoArb, (original: ReactorInfo) => {
          const serialized = serializeReactorInfo(original);
          const deserialized = deserializeReactorInfo(serialized);

          expect(deserialized.userId).toBe(original.userId);
          expect(deserialized.username).toBe(original.username);
          expect(deserialized.avatarUrl).toBe(original.avatarUrl);
          expect(deserialized.reactedAt).toBe(original.reactedAt);
        }),
        { numRuns: 100 }
      );
    });
  });
});

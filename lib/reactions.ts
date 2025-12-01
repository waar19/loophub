/**
 * Reaction System Types and Constants
 * 
 * This module defines all types, interfaces, and constants for the
 * emoji reaction system used on comments and threads.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Allowed reaction types - must match database CHECK constraint
 */
export const REACTION_TYPES = [
  'thumbs_up',
  'heart',
  'laugh',
  'fire',
  'lightbulb',
  'party',
] as const;

/**
 * Type for valid reaction types
 */
export type ReactionType = typeof REACTION_TYPES[number];

/**
 * Mapping of reaction types to their emoji representations
 */
export const REACTION_EMOJIS: Record<ReactionType, string> = {
  thumbs_up: '👍',
  heart: '❤️',
  laugh: '😂',
  fire: '🔥',
  lightbulb: '💡',
  party: '🎉',
};

/**
 * Mapping of reaction types to their display names (for accessibility)
 */
export const REACTION_NAMES: Record<ReactionType, string> = {
  thumbs_up: 'Me gusta',
  heart: 'Me encanta',
  laugh: 'Divertido',
  fire: 'Fuego',
  lightbulb: 'Idea',
  party: 'Celebrar',
};

/**
 * Content types that can receive reactions
 */
export const CONTENT_TYPES = ['thread', 'comment'] as const;
export type ContentType = typeof CONTENT_TYPES[number];

// ============================================================================
// Database Types
// ============================================================================

/**
 * Database row type for reactions table
 */
export interface ReactionRow {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Summary of reactions for a piece of content
 * Used for displaying reaction counts and user's own reactions
 */
export interface ReactionSummary {
  type: ReactionType;
  count: number;
  hasReacted: boolean;
}

/**
 * Information about a user who reacted
 * Used for tooltip display
 */
export interface ReactorInfo {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  reactedAt: string;
}

/**
 * Request payload for adding/removing a reaction
 */
export interface ReactionRequest {
  contentType: ContentType;
  contentId: string;
  reactionType: ReactionType;
}

/**
 * Response from the reaction toggle API
 */
export interface ReactionResponse {
  success: boolean;
  action: 'added' | 'removed';
  reactions: ReactionSummary[];
}

/**
 * Response from the get reactors API
 */
export interface ReactorsResponse {
  success: boolean;
  reactors: ReactorInfo[];
  totalCount: number;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Type guard to check if a string is a valid ReactionType
 */
export function isValidReactionType(value: string): value is ReactionType {
  return REACTION_TYPES.includes(value as ReactionType);
}

/**
 * Type guard to check if a string is a valid ContentType
 */
export function isValidContentType(value: string): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType);
}

/**
 * Validates a reaction request object
 * Returns an error message if invalid, null if valid
 */
export function validateReactionRequest(
  request: Partial<ReactionRequest>
): string | null {
  if (!request.contentType || !isValidContentType(request.contentType)) {
    return 'Invalid content type';
  }
  if (!request.contentId) {
    return 'Content ID is required';
  }
  if (!request.reactionType || !isValidReactionType(request.reactionType)) {
    return 'Invalid reaction type';
  }
  return null;
}

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Serializes a ReactionSummary to JSON-safe format
 */
export function serializeReactionSummary(summary: ReactionSummary): string {
  return JSON.stringify(summary);
}

/**
 * Deserializes a JSON string to ReactionSummary
 */
export function deserializeReactionSummary(json: string): ReactionSummary {
  const parsed = JSON.parse(json);
  return {
    type: parsed.type as ReactionType,
    count: Number(parsed.count),
    hasReacted: Boolean(parsed.hasReacted),
  };
}

/**
 * Serializes a ReactorInfo to JSON-safe format
 */
export function serializeReactorInfo(info: ReactorInfo): string {
  return JSON.stringify(info);
}

/**
 * Deserializes a JSON string to ReactorInfo
 */
export function deserializeReactorInfo(json: string): ReactorInfo {
  const parsed = JSON.parse(json);
  return {
    userId: String(parsed.userId),
    username: String(parsed.username),
    avatarUrl: parsed.avatarUrl ?? null,
    reactedAt: String(parsed.reactedAt),
  };
}

// ============================================================================
// Reaction Logic Helpers (Pure Functions for Testing)
// ============================================================================

/**
 * Applies a toggle reaction to a list of reaction summaries
 * Returns the new state after toggling
 * 
 * Requirements: 1.1, 1.2
 */
export function applyToggleReaction(
  reactions: ReactionSummary[],
  type: ReactionType,
  userHasReacted: boolean
): ReactionSummary[] {
  const existing = reactions.find(r => r.type === type);

  if (userHasReacted) {
    // User is removing their reaction
    if (existing) {
      if (existing.count === 1) {
        // Remove the reaction type entirely
        return reactions.filter(r => r.type !== type);
      }
      // Decrement count
      return reactions.map(r =>
        r.type === type
          ? { ...r, count: r.count - 1, hasReacted: false }
          : r
      );
    }
    // Edge case: user claims to have reacted but no record exists
    return reactions;
  } else {
    // User is adding a reaction
    if (existing) {
      // Increment count on existing type
      return reactions.map(r =>
        r.type === type
          ? { ...r, count: r.count + 1, hasReacted: true }
          : r
      );
    } else {
      // New reaction type
      return [...reactions, { type, count: 1, hasReacted: true }];
    }
  }
}

/**
 * Calculates reaction summaries from a list of reaction rows
 * 
 * Requirements: 1.4, 4.3
 */
export function calculateReactionSummaries(
  rows: ReactionRow[],
  currentUserId?: string
): ReactionSummary[] {
  const summaryMap = new Map<ReactionType, { count: number; hasReacted: boolean }>();

  for (const row of rows) {
    const existing = summaryMap.get(row.reaction_type);
    if (existing) {
      existing.count += 1;
      if (currentUserId && row.user_id === currentUserId) {
        existing.hasReacted = true;
      }
    } else {
      summaryMap.set(row.reaction_type, {
        count: 1,
        hasReacted: currentUserId ? row.user_id === currentUserId : false,
      });
    }
  }

  return Array.from(summaryMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    hasReacted: data.hasReacted,
  }));
}

/**
 * Checks if a reaction row would be a duplicate
 * Returns true if a duplicate exists
 * 
 * Requirements: 4.3
 */
export function isDuplicateReaction(
  existingRows: ReactionRow[],
  newRow: Pick<ReactionRow, 'user_id' | 'content_type' | 'content_id' | 'reaction_type'>
): boolean {
  return existingRows.some(
    row =>
      row.user_id === newRow.user_id &&
      row.content_type === newRow.content_type &&
      row.content_id === newRow.content_id &&
      row.reaction_type === newRow.reaction_type
  );
}

/**
 * Adds a reaction to a list of rows, preventing duplicates
 * Returns the new list and whether the reaction was added
 * 
 * Requirements: 4.3
 */
export function addReactionToRows(
  existingRows: ReactionRow[],
  newRow: ReactionRow
): { rows: ReactionRow[]; added: boolean } {
  if (isDuplicateReaction(existingRows, newRow)) {
    return { rows: existingRows, added: false };
  }
  return { rows: [...existingRows, newRow], added: true };
}

/**
 * Removes a reaction from a list of rows
 * Returns the new list and whether a reaction was removed
 * 
 * Requirements: 1.2
 */
export function removeReactionFromRows(
  existingRows: ReactionRow[],
  criteria: Pick<ReactionRow, 'user_id' | 'content_type' | 'content_id' | 'reaction_type'>
): { rows: ReactionRow[]; removed: boolean } {
  const initialLength = existingRows.length;
  const newRows = existingRows.filter(
    row =>
      !(
        row.user_id === criteria.user_id &&
        row.content_type === criteria.content_type &&
        row.content_id === criteria.content_id &&
        row.reaction_type === criteria.reaction_type
      )
  );
  return { rows: newRows, removed: newRows.length < initialLength };
}

/**
 * Orders reactor list with current user first, then by timestamp descending
 * 
 * Requirements: 2.2, 2.3
 */
export function orderReactors(
  reactors: ReactorInfo[],
  currentUserId?: string
): ReactorInfo[] {
  return [...reactors].sort((a, b) => {
    // Current user always first
    if (currentUserId) {
      if (a.userId === currentUserId && b.userId !== currentUserId) return -1;
      if (b.userId === currentUserId && a.userId !== currentUserId) return 1;
    }
    // Then by timestamp descending (most recent first)
    return new Date(b.reactedAt).getTime() - new Date(a.reactedAt).getTime();
  });
}

// ============================================================================
// Notification Logic Helpers (Pure Functions for Testing)
// ============================================================================

/**
 * Determines if a notification should be created for a reaction
 * Returns true if notification should be created, false otherwise
 * 
 * Requirements: 5.1, 5.3
 * - Notification should be created on first reaction (5.1)
 * - No notification for self-reactions (5.3)
 */
export function shouldCreateReactionNotification(
  reactorUserId: string,
  contentAuthorId: string,
  isFirstReaction: boolean
): boolean {
  // Don't notify if reacting to own content (Requirement 5.3)
  if (reactorUserId === contentAuthorId) {
    return false;
  }
  
  // Only notify on first reaction (Requirement 5.1)
  return isFirstReaction;
}

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

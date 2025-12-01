# Implementation Plan

- [x] 1. Database setup and types
  - [x] 1.1 Create migration for reactions table
    - Create `supabase/migrations/029_reactions_system.sql`
    - Table with id, user_id, content_type, content_id, reaction_type, created_at
    - Composite unique constraint on (user_id, content_type, content_id, reaction_type)
    - Indexes for content lookup and user lookup
    - RLS policies for select, insert, delete
    - Trigger for notifications on first reaction
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3_

  - [x] 1.2 Create TypeScript types and constants
    - Add types to `lib/supabase.ts` or create `lib/reactions.ts`
    - ReactionType enum, REACTION_EMOJIS map
    - ReactionSummary, ReactorInfo, ReactionRequest, ReactionResponse interfaces
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Write property test for serialization round-trip
    - **Property 6: Serialization round-trip**
    - **Validates: Requirements 6.3, 6.4**

- [x] 2. API endpoints
  - [x] 2.1 Create POST /api/reactions endpoint
    - Toggle reaction (add if not exists, remove if exists)
    - Validate reaction_type against enum
    - Return updated reaction summaries
    - Handle authentication check
    - _Requirements: 1.1, 1.2, 1.3, 6.1_

  - [x] 2.2 Create GET /api/reactions endpoint
    - Query params: contentType, contentId
    - Return aggregated reactions with counts
    - Include hasReacted flag for current user
    - _Requirements: 1.4, 2.1_

  - [x] 2.3 Create GET /api/reactions/users endpoint
    - Query params: contentType, contentId, reactionType
    - Return list of users who reacted (max 10)
    - Order by timestamp, current user first
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.4 Write property tests for API validation
    - **Property 5: Reaction type validation**
    - **Property 7: Authentication required**
    - **Validates: Requirements 1.3, 6.1**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. React hook and components
  - [x] 4.1 Create useReactions hook
    - Fetch initial reactions
    - toggleReaction with optimistic update
    - getReactors for tooltip data
    - Handle loading and error states
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 4.2 Create ReactionPicker component
    - Display 6 emoji options in a popup
    - Handle click outside to close
    - Position to avoid viewport overflow
    - Keyboard navigation support
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.3 Create ReactionDisplay component
    - Show reactions with counts (only non-zero)
    - Highlight user's own reactions
    - Add reaction button to open picker
    - _Requirements: 1.4, 1.5_

  - [x] 4.4 Create ReactionTooltip component
    - Show list of usernames on hover
    - Max 10 users with "+X more" indicator
    - Current user shown first
    - _Requirements: 2.1, 2.2, 2.3_

  - [-] 4.5 Write property tests for reaction logic
    - **Property 1: Toggle reaction is idempotent round-trip**
    - **Property 2: Reaction count accuracy**
    - **Property 3: No duplicate reactions**
    - **Property 4: Reactor list ordering**
    - **Validates: Requirements 1.1, 1.2, 1.4, 2.2, 2.3, 4.3**

- [ ] 5. Integration with existing components
  - [ ] 5.1 Integrate ReactionDisplay in CommentCard
    - Add below comment content, before actions
    - Pass comment.id and comment.user_id
    - _Requirements: 1.1_

  - [ ] 5.2 Integrate ReactionDisplay in ThreadCard (optional)
    - Add in thread detail view
    - Pass thread.id and thread.user_id
    - _Requirements: 1.1_

  - [ ] 5.3 Add translations for reactions
    - Add keys to lib/i18n/translations.ts
    - ES, EN, PT translations for reaction names and UI text
    - _Requirements: 6.2_

- [ ] 6. Notifications integration
  - [ ] 6.1 Update notification types
    - Add 'reaction' type to notification system
    - Create notification on first reaction (via DB trigger)
    - _Requirements: 5.1, 5.2_

  - [ ]* 6.2 Write property test for no self-notifications
    - **Property 8: No self-notifications**
    - **Validates: Requirements 5.3**

- [ ] 7. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

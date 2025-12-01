# Requirements Document

## Introduction

Este documento define los requisitos para implementar un sistema de reacciones con emojis en comentarios y threads de LoopHub. El sistema permitirá a los usuarios expresar sus emociones de forma rápida y visual, complementando el sistema de votos existente (upvote/downvote) con reacciones más expresivas como 👍❤️😂🔥💡🎉.

## Glossary

- **Reaction**: Una respuesta emocional expresada mediante un emoji que un usuario puede agregar a un comentario o thread
- **Reaction Type**: El tipo específico de emoji usado (thumbs_up, heart, laugh, fire, lightbulb, party)
- **Reaction Count**: El número total de reacciones de un tipo específico en un contenido
- **Reactor**: Usuario que ha agregado una reacción a un contenido
- **Content**: Un comentario o thread que puede recibir reacciones

## Requirements

### Requirement 1

**User Story:** As a user, I want to add emoji reactions to comments and threads, so that I can express my feelings quickly without writing a full response.

#### Acceptance Criteria

1. WHEN a user clicks on a reaction emoji THEN the System SHALL create a reaction record and increment the reaction count for that emoji type
2. WHEN a user clicks on an emoji they already reacted with THEN the System SHALL remove the reaction and decrement the count (toggle behavior)
3. WHEN a user is not authenticated THEN the System SHALL prevent adding reactions and display a login prompt
4. WHEN displaying reactions THEN the System SHALL show only emojis that have at least one reaction with their respective counts
5. WHEN a user adds a reaction THEN the System SHALL provide immediate visual feedback (optimistic UI update)

### Requirement 2

**User Story:** As a user, I want to see who reacted to content, so that I can understand community sentiment and see familiar usernames.

#### Acceptance Criteria

1. WHEN a user hovers over a reaction count THEN the System SHALL display a tooltip with the list of usernames who reacted (max 10 with "+X more" indicator)
2. WHEN fetching reactor list THEN the System SHALL return usernames ordered by reaction timestamp (most recent first)
3. WHEN displaying reactor names THEN the System SHALL show the current user first if they reacted, followed by others

### Requirement 3

**User Story:** As a user, I want a quick reaction picker, so that I can easily select from available emoji options.

#### Acceptance Criteria

1. WHEN a user clicks the "add reaction" button THEN the System SHALL display a picker with exactly 6 emoji options: 👍❤️😂🔥💡🎉
2. WHEN the picker is open and user clicks outside THEN the System SHALL close the picker
3. WHEN a user selects an emoji from the picker THEN the System SHALL add the reaction and close the picker
4. WHEN displaying the picker THEN the System SHALL position it to avoid viewport overflow

### Requirement 4

**User Story:** As a system administrator, I want reactions stored efficiently, so that the database performs well at scale.

#### Acceptance Criteria

1. WHEN storing reactions THEN the System SHALL use a single table with composite unique constraint on (user_id, content_type, content_id, reaction_type)
2. WHEN querying reactions THEN the System SHALL use indexed columns for efficient lookups by content
3. WHEN a user adds a duplicate reaction (same user, same content, same type) THEN the System SHALL reject the operation gracefully
4. WHEN content is deleted THEN the System SHALL cascade delete all associated reactions

### Requirement 5

**User Story:** As a content author, I want to receive notifications for reactions, so that I know when people appreciate my content.

#### Acceptance Criteria

1. WHEN a user receives their first reaction on a piece of content THEN the System SHALL create a notification for the author
2. WHEN multiple users react to the same content THEN the System SHALL batch notifications (e.g., "3 people reacted to your comment")
3. WHEN the author reacts to their own content THEN the System SHALL NOT create a self-notification

### Requirement 6

**User Story:** As a developer, I want the reaction system to be type-safe and well-structured, so that the codebase remains maintainable.

#### Acceptance Criteria

1. WHEN implementing the API THEN the System SHALL validate reaction_type against an allowed enum list
2. WHEN implementing the frontend THEN the System SHALL use TypeScript interfaces for all reaction-related data
3. WHEN serializing reactions for API responses THEN the System SHALL use a consistent JSON structure
4. WHEN deserializing reactions from API responses THEN the System SHALL parse them back to equivalent TypeScript objects (round-trip consistency)

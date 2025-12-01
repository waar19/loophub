# Design Document - Comment Reactions System

## Overview

El sistema de reacciones permite a los usuarios expresar emociones mediante emojis en comentarios y threads. Complementa el sistema de votos existente (upvote/downvote) con 6 tipos de reacciones: 👍 (thumbs_up), ❤️ (heart), 😂 (laugh), 🔥 (fire), 💡 (lightbulb), 🎉 (party).

El sistema sigue el patrón existente de LoopHub: tabla en Supabase con RLS, API routes en Next.js, componentes React con optimistic UI, y notificaciones integradas.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ ReactionPicker  │  │ ReactionDisplay │                   │
│  │ (emoji selector)│  │ (counts + users)│                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           └──────────┬─────────┘                             │
│                      ▼                                       │
│           ┌─────────────────────┐                           │
│           │  useReactions hook  │                           │
│           │  (optimistic state) │                           │
│           └──────────┬──────────┘                           │
└──────────────────────┼──────────────────────────────────────┘
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ POST/DELETE /api/reactions                          │    │
│  │ GET /api/reactions?contentType=X&contentId=Y        │    │
│  │ GET /api/reactions/[id]/users                       │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Supabase Client
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ reactions table                                      │    │
│  │ - id, user_id, content_type, content_id              │    │
│  │ - reaction_type, created_at                          │    │
│  │ - UNIQUE(user_id, content_type, content_id, type)    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Triggers: notify on first reaction                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### React Components

```typescript
// ReactionPicker - Selector de emojis
interface ReactionPickerProps {
  onSelect: (reactionType: ReactionType) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

// ReactionDisplay - Muestra reacciones existentes
interface ReactionDisplayProps {
  contentType: 'thread' | 'comment';
  contentId: string;
  initialReactions?: ReactionSummary[];
  authorId: string; // Para evitar self-notifications
}

// ReactionButton - Botón individual de reacción
interface ReactionButtonProps {
  type: ReactionType;
  count: number;
  isActive: boolean; // Si el usuario actual reaccionó
  onClick: () => void;
  onHover: () => void;
}

// ReactionTooltip - Lista de usuarios que reaccionaron
interface ReactionTooltipProps {
  users: ReactorInfo[];
  totalCount: number;
  currentUserId?: string;
}
```

### API Interfaces

```typescript
// Tipos de reacción permitidos
type ReactionType = 'thumbs_up' | 'heart' | 'laugh' | 'fire' | 'lightbulb' | 'party';

// Mapeo de tipos a emojis
const REACTION_EMOJIS: Record<ReactionType, string> = {
  thumbs_up: '👍',
  heart: '❤️',
  laugh: '😂',
  fire: '🔥',
  lightbulb: '💡',
  party: '🎉',
};

// Resumen de reacciones para un contenido
interface ReactionSummary {
  type: ReactionType;
  count: number;
  hasReacted: boolean; // Si el usuario actual reaccionó con este tipo
}

// Info de usuario que reaccionó
interface ReactorInfo {
  userId: string;
  username: string;
  avatarUrl?: string;
  reactedAt: string;
}

// Request para agregar/quitar reacción
interface ReactionRequest {
  contentType: 'thread' | 'comment';
  contentId: string;
  reactionType: ReactionType;
}

// Response de la API
interface ReactionResponse {
  success: boolean;
  action: 'added' | 'removed';
  reactions: ReactionSummary[];
}
```

### Hook Interface

```typescript
interface UseReactionsReturn {
  reactions: ReactionSummary[];
  isLoading: boolean;
  toggleReaction: (type: ReactionType) => Promise<void>;
  getReactors: (type: ReactionType) => Promise<ReactorInfo[]>;
}
```

## Data Models

### Database Schema

```sql
-- Tabla de reacciones
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('thread', 'comment')),
  content_id UUID NOT NULL,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('thumbs_up', 'heart', 'laugh', 'fire', 'lightbulb', 'party')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: un usuario solo puede tener una reacción de cada tipo por contenido
  UNIQUE(user_id, content_type, content_id, reaction_type)
);

-- Índices para queries eficientes
CREATE INDEX idx_reactions_content ON reactions(content_type, content_id);
CREATE INDEX idx_reactions_user ON reactions(user_id);
CREATE INDEX idx_reactions_type ON reactions(reaction_type);
```

### TypeScript Types

```typescript
// Database row type
interface ReactionRow {
  id: string;
  user_id: string;
  content_type: 'thread' | 'comment';
  content_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

// Aggregated reaction data
interface AggregatedReaction {
  reaction_type: ReactionType;
  count: number;
  users: Array<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
  }>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Toggle reaction is idempotent round-trip
*For any* user, content, and reaction type, adding a reaction and then toggling it off should return the reaction count to its original value.
**Validates: Requirements 1.1, 1.2**

### Property 2: Reaction count accuracy
*For any* content with N distinct user reactions of a given type, the displayed count for that type should equal exactly N.
**Validates: Requirements 1.1, 1.4**

### Property 3: No duplicate reactions
*For any* user attempting to add the same reaction type to the same content twice, the system should maintain exactly one reaction record (not create duplicates).
**Validates: Requirements 4.3**

### Property 4: Reactor list ordering
*For any* list of reactors returned by the API, if the current user has reacted, they should appear first; all other users should be ordered by reaction timestamp descending.
**Validates: Requirements 2.2, 2.3**

### Property 5: Reaction type validation
*For any* API request with an invalid reaction_type (not in the allowed enum), the system should reject the request with a validation error.
**Validates: Requirements 6.1**

### Property 6: Serialization round-trip
*For any* valid ReactionSummary object, serializing to JSON and deserializing back should produce an equivalent object.
**Validates: Requirements 6.3, 6.4**

### Property 7: Authentication required
*For any* unauthenticated request to add/remove reactions, the system should return a 401 Unauthorized response.
**Validates: Requirements 1.3**

### Property 8: No self-notifications
*For any* reaction added by the content author to their own content, no notification should be created.
**Validates: Requirements 5.3**

## Error Handling

| Error Case | HTTP Status | Response |
|------------|-------------|----------|
| Not authenticated | 401 | `{ error: "Unauthorized" }` |
| Invalid content_type | 400 | `{ error: "Invalid content type" }` |
| Invalid reaction_type | 400 | `{ error: "Invalid reaction type" }` |
| Content not found | 404 | `{ error: "Content not found" }` |
| Database error | 500 | `{ error: "Internal server error" }` |

## Testing Strategy

### Unit Tests
- Validación de tipos de reacción (enum validation)
- Lógica de ordenamiento de reactores
- Serialización/deserialización de datos
- Cálculo de conteos de reacciones

### Property-Based Tests

Se utilizará **fast-check** como librería de property-based testing para TypeScript/JavaScript.

Cada test debe:
- Ejecutar mínimo 100 iteraciones
- Estar anotado con el formato: `**Feature: comment-reactions, Property {number}: {property_text}**`

Tests a implementar:
1. Toggle round-trip (Property 1)
2. Count accuracy (Property 2)
3. No duplicates (Property 3)
4. Reactor ordering (Property 4)
5. Type validation (Property 5)
6. Serialization round-trip (Property 6)
7. Auth required (Property 7)
8. No self-notifications (Property 8)

### Integration Tests
- API endpoint POST /api/reactions
- API endpoint DELETE /api/reactions
- API endpoint GET /api/reactions
- Cascade delete cuando se elimina contenido

# Edit Session Feature

## Overview
Session owners can now edit session details before the roster is locked.

## What Can Be Edited
- Date and time
- Duration
- Location
- Court numbers
- Number of courts needed
- Player limits (min/max)
- Cost fields (admin cost, guest pool)

## User Flow

1. **Access**: Session owner clicks "✏️ Edit Session" button on session details page
2. **Edit**: Form is pre-filled with current session data
3. **Save**: Click "Save Changes" to update the session
4. **Return**: Redirected back to session details page

## Restrictions

- Only available to session owners
- Only available before roster is locked
- Not available for past sessions
- Not available for cancelled sessions

## Implementation Details

### New Functions
- `updateSession(sessionId, updateData)` in `src/lib/sessions.ts`
  - Updates only provided fields (partial update)
  - Returns updated session

### Routes
- `GET /s/:id/edit` - Edit session form (reuses CreateSession component)

### Components Modified
- `CreateSession.tsx` - Now supports both create and edit modes
- `SessionDetails.tsx` - Added edit button to admin actions
- `App.tsx` - Added edit route

### Database
- No schema changes needed
- Uses existing `sessions` table
- RLS policy "Pool owners can update sessions" already covers this

## Testing

Added 7 new tests in `tests/sessions.test.ts`:
- Update session date and time together
- Update session location and court details
- Update session player limits
- Update session cost fields
- Update session duration
- Verify locked sessions (UI prevents, DB allows)

Run tests: `npm test -- tests/sessions.test.ts`

## Security

- RLS ensures only pool owners can update sessions
- UI prevents editing locked sessions
- Database allows updates but UI enforces business logic

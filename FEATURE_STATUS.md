# Feature Status: Player Opt-In System

## Current Feature: Player Opt-In System ✅ (Mostly Complete)

### What We Built

**Goal:** Allow players to opt themselves into sessions, eliminating manual coordination overhead.

**Completed:**
1. ✅ **Database Functions** (`src/lib/sessionParticipants.ts`)
   - `getSessionParticipants()` - Get all participants for a session
   - `getCurrentPlayerStatus()` - Get current player's status
   - `optInToSession()` - Opt in as "committed" or "maybe" (waitlist)
   - `optOutOfSession()` - Drop out of a session
   - `getCurrentPlayerId()` - Helper to get player ID from user ID

2. ✅ **RLS Policies** (`supabase/migrations/20260107133853_add_session_participants_insert_rls.sql`)
   - Players can insert their own participation records
   - Must be a member of the pool the session belongs to

3. ✅ **SessionDetails Page Updates** (`src/pages/SessionDetails.tsx`)
   - Shows participant count and list
   - Shows current player's status
   - "I'm In" and "Maybe" buttons
   - "Drop Out" button if already opted in
   - Waitlist logic: if session is full, "I'm In" goes to waitlist
   - Dynamic cost calculation using `get_session_cost_summary` function
   - Shows cost per guest, total players, courts needed
   - Warning if below minimum players

4. ✅ **Cost Calculation** (`src/lib/sessions.ts`)
   - `getSessionCostSummary()` - Calls database RPC to calculate costs
   - Returns: total players, guest count, courts needed, cost per guest

5. ✅ **Player-User Linking** (`src/lib/pools.ts`, `src/contexts/AuthContext.tsx`)
   - Automatically links player records to user accounts after sign-in
   - Matches by email address
   - Allows users to see pools they're members of

### Known Issues

1. **PoolDetails spinner** - Page may hang when loading (needs investigation)
   - Likely related to RLS policies or query permissions
   - Check browser console for errors

2. **Multiple migrations** - Created several migrations during development
   - Should consolidate before production
   - Current migrations are functional but could be cleaner

### Testing Flow

1. **As Pool Owner:**
   - Create a pool
   - Generate registration link
   - Create a session

2. **As Player:**
   - Use registration link to register (creates player record)
   - Sign in with magic link (auto-links player to user)
   - Navigate to session details
   - Click "I'm In" or "Maybe"
   - Verify participant count and cost update

### Next Steps

1. **Fix PoolDetails spinner issue**
   - Check RLS policies for `getPoolPlayers` and `getUpcomingSessions`
   - Verify user has proper permissions

2. **Payment Tracking** (Next Feature)
   - Auto-create payment records when players commit
   - Generate Venmo links
   - Payment dashboard for admins
   - Mark payments as received

### Technical Notes

- **RLS Pattern:** Used direct subquery pattern for simple ownership checks (see `docs/RLS_PATTERNS.md`)
- **Player Linking:** Player records created during registration are automatically linked to user accounts on sign-in
- **Cost Calculation:** Uses PostgreSQL function `get_session_cost_summary` which calculates costs based on committed players

### Files Changed

**New Files:**
- `src/lib/sessionParticipants.ts` - Participant management functions
- `supabase/migrations/20260107133009_sessions_rls_clean.sql` - Sessions RLS policies
- `supabase/migrations/20260107133853_add_session_participants_insert_rls.sql` - Participant RLS policies
- `supabase/migrations/20260107134950_add_player_user_id_update_policy.sql` - Player linking policy
- `supabase/migrations/20260107135000_add_player_user_id_update_policy.sql` - Player linking policy (updated)

**Modified Files:**
- `src/lib/sessions.ts` - Added `getSessionCostSummary()` function
- `src/lib/pools.ts` - Added `linkPlayerToUser()` and updated `getCurrentPlayerId()`
- `src/pages/SessionDetails.tsx` - Added opt-in UI and participant display
- `src/contexts/AuthContext.tsx` - Auto-link player records on sign-in
- `src/pages/Pools.tsx` - Updated to pass email for player linking


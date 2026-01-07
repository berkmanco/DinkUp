# Database Migrations Guide

## Supabase Migration Options

### Option 1: Supabase CLI Migrations (Recommended for Production) ⭐
**Best for:** Version control, team collaboration, production deployments

**Setup:**
```bash
# Initialize Supabase project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Create a new migration
supabase migration new fix_players_rls

# Apply migrations to remote
supabase db push
```

**Pros:**
- ✅ Version controlled
- ✅ Can rollback
- ✅ Tracks applied migrations automatically
- ✅ Works with CI/CD
- ✅ Can diff local vs remote

**Cons:**
- ❌ Requires CLI setup and linking
- ❌ Need project ref

---

### Option 2: Manual SQL in Supabase Dashboard (Current Approach)
**Best for:** Quick fixes, MVP, one-off changes

**How it works:**
- Migration files stored in `supabase/migrations/` for version control
- Copy SQL to Supabase SQL Editor
- Run directly
- Manually track what's been applied

**Pros:**
- ✅ Simple, no setup
- ✅ Immediate
- ✅ Version controlled (files in git)
- ✅ Easy to see history

**Cons:**
- ❌ Manual application
- ❌ Need to manually track what's applied
- ❌ Can't easily rollback

---

## Current Setup (Supabase CLI) ⭐

Supabase CLI is initialized and ready to use:

```
supabase/
  migrations/
    20260105000000_initial_schema.sql  ← Initial schema (source of truth)
  seed.sql                              ← Seed data (dev/testing only)
```

**Migration naming:** `YYYYMMDDHHMMSS_description.sql`

---

## Migrations - Source of Truth ⭐

### Migrations (`migrations/*.sql`)
- **Purpose:** Incremental changes that build up your database over time
- **Used by:** Supabase CLI tracks which migrations have been applied
- **When to use:** For all database changes (new tables, columns, policies, etc.)
- **History:** Shows the evolution of your schema
- **Source of truth:** The database state is the sum of all applied migrations

### Best Practice Workflow

1. **Make a change:** Create a migration file
   ```bash
   npm run db:migration add_new_feature
   ```

2. **Apply migration:** Push to database
   ```bash
   npm run db:push
   ```

3. **Verify:** Check that it worked as expected

### Important Notes

- **Supabase CLI tracks migrations** - they are the source of truth
- **Migrations are version controlled** - all changes tracked in git
- **For new projects:** Create an initial migration with the full schema, then use incremental migrations

---

## How to Create a Migration

1. **Create migration file:**
   ```bash
   # Generate timestamp
   date +%Y%m%d%H%M%S
   # Creates file: supabase/migrations/20260106191727_your_description.sql
   ```

2. **Write the SQL:**
   ```sql
   -- Migration: Fix players RLS policy
   -- Date: 2026-01-06
   
   drop policy if exists "old_policy" on table_name;
   create policy "new_policy" on table_name...
   ```

3. **Apply to database:**
   - Copy SQL to Supabase SQL Editor
   - Run it
   - Document that it's been applied

4. **Verify the change:**
   - Test that it works as expected

---

## Migration Checklist

When creating/applying a migration:
- [ ] Create migration file with timestamp
- [ ] Test in dev/staging first (if available)
- [ ] Document what it does in the file
- [ ] Check for breaking changes
- [ ] Apply to production via SQL Editor
- [ ] Verify it worked
- [ ] Commit migration file to git

---

## Database Seeding

Supabase supports seeding for **local development only**:

- **File:** `supabase/seed.sql` (automatically detected)
- **When it runs:** 
  - First time you run `supabase start` (local dev)
  - Every time you run `supabase db reset` (local dev)
  - **Never runs** when you do `supabase db push` (remote/production)
- **Purpose:** Populate local database with test data for development
- **⚠️ Local dev only** - seeds never run in production/remote databases

### Local Development Setup

Supabase has a full local development environment:

```bash
# Start local Supabase (requires Docker)
supabase start

# This will:
# 1. Start all Supabase services locally (DB, Auth, Storage, etc.)
# 2. Run all migrations
# 3. Run seed.sql (if present)

# Reset local database (migrations + seeds)
supabase db reset

# Push migrations to remote (NO seeds)
supabase db push
```

**Key Points:**
- ✅ Seeds run automatically in local dev (`supabase start` / `supabase db reset`)
- ✅ Seeds are safe - they only run locally, never on remote
- ✅ `supabase db push` only runs migrations, never seeds
- ⚠️ Seed files are optional - only include if you need test data

---

## Current Migrations

- `20260105000000_initial_schema.sql` - **Initial schema setup** - Complete database schema with all tables, types, functions, triggers, indexes, and RLS policies (with fixes already applied)
- `20260107003714_add_pool_owner_trigger.sql` - Auto-set owner_id from auth.uid()
- `20260107004104_add_pool_slug.sql` - Add slug field for short URLs

## Quick Reference

**Create new migration:**
```bash
npm run db:migration your_description
# or
supabase migration new your_description
```

**Apply migrations:**
```bash
npm run db:push
# or
supabase db push
```

**Check what's different:**
```bash
npm run db:diff
# or
supabase db diff
```

---

## Using Supabase CLI (Current Setup)

**Create a new migration:**
```bash
supabase migration new description_of_change
# Creates: supabase/migrations/TIMESTAMP_description_of_change.sql
```

**Apply migrations to remote:**
```bash
supabase db push
# Applies all pending migrations to your linked project
```

**Check migration status:**
```bash
supabase migration list
# Shows which migrations have been applied
```

**Other useful commands:**
```bash
supabase db diff              # See differences between local and remote
supabase db reset            # Reset local database (if using local dev)
supabase db remote commit    # Mark migrations as applied (if applied manually)
```

---

## Best Practices

1. **Always test first** - Try in dev/staging before production
2. **One change per migration** - Easier to debug and rollback
3. **Use transactions** - Wrap in BEGIN/COMMIT when possible
4. **Document breaking changes** - Note in migration file
5. **Migrations are the source of truth** - keep them clean and well-documented
6. **Version control everything** - All migrations in git

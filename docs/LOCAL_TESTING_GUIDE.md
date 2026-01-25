# Local Testing Guide

## Quick Start

```bash
# 1. Start local Supabase (one time, keeps running)
supabase start

# 2. Run all tests
npm test

# 3. Watch mode (for development)
npm test -- --watch
```

That's it! Tests will run against your local Supabase instance.

---

## Why Test Locally?

### ✅ **Benefits**
- **Fast**: No network latency (< 1s for most tests)
- **Free**: No Supabase usage charges
- **Isolated**: Won't affect production data
- **Catch errors early**: Before committing
- **Test RLS**: Verify security policies work correctly
- **Test migrations**: Apply and test migrations locally first

### ❌ **Running Tests Against Production**
- **Slow**: Network latency adds seconds per test
- **Expensive**: Counts against Supabase limits
- **Dangerous**: Could modify/delete production data
- **Pollutes DB**: Creates test data in production

---

## Setup (One-Time)

### Prerequisites
1. **Docker Desktop** installed and running
2. **Supabase CLI** installed (already have ✅)

### Initial Setup
```bash
# Start local Supabase
supabase start

# This will:
# - Start PostgreSQL, Auth, Storage, etc.
# - Run all migrations automatically
# - Run seed.sql if present
# - Print connection details

# Expected output:
#   API URL: http://127.0.0.1:54321
#   Studio URL: http://127.0.0.1:54323
#   ...
```

---

## Test Categories & Requirements

### **1. Client Library Tests** (10 tests)
**File**: `tests/notificationPreferences.test.ts`

```bash
# Requirements:
✅ Local Supabase running (supabase start)

# What it tests:
- getUserPreferences()
- updatePreference()
- shouldNotify()
- initializeDefaultPreferences()
- Email/SMS toggle independence
- Persistence

# Run:
npm test notificationPreferences.test.ts
```

### **2. Database & RLS Tests** (15 tests)
**File**: `tests/notificationPreferencesDatabase.test.ts`

```bash
# Requirements:
✅ Local Supabase running (supabase start)
✅ Migrations applied (automatic on supabase start)

# What it tests:
- RLS SELECT policies
- RLS INSERT/UPDATE/DELETE policies
- UNIQUE constraints
- CHECK constraints
- Upsert behavior
- Timestamp auto-updates

# Run:
npm test notificationPreferencesDatabase.test.ts
```

### **3. Edge Function Tests** (15 tests) ⚠️
**File**: `tests/edgeFunctionNotificationPreferences.test.ts`

```bash
# Requirements:
✅ Local Supabase running (supabase start)
✅ Edge Functions deployed locally (supabase functions serve)

# What it tests:
- shouldNotifyUser() in Edge Function
- Notification type mapping
- Email/SMS preference checks
- Fallback to defaults
- notifications_log entries

# Run:
# Terminal 1:
supabase functions serve

# Terminal 2:
npm test edgeFunctionNotificationPreferences.test.ts
```

**Note**: Edge Function tests currently **skip automatically** because they require the Edge Function to be running. See "Edge Function Testing" section below.

---

## Common Workflows

### **Before Every Commit** (Recommended)
```bash
# Run quick tests (client + database)
npm test

# If all pass, commit!
git add .
git commit -m "Your message"
```

### **Full Test Suite** (Before merging PR)
```bash
# Terminal 1: Start Edge Functions
supabase functions serve

# Terminal 2: Run all tests
npm test

# Or run specific suites:
npm test notificationPreferences        # Client library
npm test notificationPreferencesDatabase # Database/RLS
npm test edgeFunctionNotificationPreferences # Edge Functions
```

### **Watch Mode** (During development)
```bash
# Auto-rerun tests on file changes
npm test -- --watch

# Watch specific file:
npm test notificationPreferences -- --watch
```

### **After Pulling New Migrations**
```bash
# Apply new migrations to local DB
supabase migration up --local

# Or full reset (wipes all data):
supabase db reset

# Then run tests:
npm test
```

---

## Edge Function Testing

### **Current Status**
Edge Function tests are **disabled by default** because:
1. They require `supabase functions serve` running
2. Edge Functions may not be deployed locally
3. CI doesn't have Edge Functions

### **To Enable Edge Function Tests**

```bash
# Terminal 1: Start Edge Functions
supabase functions serve

# Terminal 2: Run tests
npm test edgeFunctionNotificationPreferences.test.ts
```

### **Why Are They Skipped?**
```typescript
// In test files:
describe.skipIf(SKIP_DB_TESTS)('Edge Function Tests', () => {
  // Tests skip in CI (process.env.CI === 'true')
  // Tests skip if Edge Functions not running
})
```

### **Future Improvement**
Could add a check to auto-detect if Edge Functions are running:
```typescript
const EDGE_FUNCTIONS_RUNNING = await checkEdgeFunctions()
describe.skipIf(!EDGE_FUNCTIONS_RUNNING)('Edge Function Tests', () => {
  // Only run if Edge Functions available
})
```

---

## CI/CD (GitHub Actions)

### **Current Behavior**
Tests **automatically skip in CI** because:
- CI doesn't have local Supabase running
- CI doesn't have Docker
- CI uses `SKIP_DB_TESTS` flag

```typescript
// In tests/setup.ts:
export const IS_CI = process.env.CI === 'true'
export const SKIP_DB_TESTS = IS_CI

// In test files:
describe.skipIf(SKIP_DB_TESTS)('Database Tests', () => {
  // Skipped in CI ✅
})
```

### **Future CI Setup** (Optional)
You could run tests in CI with Docker + Supabase CLI:

```yaml
# .github/workflows/ci.yml
- name: Start Supabase
  run: |
    supabase start
    supabase functions serve &
    
- name: Run tests
  run: npm test
```

**Pros**: Tests run in CI  
**Cons**: Slower CI, more complex setup

---

## Troubleshooting

### **Tests fail with "No pools found"**
```bash
# Your DB is empty, need seed data:
supabase db reset

# Or manually create a pool in Studio:
open http://127.0.0.1:54323
```

### **Tests fail with "Connection refused"**
```bash
# Supabase not running:
supabase start

# Check status:
supabase status
```

### **Edge Function tests always skip**
```bash
# Normal! They skip unless Edge Functions are running.
# To enable:
supabase functions serve
```

### **Tests are slow (> 5s)**
```bash
# Probably hitting production DB, not local.
# Check your .env files:

# Should have .env.local with:
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>

# Get keys from:
supabase start
```

### **"Operation not permitted" errors**
```bash
# Sandbox/permission issues (not a real problem).
# Tests still run successfully.
```

### **Want to reset everything**
```bash
# Stop and wipe all data:
supabase stop
supabase start

# Or just reset DB:
supabase db reset
```

---

## Best Practices

### ✅ **DO**
- Run `npm test` before every commit
- Use local Supabase for development
- Test migrations locally before pushing
- Run full test suite before merging PRs
- Use watch mode during active development

### ❌ **DON'T**
- Run tests against production DB
- Commit without running tests
- Skip Edge Function tests if you changed the Edge Function
- Ignore test failures ("I'll fix it later")

---

## Test Data

### **Seed Data** (`supabase/seed.sql`)
Local Supabase runs `seed.sql` on first start:
- Creates test pools
- Creates test players
- Sets up initial data

### **Test Isolation**
Tests create their own data:
- Unique emails (`test-${Date.now()}@test.com`)
- Unique pools/sessions per test
- Cleanup in `afterAll` hooks (future improvement)

### **Viewing Test Data**
```bash
# Supabase Studio:
open http://127.0.0.1:54323

# Or direct SQL:
supabase db diff
```

---

## Performance

### **Expected Test Times** (Local)
- Client library tests: ~1-2s (10 tests)
- Database/RLS tests: ~2-3s (15 tests)
- Edge Function tests: ~5-10s (15 tests)
- **Total**: ~8-15s for all tests

### **If Tests Are Slow** (> 30s)
- Check you're using local Supabase (not production)
- Check network connectivity
- Check Docker performance
- Consider reducing test timeout (currently 30s)

---

## Summary

**Recommended Workflow:**
```bash
# 1. One-time setup
supabase start

# 2. Before every commit
npm test

# 3. Before merging PR (with Edge Functions)
# Terminal 1:
supabase functions serve

# Terminal 2:
npm test

# 4. After pulling new code
supabase migration up --local
npm test
```

**Key Points:**
- ✅ Tests run against **local Supabase** by default
- ✅ Fast, free, isolated testing
- ✅ Edge Function tests **skip** unless you start them
- ✅ CI tests **skip** (no local Supabase in CI yet)
- ✅ All 40 notification preference tests covered

---

## Files Changed

**Tests now use local Supabase:**
- ✅ `tests/notificationPreferences.test.ts`
- ✅ `tests/notificationPreferencesDatabase.test.ts`
- ✅ `tests/edgeFunctionNotificationPreferences.test.ts`

**All tests use:**
- `getServiceClient()` - Local Supabase with admin privileges
- `getAnonClient()` - Local Supabase with anonymous access
- `SKIP_DB_TESTS` - Skip in CI environments

---

**Ready to test!** 🚀

```bash
npm test
```

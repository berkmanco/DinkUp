import { describe, it, expect, beforeAll } from 'vitest'
import { getServiceClient, getAnonClient, SKIP_DB_TESTS } from './setup'

/**
 * Database Constraint & RLS Policy Tests
 * 
 * Tests for database constraints, RLS policies, and data integrity
 * of the notification_preferences table.
 * 
 * REQUIREMENTS:
 * 1. Local Supabase running: `supabase start`
 * 2. Migrations applied: `supabase db reset` or `supabase migration up --local`
 * 
 * SKIP IN CI:
 * These tests are automatically skipped in CI environments (no local Supabase).
 */
describe.skipIf(SKIP_DB_TESTS)('Notification Preferences Database', () => {
  const supabase = getServiceClient()
  let testUserId1: string
  let testUserId2: string

  beforeAll(async () => {
    // Create two test users
    const { data: user1 } = await supabase.auth.admin.createUser({
      email: `test-db-1-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true,
    })
    const { data: user2 } = await supabase.auth.admin.createUser({
      email: `test-db-2-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true,
    })

    if (!user1?.user || !user2?.user) throw new Error('Failed to create test users')

    testUserId1 = user1.user.id
    testUserId2 = user2.user.id
    
    // Clean up any existing preferences
    await supabase.from('notification_preferences').delete().eq('user_id', testUserId1)
    await supabase.from('notification_preferences').delete().eq('user_id', testUserId2)
  })

  describe('RLS Policies', () => {
    it('should allow service role to read all preferences', async () => {
      // Insert a preference for user1
      const { error: insertError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: testUserId1,
          notification_type: 'session_reminder_24h',
          email_enabled: true,
          sms_enabled: false,
        })

      expect(insertError).toBeNull()

      // Service role should be able to read all
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', testUserId1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.length).toBeGreaterThan(0)
    })

    it('should allow service role to update preferences', async () => {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ email_enabled: false })
        .eq('user_id', testUserId1)
        .eq('notification_type', 'session_reminder_24h')

      expect(error).toBeNull()

      // Verify update
      const { data } = await supabase
        .from('notification_preferences')
        .select('email_enabled')
        .eq('user_id', testUserId1)
        .eq('notification_type', 'session_reminder_24h')
        .single()

      expect(data?.email_enabled).toBe(false)
    })

    it('should allow service role to delete preferences', async () => {
      // Insert a temp preference
      await supabase
        .from('notification_preferences')
        .insert({
          user_id: testUserId1,
          notification_type: 'waitlist_promotion',
          email_enabled: true,
          sms_enabled: false,
        })

      // Delete it
      const { error } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', testUserId1)
        .eq('notification_type', 'waitlist_promotion')

      expect(error).toBeNull()
    })
  })

  describe('Database Constraints', () => {
    it('should enforce UNIQUE constraint on (user_id, notification_type)', async () => {
      // Insert a preference
      const { error: error1 } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: testUserId1,
          notification_type: 'session_cancelled',
          email_enabled: true,
          sms_enabled: false,
        })

      expect(error1).toBeNull()

      // Try to insert duplicate
      const { error: error2 } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: testUserId1,
          notification_type: 'session_cancelled',
          email_enabled: false,
          sms_enabled: true,
        })

      // Should fail with unique constraint violation
      expect(error2).toBeDefined()
      expect(error2?.message).toContain('duplicate')
    })

    it('should enforce CHECK constraint on notification_type', async () => {
      const { error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: testUserId1,
          notification_type: 'invalid_type', // Invalid type
          email_enabled: true,
          sms_enabled: false,
        })

      // Should fail with check constraint violation
      expect(error).toBeDefined()
      expect(error?.message).toContain('check')
    })

    it('should allow valid notification types', async () => {
      const validTypes = [
        'payment_request',
        'payment_reminder',
        'waitlist_promotion',
        'session_cancelled',
      ]

      // Clean first
      await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', testUserId1)

      for (const type of validTypes) {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: testUserId1,
            notification_type: type,
            email_enabled: true,
            sms_enabled: false,
          })

        expect(error).toBeNull()
      }
    })

    it('should auto-update updated_at timestamp', async () => {
      // Clean first
      await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', testUserId1)
        .eq('notification_type', 'session_reminder_24h')
      
      // Insert
      const { data: inserted } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: testUserId1,
          notification_type: 'session_reminder_24h',
          email_enabled: true,
          sms_enabled: false,
        })
        .select()
        .single()

      const createdAt = new Date(inserted.created_at)
      const updatedAt1 = new Date(inserted.updated_at)

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update
      const { data: updated } = await supabase
        .from('notification_preferences')
        .update({ sms_enabled: true })
        .eq('user_id', testUserId1)
        .eq('notification_type', 'session_reminder_24h')
        .select()
        .single()

      const updatedAt2 = new Date(updated.updated_at)

      // updated_at should have changed
      expect(updatedAt2.getTime()).toBeGreaterThan(updatedAt1.getTime())
    })
  })

  describe('Data Integrity', () => {
    it('should handle boolean values correctly', async () => {
      // Clean first
      await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', testUserId1)
        .eq('notification_type', 'waitlist_promotion')
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: testUserId1,
          notification_type: 'waitlist_promotion',
          email_enabled: true,
          sms_enabled: false,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(typeof data.email_enabled).toBe('boolean')
      expect(typeof data.sms_enabled).toBe('boolean')
      expect(data.email_enabled).toBe(true)
      expect(data.sms_enabled).toBe(false)
    })
  })

  describe('Upsert Behavior', () => {
    it('should support upsert (ON CONFLICT DO UPDATE)', async () => {
      // Clean first
      await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', testUserId1)
        .eq('notification_type', 'payment_request')
      
      // First insert
      await supabase
        .from('notification_preferences')
        .insert({
          user_id: testUserId1,
          notification_type: 'payment_request',
          email_enabled: true,
          sms_enabled: false,
        })

      // Upsert (should update)
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: testUserId1,
          notification_type: 'payment_request',
          email_enabled: false,
          sms_enabled: true,
        })

      expect(error).toBeNull()

      // Verify it was updated, not duplicated
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', testUserId1)
        .eq('notification_type', 'payment_request')

      expect(data?.length).toBe(1)
      expect(data?.[0].email_enabled).toBe(false)
      expect(data?.[0].sms_enabled).toBe(true)
    })
  })
})

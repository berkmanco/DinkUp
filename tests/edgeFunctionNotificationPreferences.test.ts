import { describe, it, expect, beforeAll } from 'vitest'
import { supabase } from '../src/lib/supabase'
import { getFirstPool, createTestSession } from './setup'
import { updatePreference } from '../src/lib/notificationPreferences'

/**
 * These tests verify that the Edge Function's shouldNotifyUser() logic
 * correctly respects granular notification preferences.
 * 
 * NOTE: These are integration tests that require the Edge Function to be deployed.
 * They test the actual notification sending logic, not just the client library.
 */
describe('Edge Function Notification Preferences Integration', () => {
  let testUserId: string
  let testPoolId: string
  let testSessionId: string
  let testPlayerId: string

  beforeAll(async () => {
    const pool = await getFirstPool()
    testPoolId = pool.id
    testUserId = pool.owner_id

    // Get the player record for this user
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', testUserId)
      .single()
    
    if (!player) throw new Error('Test player not found')
    testPlayerId = player.id

    // Create a test session
    const session = await createTestSession(testPoolId)
    testSessionId = session.id
  })

  describe('Session Reminders', () => {
    it('should send email when email enabled, skip SMS when disabled', async () => {
      // Set preferences: email ON, SMS OFF
      await updatePreference(testUserId, 'session_reminder_24h', true, false)

      // Invoke the Edge Function
      const { data, error } = await supabase.functions.invoke('notify', {
        body: {
          type: 'session_reminder',
          sessionId: testSessionId,
        },
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      // Check notifications log
      const { data: logs } = await supabase
        .from('notifications_log')
        .select('*')
        .eq('session_id', testSessionId)
        .eq('player_id', testPlayerId)
        .eq('type', 'session_reminder')
        .order('created_at', { ascending: false })
        .limit(2)

      // Should have sent email but not SMS
      const emailLog = logs?.find(l => l.channel === 'email')
      const smsLog = logs?.find(l => l.channel === 'sms')

      expect(emailLog).toBeDefined()
      expect(emailLog?.success).toBe(true)
      expect(smsLog).toBeUndefined()
    })

    it('should skip both email and SMS when both disabled', async () => {
      // Disable both
      await updatePreference(testUserId, 'session_reminder_24h', false, false)

      const logCountBefore = await supabase
        .from('notifications_log')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', testPlayerId)

      // Invoke
      await supabase.functions.invoke('notify', {
        body: {
          type: 'session_reminder',
          sessionId: testSessionId,
        },
      })

      const logCountAfter = await supabase
        .from('notifications_log')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', testPlayerId)

      // Should not create new logs
      expect(logCountAfter.count).toBe(logCountBefore.count)
    })

    it('should send both when both enabled', async () => {
      // Enable both
      await updatePreference(testUserId, 'session_reminder_24h', true, true)

      // Ensure player has phone number
      await supabase
        .from('players')
        .update({ phone: '+15555551234' })
        .eq('id', testPlayerId)

      // Invoke
      await supabase.functions.invoke('notify', {
        body: {
          type: 'session_reminder',
          sessionId: testSessionId,
        },
      })

      // Check logs
      const { data: logs } = await supabase
        .from('notifications_log')
        .select('*')
        .eq('session_id', testSessionId)
        .eq('player_id', testPlayerId)
        .eq('type', 'session_reminder')
        .order('created_at', { ascending: false })
        .limit(2)

      const emailLog = logs?.find(l => l.channel === 'email')
      const smsLog = logs?.find(l => l.channel === 'sms')

      expect(emailLog).toBeDefined()
      expect(smsLog).toBeDefined()
    })
  })

  describe('Payment Requests', () => {
    it('should respect payment_request preferences independently', async () => {
      // Session reminder ON, payment request OFF
      await updatePreference(testUserId, 'session_reminder_24h', true, true)
      await updatePreference(testUserId, 'payment_request', false, false)

      // Lock roster to trigger payment requests
      await supabase.functions.invoke('notify', {
        body: {
          type: 'roster_locked',
          sessionId: testSessionId,
        },
      })

      // Check that NO payment notification was sent
      const { data: paymentLogs } = await supabase
        .from('notifications_log')
        .select('*')
        .eq('player_id', testPlayerId)
        .eq('type', 'roster_locked')
        .order('created_at', { ascending: false })
        .limit(1)

      // Should be empty or very old
      if (paymentLogs && paymentLogs.length > 0) {
        const logAge = Date.now() - new Date(paymentLogs[0].created_at).getTime()
        expect(logAge).toBeGreaterThan(60000) // More than 1 minute old
      }
    })
  })

  describe('Fallback Behavior', () => {
    it('should use defaults when preferences do not exist in DB', async () => {
      // Create a new user without initializing preferences
      const { data: authData } = await supabase.auth.signUp({
        email: `test-edge-${Date.now()}@test.com`,
        password: 'test123456',
      })

      if (!authData.user) throw new Error('Failed to create test user')

      // Create player for this user
      const { data: newPlayer } = await supabase
        .from('players')
        .insert({
          user_id: authData.user.id,
          name: 'Test Edge User',
          email: authData.user.email,
        })
        .select()
        .single()

      // Add to pool
      await supabase.from('pool_players').insert({
        pool_id: testPoolId,
        player_id: newPlayer.id,
        is_active: true,
      })

      // Send notification (should use defaults: email ON, SMS OFF)
      await supabase.functions.invoke('notify', {
        body: {
          type: 'session_created',
          sessionId: testSessionId,
        },
      })

      // Should have sent email
      const { data: logs } = await supabase
        .from('notifications_log')
        .select('*')
        .eq('player_id', newPlayer.id)
        .eq('type', 'session_created')

      expect(logs?.length).toBeGreaterThan(0)
      expect(logs?.find(l => l.channel === 'email')).toBeDefined()
    })
  })

  describe('Notification Type Mapping', () => {
    it('should correctly map roster_locked to payment_request preference', async () => {
      // Disable payment_request
      await updatePreference(testUserId, 'payment_request', false, false)

      // Send roster_locked notification
      await supabase.functions.invoke('notify', {
        body: {
          type: 'roster_locked',
          sessionId: testSessionId,
        },
      })

      // Should not send
      const { count } = await supabase
        .from('notifications_log')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', testPlayerId)
        .eq('type', 'roster_locked')
        .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Last 30 seconds

      expect(count).toBe(0)
    })

    it('should correctly map payment_reminder to payment_reminder preference', async () => {
      // Enable only payment_reminder
      await updatePreference(testUserId, 'payment_request', false, false)
      await updatePreference(testUserId, 'payment_reminder', true, false)

      // Send payment reminder
      await supabase.functions.invoke('notify', {
        body: {
          type: 'payment_reminder',
          sessionId: testSessionId,
        },
      })

      // Should send
      const { data: logs } = await supabase
        .from('notifications_log')
        .select('*')
        .eq('player_id', testPlayerId)
        .eq('type', 'payment_reminder')
        .gte('created_at', new Date(Date.now() - 30000).toISOString())

      expect(logs?.length).toBeGreaterThan(0)
    })
  })
})

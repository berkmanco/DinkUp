import { describe, it, expect, beforeAll } from 'vitest'
import { getServiceClient, getFirstPool, SKIP_DB_TESTS } from './setup'
import { 
  getUserPreferences, 
  updatePreference, 
  shouldNotify,
  initializeDefaultPreferences,
  NotificationType 
} from '../src/lib/notificationPreferences'

/**
 * Client Library Tests for Notification Preferences
 * 
 * Tests the frontend TypeScript library (src/lib/notificationPreferences.ts).
 * 
 * REQUIREMENTS:
 * 1. Local Supabase running: `supabase start`
 * 2. Migrations applied: `supabase db reset` or `supabase migration up --local`
 * 
 * SKIP IN CI:
 * These tests are automatically skipped in CI environments (no local Supabase).
 */
describe.skipIf(SKIP_DB_TESTS)('Notification Preferences', () => {
  const supabase = getServiceClient()
  let testUserId: string
  let testPoolId: string

  beforeAll(async () => {
    const pool = await getFirstPool(supabase)
    testPoolId = pool.id
    testUserId = pool.owner_id
    
    // Clean up any existing preferences for this user
    await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', testUserId)
  })

  it('should get default preferences for user', async () => {
    const prefs = await getUserPreferences(testUserId, supabase)
    
    expect(prefs.size).toBeGreaterThanOrEqual(5)
    
    // Check defaults: email ON, SMS OFF
    const sessionReminderPref = prefs.get('session_reminder_24h')
    expect(sessionReminderPref).toBeDefined()
    expect(sessionReminderPref?.email_enabled).toBe(true)
    expect(sessionReminderPref?.sms_enabled).toBe(false)
  })

  it('should update single preference', async () => {
    // Enable SMS for session reminders
    await updatePreference(testUserId, 'session_reminder_24h', true, true, supabase)
    
    const prefs = await getUserPreferences(testUserId, supabase)
    const pref = prefs.get('session_reminder_24h')
    
    expect(pref?.email_enabled).toBe(true)
    expect(pref?.sms_enabled).toBe(true)
  })

  it('should disable email for specific type', async () => {
    // Disable email for payment reminders
    await updatePreference(testUserId, 'payment_reminder', false, false, supabase)
    
    const prefs = await getUserPreferences(testUserId, supabase)
    const pref = prefs.get('payment_reminder')
    
    expect(pref?.email_enabled).toBe(false)
    expect(pref?.sms_enabled).toBe(false)
  })

  it('should check if user should be notified via email', async () => {
    // Reset to defaults
    await updatePreference(testUserId, 'payment_request', true, false, supabase)
    
    const shouldEmail = await shouldNotify(testUserId, 'payment_request', 'email', supabase)
    const shouldSms = await shouldNotify(testUserId, 'payment_request', 'sms', supabase)
    
    expect(shouldEmail).toBe(true)
    expect(shouldSms).toBe(false)
  })

  it('should check if user should be notified via SMS', async () => {
    // Enable SMS for payment requests
    await updatePreference(testUserId, 'payment_request', true, true, supabase)
    
    const shouldSms = await shouldNotify(testUserId, 'payment_request', 'sms', supabase)
    expect(shouldSms).toBe(true)
  })

  it('should initialize default preferences for new user', async () => {
    // Create a test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-prefs-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true,
    })
    
    if (!authData.user) throw new Error('Failed to create test user')
    
    await initializeDefaultPreferences(authData.user.id, supabase)
    
    const prefs = await getUserPreferences(authData.user.id, supabase)
    expect(prefs.size).toBe(5)
    
    // All should have email ON, SMS OFF
    prefs.forEach((pref, type) => {
      expect(pref.email_enabled).toBe(true)
      expect(pref.sms_enabled).toBe(false)
    })
  })

  it('should allow independent email and SMS toggles', async () => {
    // Email ON, SMS OFF
    await updatePreference(testUserId, 'session_reminder_24h', true, false, supabase)
    let pref = (await getUserPreferences(testUserId, supabase)).get('session_reminder_24h')
    expect(pref?.email_enabled).toBe(true)
    expect(pref?.sms_enabled).toBe(false)
    
    // Email OFF, SMS ON
    await updatePreference(testUserId, 'session_reminder_24h', false, true, supabase)
    pref = (await getUserPreferences(testUserId, supabase)).get('session_reminder_24h')
    expect(pref?.email_enabled).toBe(false)
    expect(pref?.sms_enabled).toBe(true)
    
    // Both OFF
    await updatePreference(testUserId, 'session_reminder_24h', false, false, supabase)
    pref = (await getUserPreferences(testUserId, supabase)).get('session_reminder_24h')
    expect(pref?.email_enabled).toBe(false)
    expect(pref?.sms_enabled).toBe(false)
    
    // Both ON
    await updatePreference(testUserId, 'session_reminder_24h', true, true, supabase)
    pref = (await getUserPreferences(testUserId, supabase)).get('session_reminder_24h')
    expect(pref?.email_enabled).toBe(true)
    expect(pref?.sms_enabled).toBe(true)
  })

  it('should support all notification types', async () => {
    const types: NotificationType[] = [
      'session_reminder_24h',
      'payment_request',
      'payment_reminder',
      'waitlist_promotion',
      'session_cancelled',
    ]
    
    for (const type of types) {
      await updatePreference(testUserId, type, true, false, supabase)
      const shouldEmail = await shouldNotify(testUserId, type, 'email', supabase)
      expect(shouldEmail).toBe(true)
    }
  })

  it('should persist preferences across sessions', async () => {
    // Set specific preferences
    await updatePreference(testUserId, 'payment_reminder', false, true, supabase)
    
    // Fetch again (simulating page reload)
    const prefs = await getUserPreferences(testUserId, supabase)
    const pref = prefs.get('payment_reminder')
    
    expect(pref?.email_enabled).toBe(false)
    expect(pref?.sms_enabled).toBe(true)
  })

  it('should handle missing preferences with defaults', async () => {
    // Create a user without initializing preferences
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-no-prefs-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true,
    })
    
    if (!authData.user) throw new Error('Failed to create test user')
    
    // Should return defaults even without DB rows
    const shouldEmail = await shouldNotify(authData.user.id, 'session_reminder_24h', 'email', supabase)
    const shouldSms = await shouldNotify(authData.user.id, 'session_reminder_24h', 'sms', supabase)
    
    expect(shouldEmail).toBe(true) // Default email ON
    expect(shouldSms).toBe(false) // Default SMS OFF
  })
})

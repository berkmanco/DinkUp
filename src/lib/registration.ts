import { supabase } from './supabase'

export interface RegistrationLink {
  id: string
  pool_id: string
  token: string
  created_by: string | null
  expires_at: string
  used_at: string | null
  used_by: string | null
  created_at: string
}

export interface RegistrationLinkWithPool extends RegistrationLink {
  pools: {
    id: string
    name: string
    slug: string
  }
}

export interface RegistrationData {
  name: string
  phone?: string
  email: string
  venmo_account: string
  notification_preferences?: {
    email: boolean
    sms: boolean
  }
}

// Create a registration link for a pool
export async function createRegistrationLink(poolId: string) {
  const { data, error } = await supabase
    .from('registration_links')
    .insert({
      pool_id: poolId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })
    .select()
    .single()

  if (error) throw error
  return data as RegistrationLink
}

// Validate a registration token
export async function validateRegistrationToken(token: string) {
  if (!supabase) {
    throw new Error('Database connection not available')
  }

  const { data, error } = await supabase
    .from('registration_links')
    .select(`
      *,
      pools (
        id,
        name,
        slug
      )
    `)
    .eq('token', token)
    .single()

  if (error) {
    console.error('Supabase error validating token:', error)
    throw error
  }

  if (!data) {
    throw new Error('Registration link not found')
  }

  const link = data as RegistrationLinkWithPool

  // Check if already used
  if (link.used_at) {
    throw new Error('This registration link has already been used')
  }

  // Check if expired
  if (new Date(link.expires_at) < new Date()) {
    throw new Error('This registration link has expired')
  }

  return link
}

// Register a player using a token
export async function registerPlayer(token: string, registrationData: RegistrationData) {
  // First validate the token
  const link = await validateRegistrationToken(token)

  // Create player record using security definer function to bypass RLS
  const { data: playerId, error: functionError } = await supabase.rpc(
    'create_player_for_registration',
    {
      p_name: registrationData.name,
      p_phone: registrationData.phone || null,
      p_email: registrationData.email,
      p_venmo_account: registrationData.venmo_account,
      p_notification_preferences: registrationData.notification_preferences || {
        email: true,
        sms: false,
      },
    }
  )

  if (functionError) {
    console.error('Error creating player:', functionError)
    throw functionError
  }
  if (!playerId) throw new Error('Failed to create player')

  // Fetch the created player (need to use the public RLS policy or another function)
  // Since we just created it, we can construct the player object from what we know
  // Or use a function to fetch it
  const player = {
    id: playerId,
    name: registrationData.name,
    phone: registrationData.phone || null,
    email: registrationData.email,
    venmo_account: registrationData.venmo_account,
    notification_preferences: registrationData.notification_preferences || {
      email: true,
      sms: false,
    },
    user_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Add player to pool
  const { error: poolPlayerError } = await supabase
    .from('pool_players')
    .insert({
      pool_id: link.pool_id,
      player_id: player.id,
      is_active: true,
    })

  if (poolPlayerError) throw poolPlayerError

  // Mark registration link as used
  const { error: linkError } = await supabase
    .from('registration_links')
    .update({
      used_at: new Date().toISOString(),
      used_by: player.id,
    })
    .eq('id', link.id)

  if (linkError) throw linkError

  return {
    player,
    pool: link.pools,
  }
}

// Get registration links for a pool (admin only)
export async function getRegistrationLinks(poolId: string) {
  const { data, error } = await supabase
    .from('registration_links')
    .select('*')
    .eq('pool_id', poolId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as RegistrationLink[]
}


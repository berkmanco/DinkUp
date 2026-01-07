import { createClient } from '@supabase/supabase-js'

// Vite loads .env.local over .env
// Use .env.local for local dev, .env for remote/production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Detect if we're using local Supabase
const isLocal = supabaseUrl?.includes('127.0.0.1') || supabaseUrl?.includes('localhost')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
  console.error('\n💡 For local dev: Create .env.local with local Supabase credentials')
  console.error('   Run: supabase start (then copy credentials to .env.local)')
  // Don't throw - let the component handle the error gracefully
} else if (isLocal) {
  console.log('🔧 Using LOCAL Supabase:', supabaseUrl)
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any // Will be checked in components


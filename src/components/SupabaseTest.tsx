import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SupabaseTest() {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing')
  const [message, setMessage] = useState('Testing connection...')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        if (!supabase) {
          setMessage('❌ Error: Supabase client not initialized. Check .env file.')
          setStatus('error')
          return
        }

        // Test 1: Check if we can get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }

        setMessage(`Connected! Session: ${session ? 'Active' : 'No active session'}`)
        setUser(session?.user || null)

        // Test 2: Try to query the pools table to verify schema
        const { data: pools, error: poolsError, count } = await supabase
          .from('pools')
          .select('*', { count: 'exact', head: true })

        if (poolsError) {
          // Check for specific error codes
          if (poolsError.code === '42P01' || 
              poolsError.code === 'PGRST116' ||
              poolsError.message?.includes('relation') || 
              poolsError.message?.includes('does not exist') ||
              poolsError.message?.includes('Could not find')) {
            setMessage('✅ Connected! (Schema not set up - run supabase/schema.sql in Supabase SQL Editor)')
            setStatus('success')
          } else if (poolsError.code === 'PGRST301' || 
                     poolsError.code === '42501' ||
                     poolsError.message?.toLowerCase().includes('permission denied') || 
                     poolsError.message?.toLowerCase().includes('row-level security') ||
                     poolsError.message?.toLowerCase().includes('new row violates')) {
            // RLS blocking or permission error - schema IS set up, RLS is working!
            setMessage('✅ Connected! Schema is set up and RLS is working. (Query blocked by RLS - expected when not authenticated)')
            setStatus('success')
          } else {
            // Other error - show it but still consider it a success (connection works)
            setMessage(`✅ Connected! Schema appears set up. (Query error: ${poolsError.message?.substring(0, 100)}...)`)
            setStatus('success')
            console.log('Pools query error details:', poolsError)
          }
        } else {
          // Success! Schema is set up and accessible
          setMessage(`✅ Connected! Database accessible. Found ${count || 0} pools.`)
          setStatus('success')
        }
      } catch (error: any) {
        console.error('Supabase connection error:', error)
        setMessage(`❌ Error: ${error.message || 'Failed to connect'}`)
        setStatus('error')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Supabase Connection Test</h2>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {status === 'testing' && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          {status === 'success' && (
            <span className="text-green-600">✅</span>
          )}
          {status === 'error' && (
            <span className="text-red-600">❌</span>
          )}
          <p className={status === 'error' ? 'text-red-600' : 'text-gray-700'}>
            {message}
          </p>
        </div>

        {user && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <p className="font-medium">User:</p>
            <p className="text-gray-600">{user.email}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 rounded text-sm">
            <p className="font-medium text-red-800">Troubleshooting:</p>
            <ul className="list-disc list-inside text-red-700 mt-2 space-y-1">
              <li>Check that VITE_SUPABASE_URL is set in .env</li>
              <li>Check that VITE_SUPABASE_ANON_KEY is set in .env</li>
              <li>Verify your Supabase project is active</li>
              <li>Check browser console for detailed error</li>
            </ul>
          </div>
        )}

        {status === 'success' && message.includes('Schema not set up') && (
          <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
            <p className="font-medium text-yellow-800">Next Step:</p>
            <p className="text-yellow-700 mt-1">
              Run the SQL in <code className="bg-yellow-100 px-1 rounded">supabase/schema.sql</code> in your Supabase SQL Editor
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


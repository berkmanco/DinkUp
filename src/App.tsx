import SupabaseTest from './components/SupabaseTest'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Pickleballers</h1>
        <p className="mt-2 text-gray-600">Testing Supabase connection...</p>
        <SupabaseTest />
      </div>
    </div>
  )
}

export default App


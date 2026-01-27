import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  return (
    <div className="flex flex-col min-h-screen">
      <div className={`flex-1 ${isHomePage ? 'bg-[#2D3640]' : 'bg-gray-100'}`}>
        <Navbar />
        <main className={isHomePage ? '' : 'container mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-4'}>
          <Outlet />
        </main>
      </div>
      
      {/* Footer */}
      <footer className={`py-4 text-center text-sm flex-shrink-0 ${isHomePage ? 'bg-[#2D3640] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
        <div className="container mx-auto px-4">
          © {new Date().getFullYear()} DinkUp · Built by{' '}
          <a 
            href="https://berkman.co" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#3CBBB1] hover:text-[#35a8a0] transition-colors"
          >
            BerkmanCo
          </a>
        </div>
      </footer>
    </div>
  )
}


import { Menu, Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const pageNames = {
  '/': 'Dashboard',
  '/equipment': 'Equipment Management',
  '/upload': 'Upload Screenshot',
  '/invoices': 'Invoice Management',
  '/templates': 'Invoice Templates',
  '/calendar': 'Rental Calendar',
  '/employees': 'Employees'
}

export default function Header({ onMenuClick }) {
  const location = useLocation()
  const pageName = pageNames[location.pathname] || 'Dashboard'

  return (
    <div className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="text-gray-700 lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-gray-900">{pageName}</h1>
        </div>
        
        <div className="flex flex-1 justify-end">
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Search */}
            <div className="hidden sm:flex">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="block w-full rounded-md border-0 bg-gray-100 py-1.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-primary-500 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            {/* Notifications */}
            <button
              type="button"
              className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {/* Status indicator */}
            <div className="flex items-center gap-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
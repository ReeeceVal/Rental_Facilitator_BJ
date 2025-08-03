import { Users, Plus, Search, Filter, Mail, Phone, MapPin } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Employees() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage team members and staff information
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search employees..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <select className="input">
                <option value="">All Departments</option>
                <option value="operations">Operations</option>
                <option value="technical">Technical</option>
                <option value="sales">Sales</option>
                <option value="admin">Administration</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employee grid placeholder */}
      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Employee Management</h3>
            <p className="mt-1 text-sm text-gray-500">
              Employee management functionality will be implemented here.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Features to include: staff profiles, roles, schedules, contact info, etc.
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Total Employees</h3>
            <p className="text-2xl font-bold text-primary-600 mt-2">0</p>
            <p className="text-sm text-gray-500 mt-1">Active staff</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">On Duty Today</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">0</p>
            <p className="text-sm text-gray-500 mt-1">Currently working</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Departments</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">4</p>
            <p className="text-sm text-gray-500 mt-1">Active departments</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">New This Month</h3>
            <p className="text-2xl font-bold text-purple-600 mt-2">0</p>
            <p className="text-sm text-gray-500 mt-1">Recent hires</p>
          </div>
        </div>
      </div>

      {/* Sample employee card layout (for reference) */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Layout Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sample employee card */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Sample Employee</h4>
                  <p className="text-sm text-gray-500">Job Title</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>email@example.com</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>(555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Operations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
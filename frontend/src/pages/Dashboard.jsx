import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { 
  Package, 
  FileText, 
  Upload, 
  DollarSign, 
  TrendingUp,
  Users,
  Calendar,
  Activity
} from 'lucide-react'
import { equipmentAPI, invoicesAPI, customersAPI } from '../services/api'
import { PageLoader } from '../components/shared/LoadingSpinner'
import { formatCurrency, formatDate } from '../utils/helpers'
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '../utils/constants'

function StatCard({ title, value, icon: Icon, change, href }) {
  const content = (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-primary-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className="ml-2 flex items-baseline text-sm">
                    <span className="text-green-600">+{change}</span>
                    <span className="text-gray-500 ml-1">this month</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )

  return href ? <Link to={href}>{content}</Link> : content
}

function RecentInvoices({ invoices, isLoading }) {
  if (isLoading) {
    return <div className="animate-pulse h-48 bg-gray-200 rounded-lg"></div>
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Recent Invoices</h3>
        <Link 
          to="/invoices" 
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          View all
        </Link>
      </div>
      <div className="card-body">
        {invoices?.length > 0 ? (
          <div className="space-y-3">
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      {invoice.customer_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.total_amount)}
                  </p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${INVOICE_STATUS_COLORS[invoice.status]}`}>
                    {INVOICE_STATUS_LABELS[invoice.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading a screenshot.</p>
            <div className="mt-6">
              <Link to="/upload" className="btn-primary">
                <Upload className="mr-2 h-4 w-4" />
                Upload Screenshot
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: equipmentData, isLoading: equipmentLoading } = useQuery(
    'equipment-stats',
    () => equipmentAPI.getAll(),
    { staleTime: 5 * 60 * 1000 }
  )

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery(
    'invoices-stats',
    () => invoicesAPI.getAll(),
    { staleTime: 5 * 60 * 1000 }
  )

  const { data: customersData, isLoading: customersLoading } = useQuery(
    'customers-stats',
    () => customersAPI.getAll(),
    { staleTime: 5 * 60 * 1000 }
  )

  const isLoading = equipmentLoading || invoicesLoading || customersLoading

  if (isLoading) {
    return <PageLoader />
  }

  const equipmentCount = equipmentData?.equipment?.filter(e => e.is_active)?.length || 0
  const totalInvoices = invoicesData?.pagination?.total || 0
  const totalCustomers = customersData?.pagination?.total || 0
  const totalRevenue = invoicesData?.invoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0) || 0

  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
  const thisMonthInvoices = invoicesData?.invoices?.filter(inv => 
    inv.created_at.startsWith(thisMonth)
  )?.length || 0

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Welcome to Invoice Generator
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload WhatsApp screenshots to automatically generate professional invoices
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Link to="/upload" className="btn-primary">
            <Upload className="mr-2 h-4 w-4" />
            Upload Screenshot
          </Link>
          <Link to="/equipment" className="btn-outline">
            <Package className="mr-2 h-4 w-4" />
            Manage Equipment
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Equipment"
          value={equipmentCount}
          icon={Package}
          href="/equipment"
        />
        <StatCard
          title="Total Invoices"
          value={totalInvoices}
          icon={FileText}
          change={thisMonthInvoices}
          href="/invoices"
        />
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          icon={Users}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
        />
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentInvoices 
          invoices={invoicesData?.invoices} 
          isLoading={invoicesLoading} 
        />
        
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4">
              <Link
                to="/upload"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-8 w-8 text-primary-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Upload Screenshot</p>
                  <p className="text-sm text-gray-500">Process WhatsApp conversation</p>
                </div>
              </Link>
              
              <Link
                to="/equipment"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Package className="h-8 w-8 text-primary-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Manage Equipment</p>
                  <p className="text-sm text-gray-500">Add or edit inventory items</p>
                </div>
              </Link>
              
              <Link
                to="/invoices"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-8 w-8 text-primary-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">View Invoices</p>
                  <p className="text-sm text-gray-500">Manage and download invoices</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
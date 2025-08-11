import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Download, 
  Edit, 
  Trash2, 
  Plus, 
  Eye,
  Search,
  Camera
} from 'lucide-react'
import { useInvoices, useDeleteInvoice, useGenerateInvoicePDF } from '../../hooks/useInvoices'
import { useQueryClient } from 'react-query'
import { PageLoader } from '../shared/LoadingSpinner'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { formatCurrency, formatDate, debounce } from '../../utils/helpers'
import { 
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS
} from '../../utils/constants'

export default function InvoiceList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const debouncedSearch = debounce((value) => {
    setSearchTerm(value)
    setPage(1)
  }, 300)

  const { data, isLoading, error } = useInvoices({
    search: searchTerm,
    status: statusFilter,
    page,
    limit: 10
  })

  const deleteInvoice = useDeleteInvoice()
  const generatePDF = useGenerateInvoicePDF()

  const handleSearch = (e) => {
    debouncedSearch(e.target.value)
  }

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  const handleDelete = async (invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
      await deleteInvoice.mutateAsync(invoice.id)
    }
  }

  const handleDownloadPDF = async (invoice) => {
    try {
      await generatePDF.mutateAsync(invoice.id)
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const handleTogglePaymentStatus = async (invoice) => {
    // Cycle through: unpaid -> paid -> cancelled -> unpaid
    let newStatus
    switch (invoice.status) {
      case 'unpaid':
        newStatus = 'paid'
        break
      case 'paid':
        newStatus = 'cancelled'
        break
      case 'cancelled':
        newStatus = 'unpaid'
        break
      default:
        newStatus = 'unpaid' // fallback for any unknown status
    }
    
    try {
      // Use the dedicated status update endpoint to avoid validation issues
      const response = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error(`Failed to update invoice status: ${response.statusText}`)
      }

      // Invalidate and refetch the invoices query to update the UI
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    } catch (error) {
      console.error('Error toggling payment status:', error)
      alert('Failed to update invoice status. Please try again.')
    }
  }

  if (isLoading) return <PageLoader />

  if (error) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading invoices</h3>
        <p className="mt-1 text-sm text-gray-500">Please try refreshing the page.</p>
      </div>
    )
  }

  const invoices = data?.data?.invoices || []
  const pagination = data?.data?.pagination

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            View, edit, and manage your rental invoices
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => navigate('/invoices/new', { state: { showScanner: true } })}
            className="btn-primary"
          >
            <Camera className="mr-2 h-4 w-4" />
            Scan Image
          </button>
          <Link to="/invoices/new" className="btn-outline">
            <Plus className="mr-2 h-4 w-4" />
            Manual
          </Link>
        </div>
      </div>

      {/* Filters */}
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
                  placeholder="Search invoices, customers..."
                  className="pl-10"
                  onChange={handleSearch}
                />
              </div>
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={handleStatusFilter}
                className="input"
              >
                <option value="">All Statuses</option>
                {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      {invoices.length > 0 ? (
        <>
          <div className="bg-white shadow-sm overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      {/* Left side: Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                          {/* Top line on mobile: Invoice # and Amount */}
                          <div className="w-full flex items-center justify-between">
                            <p className="text-base font-semibold text-primary-700 truncate sm:text-lg">
                              {invoice.invoice_number}
                            </p>
                            <p className="sm:hidden text-base font-semibold text-gray-900">
                              {formatCurrency(invoice.total_amount)}
                            </p>
                          </div>
                          {/* Second line on mobile: Customer & Status */}
                          <div className="mt-1 sm:mt-0 flex items-center space-x-3">
                            <p className="text-sm text-gray-600 truncate">
                              {invoice.customer_name}
                            </p>
                            <button
                              onClick={() => handleTogglePaymentStatus(invoice)}
                              className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-w-[60px] justify-center ${INVOICE_STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {INVOICE_STATUS_LABELS[invoice.status]}
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-1 flex items-center space-x-3 text-xs text-gray-500">
                          <span>{formatDate(invoice.rental_start_date)} ({invoice.rental_duration_days || 1}d)</span>
                          <span className="hidden md:inline">•</span>
                          <span className="hidden md:inline">Created {formatDate(invoice.created_at)}</span>
                        </div>
                      </div>

                      {/* Right side: Amount and Actions */}
                      <div className="mt-4 sm:mt-0 sm:ml-6 flex items-center justify-between">
                        <div className="hidden sm:block text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(invoice.total_amount)}
                          </p>
                        </div>
                        <div className="flex space-x-1 sm:ml-4">
                          <Link to={`/invoices/${invoice.id}`} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-primary-600" title="View">
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button onClick={() => handleDownloadPDF(invoice)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-green-600" title="Download" disabled={generatePDF.isLoading}>
                            <Download className="h-4 w-4" />
                          </button>
                          <Link to={`/invoices/${invoice.id}/edit`} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-blue-600" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button onClick={() => handleDelete(invoice)} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600" title="Delete" disabled={deleteInvoice.isLoading}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(page * pagination.limit, pagination.total)}
                    </span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    <Button
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="rounded-r-none"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.pages}
                      className="rounded-l-none"
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating your first invoice.'
            }
          </p>
          {!searchTerm && !statusFilter && (
            <div className="mt-6 space-x-3">
              <button
                onClick={() => navigate('/invoices/new', { state: { showScanner: true } })}
                className="btn-primary"
              >
                <Camera className="mr-2 h-4 w-4" />
                Scan Image
              </button>
              <Link to="/invoices/new" className="btn-outline">
                <Plus className="mr-2 h-4 w-4" />
                Manual
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  DollarSign,
  Users,
  Package,
  Save
} from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import LoadingSpinner, { PageLoader } from '../components/shared/LoadingSpinner'
import EmployeeAssignment from '../components/invoice/EmployeeAssignment'
import { useInvoiceById } from '../hooks/useInvoices'
import { useInvoiceAssignments } from '../hooks/useInvoiceAssignments'
import { formatCurrency, formatDate } from '../utils/helpers'

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: invoiceResponse, isLoading, error } = useInvoiceById(id)
  const invoice = invoiceResponse?.data
  
  const {
    assignments,
    commissions,
    totalCommission,
    loading: assignmentsLoading,
    assignEmployees
  } = useInvoiceAssignments(id)

  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [currentAssignments, setCurrentAssignments] = useState([])

  const handleBackToList = () => {
    navigate('/invoices')
  }

  const handleEdit = () => {
    navigate(`/invoices/${id}/edit`)
  }

  const handleSaveAssignments = async () => {
    try {
      await assignEmployees(currentAssignments)
      setShowAssignmentModal(false)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleOpenAssignments = () => {
    setCurrentAssignments(assignments)
    setShowAssignmentModal(true)
  }

  if (isLoading) return <PageLoader />

  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBackToList}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </div>
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Invoice not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The invoice you're looking for doesn't exist or could not be loaded.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBackToList}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice {invoice.invoice_number}
            </h1>
            <p className="text-sm text-gray-500">
              Status: <span className={`capitalize ${
                invoice.status === 'paid' ? 'text-green-600' :
                invoice.status === 'sent' ? 'text-blue-600' :
                invoice.status === 'cancelled' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {invoice.status}
              </span>
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleOpenAssignments}>
            <Users className="mr-2 h-4 w-4" />
            Assign Employees
          </Button>
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{invoice.customer_name}</span>
                  </div>
                  {invoice.customer_phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{invoice.customer_phone}</span>
                    </div>
                  )}
                  {invoice.customer_email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{invoice.customer_email}</span>
                    </div>
                  )}
                </div>
                <div>
                  {invoice.customer_address && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm">{invoice.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rental Details */}
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Start: {formatDate(invoice.rental_start_date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>End: {formatDate(invoice.rental_end_date)}</span>
                </div>
              </div>
              {invoice.notes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Equipment Items */}
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Equipment</h3>
              <div className="space-y-3">
                {invoice.items?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{item.equipment_name}</p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity} × {item.rental_days} days @ {formatCurrency(item.daily_rate)}/day
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.line_total)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Assignments */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Employee Assignments</h3>
                <Button size="sm" onClick={handleOpenAssignments}>
                  <Users className="h-4 w-4 mr-1" />
                  {assignments.length > 0 ? 'Edit' : 'Assign'}
                </Button>
              </div>
              
              {assignmentsLoading ? (
                <LoadingSpinner />
              ) : assignments.length > 0 ? (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-sm">{assignment.employee_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{assignment.role}</p>
                      </div>
                      {assignment.commission_percentage && (
                        <div className="text-right">
                          <p className="text-sm font-medium">{assignment.commission_percentage}%</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(assignment.commission_amount)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {totalCommission > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total Commissions</span>
                        <span>{formatCurrency(totalCommission)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No employees assigned</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Assignment Modal */}
      <Modal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        title="Assign Employees"
        size="lg"
      >
        <div className="space-y-4">
          <EmployeeAssignment
            invoiceId={id}
            assignments={currentAssignments}
            onAssignmentsChange={setCurrentAssignments}
          />
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowAssignmentModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAssignments}>
              <Save className="mr-2 h-4 w-4" />
              Save Assignments
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
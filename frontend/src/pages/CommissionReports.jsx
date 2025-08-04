import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Users, 
  Calendar, 
  Download,
  Filter,
  Search,
  CreditCard,
  CheckCircle
} from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useEmployees } from '../hooks/useEmployees'
import { formatCurrency, formatDate } from '../utils/helpers'
import { API_BASE_URL } from '../utils/constants'

export default function CommissionReports() {
  const { employees, getEmployeeCommissions } = useEmployees({ autoFetch: true })
  const [loading, setLoading] = useState(false)
  const [commissionData, setCommissionData] = useState([])
  const [unpaidCommissions, setUnpaidCommissions] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState(null)
  const [paymentBatchId, setPaymentBatchId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  const fetchCommissionReports = async () => {
    if (employees.length === 0) return

    setLoading(true)
    try {
      const reports = await Promise.all(
        employees.map(async (employee) => {
          const commissions = await getEmployeeCommissions(employee.id, {
            start_date: startDate,
            end_date: endDate
          })
          return {
            employee,
            ...commissions
          }
        })
      )
      setCommissionData(reports)
    } catch (error) {
      console.error('Error fetching commission reports:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (employees.length > 0 && startDate && endDate) {
      fetchCommissionReports()
    }
  }, [employees, startDate, endDate])

  const fetchUnpaidCommissions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/unpaid-commissions`)
      if (response.ok) {
        const data = await response.json()
        setUnpaidCommissions(data)
      }
    } catch (error) {
      console.error('Error fetching unpaid commissions:', error)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!selectedEmployeeForPayment) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/employees/${selectedEmployeeForPayment.id}/mark-paid`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_batch_id: paymentBatchId,
            notes: paymentNotes
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        alert(`Marked ${result.invoices_paid} invoices as paid for ${formatCurrency(result.total_amount)}`)
        setShowPaymentModal(false)
        setSelectedEmployeeForPayment(null)
        setPaymentBatchId('')
        setPaymentNotes('')
        fetchUnpaidCommissions() // Refresh the list
      }
    } catch (error) {
      console.error('Error marking commissions as paid:', error)
      alert('Failed to mark commissions as paid')
    }
  }

  const openPaymentModal = (employee) => {
    setSelectedEmployeeForPayment(employee)
    setPaymentBatchId(`BATCH_${new Date().getFullYear()}_${String(Date.now()).slice(-6)}`)
    setShowPaymentModal(true)
  }

  useEffect(() => {
    fetchUnpaidCommissions()
  }, [])

  const filteredData = selectedEmployee 
    ? commissionData.filter(data => data.employee.id === parseInt(selectedEmployee))
    : commissionData

  const totalCommissions = filteredData.reduce((sum, data) => sum + data.total_commission, 0)
  const totalInvoices = filteredData.reduce((sum, data) => sum + data.commissions.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commission Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track employee commissions and earnings
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="input"
              >
                <option value="">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchCommissionReports} disabled={loading}>
                <Filter className="h-4 w-4 mr-2" />
                Update Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Total Commissions</h3>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              {formatCurrency(totalCommissions)}
            </p>
            <p className="text-sm text-gray-500 mt-1">This period</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Total Invoices</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">{totalInvoices}</p>
            <p className="text-sm text-gray-500 mt-1">With commissions</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Average Commission</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {totalInvoices > 0 ? formatCurrency(totalCommissions / totalInvoices) : formatCurrency(0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Per invoice</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900">Active Employees</h3>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {filteredData.filter(data => data.total_commission > 0).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Earning commissions</p>
          </div>
        </div>
      </div>

      {/* Unpaid Commissions Section */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Unpaid Commissions</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchUnpaidCommissions}
            >
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {unpaidCommissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unpaidCommissions.map((employee) => (
                <div key={employee.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{employee.employee_name}</h4>
                      <p className="text-sm text-gray-600">{employee.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(employee.total_owed)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {employee.invoice_count} invoice{employee.invoice_count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    <p>Oldest: {formatDate(employee.oldest_invoice_date)}</p>
                    <p>Newest: {formatDate(employee.newest_invoice_date)}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => openPaymentModal(employee)}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">All commissions are up to date!</p>
            </div>
          )}
        </div>
      </div>

      {/* Commission Reports */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Employee Commission Details</h3>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-6">
              {filteredData.map((data) => (
                <div key={data.employee.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{data.employee.name}</h4>
                        <p className="text-sm text-gray-500">{data.employee.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">
                        {formatCurrency(data.total_commission)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {data.commissions.length} invoices
                      </p>
                    </div>
                  </div>

                  {data.commissions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Invoice
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Customer
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Date
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Role
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Base Amount
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              %
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Commission
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.commissions.map((commission) => (
                            <tr key={commission.id}>
                              <td className="px-3 py-2 text-sm font-medium text-primary-600">
                                {commission.invoice_number}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {commission.customer_name}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {formatDate(commission.rental_start_date)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 capitalize">
                                {commission.role}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                {formatCurrency(commission.base_amount)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 text-right">
                                {commission.commission_percentage}%
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                                {formatCurrency(commission.commission_amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No commissions in selected period</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Mark Commissions as Paid"
      >
        {selectedEmployeeForPayment && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                {selectedEmployeeForPayment.employee_name}
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Total Amount: <span className="font-semibold text-green-600">
                  {formatCurrency(selectedEmployeeForPayment.total_owed)}
                </span></p>
                <p>Invoices: {selectedEmployeeForPayment.invoice_count}</p>
                <p>Date Range: {formatDate(selectedEmployeeForPayment.oldest_invoice_date)} - {formatDate(selectedEmployeeForPayment.newest_invoice_date)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Batch ID
              </label>
              <Input
                value={paymentBatchId}
                onChange={(e) => setPaymentBatchId(e.target.value)}
                placeholder="e.g., BATCH_2025_001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Notes (Optional)
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g., Paid via bank transfer, check #1234, etc."
                className="input"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleMarkAsPaid}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
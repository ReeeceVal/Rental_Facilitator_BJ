import { useState, useEffect } from 'react'
import { 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Receipt,
  DollarSign,
  User,
  FileText
} from 'lucide-react'
import Button from './ui/Button'
import LoadingSpinner from './shared/LoadingSpinner'
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers'
import { API_BASE_URL } from '../utils/constants'

export default function PaidCommissions({ 
  startDate, 
  endDate, 
  selectedEmployee, 
  refreshTrigger 
}) {
  const [loading, setLoading] = useState(false)
  const [paidCommissions, setPaidCommissions] = useState([])
  const [expandedBatches, setExpandedBatches] = useState(new Set())

  const fetchPaidCommissions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (selectedEmployee) params.append('employee_id', selectedEmployee)

      const response = await fetch(`${API_BASE_URL}/employees/paid-commissions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPaidCommissions(data)
      }
    } catch (error) {
      console.error('Error fetching paid commissions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaidCommissions()
  }, [startDate, endDate, selectedEmployee, refreshTrigger])

  const toggleBatchExpansion = (batchKey) => {
    const newExpanded = new Set(expandedBatches)
    if (newExpanded.has(batchKey)) {
      newExpanded.delete(batchKey)
    } else {
      newExpanded.add(batchKey)
    }
    setExpandedBatches(newExpanded)
  }

  const groupCommissionsByEmployee = (commissions) => {
    return commissions.reduce((acc, commission) => {
      const employeeKey = commission.employee_id
      if (!acc[employeeKey]) {
        acc[employeeKey] = {
          employee: {
            id: commission.employee_id,
            name: commission.employee_name,
            email: commission.email
          },
          batches: []
        }
      }
      acc[employeeKey].batches.push(commission)
      return acc
    }, {})
  }

  const groupedCommissions = groupCommissionsByEmployee(paidCommissions)
  const totalPaidAmount = paidCommissions.reduce((sum, commission) => 
    sum + parseFloat(commission.total_paid || 0), 0
  )

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Paid Commissions</h3>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Paid Commissions</h3>
            <p className="text-sm text-gray-500 mt-1">
              Total: {formatCurrency(totalPaidAmount)} • {paidCommissions.length} payment{paidCommissions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchPaidCommissions}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {Object.keys(groupedCommissions).length > 0 ? (
          <div className="space-y-6">
            {Object.values(groupedCommissions).map((employeeGroup) => (
              <div key={employeeGroup.employee.id} className="border border-green-200 rounded-lg">
                {/* Employee Header */}
                <div className="bg-green-50 px-4 py-3 border-b border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{employeeGroup.employee.name}</h4>
                        <p className="text-sm text-gray-600">{employeeGroup.employee.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(
                          employeeGroup.batches.reduce((sum, batch) => 
                            sum + parseFloat(batch.total_paid || 0), 0
                          )
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {employeeGroup.batches.length} payment{employeeGroup.batches.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Batches */}
                <div className="divide-y divide-green-100">
                  {employeeGroup.batches.map((batch, batchIndex) => {
                    const batchKey = `${employeeGroup.employee.id}-${batchIndex}`
                    const isExpanded = expandedBatches.has(batchKey)
                    
                    return (
                      <div key={batchKey}>
                        {/* Batch Summary */}
                        <div className="px-4 py-3 bg-white hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Receipt className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {batch.payment_batch_id || 'Manual Payment'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Paid: {formatDateTime(batch.paid_at)}
                                </p>
                                {batch.payment_notes && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {batch.payment_notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <p className="font-bold text-green-600">
                                  {formatCurrency(batch.total_paid)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {batch.invoice_count} invoice{batch.invoice_count !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleBatchExpansion(batchKey)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Commission Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-gray-50">
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
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
                                  {batch.commission_details.map((detail) => (
                                    <tr key={detail.id}>
                                      <td className="px-3 py-2 text-sm font-medium text-green-600">
                                        {detail.invoice_number}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900">
                                        {detail.customer_name}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">
                                        {formatDate(detail.rental_start_date)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500 capitalize">
                                        {detail.role}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                        {formatCurrency(detail.base_amount)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500 text-right">
                                        {detail.commission_percentage}%
                                      </td>
                                      <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                                        {formatCurrency(detail.commission_amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No paid commissions found</p>
            <p className="text-xs text-gray-400 mt-1">
              Commissions will appear here after payment
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
import { useParams, useNavigate } from 'react-router-dom'
import { useInvoiceById } from '../hooks/useInvoices'
import { PageLoader } from '../components/shared/LoadingSpinner'
import InvoiceForm from '../components/invoice/InvoiceForm'
import Button from '../components/ui/Button'
import { ArrowLeft, FileText } from 'lucide-react'

export default function InvoiceEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: invoiceResponse, isLoading, error } = useInvoiceById(id)
  const invoice = invoiceResponse?.data

  console.log('InvoiceEdit: id=', id)
  console.log('InvoiceEdit: invoiceResponse=', invoiceResponse)
  console.log('InvoiceEdit: invoice=', invoice)
  console.log('InvoiceEdit: isLoading=', isLoading)

  const handleBackToList = () => {
    navigate('/invoices')
  }

  if (isLoading) return <PageLoader />

  if (error) {
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading invoice</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error.response?.data?.error || 'Invoice not found or could not be loaded.'}
          </p>
        </div>
      </div>
    )
  }

  if (!invoice) {
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
            The invoice you're trying to edit doesn't exist.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={handleBackToList}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Edit Invoice {invoice.invoice_number}
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Make changes to this invoice
          </p>
        </div>
      </div>

      {/* Invoice Form with edit data */}
      <InvoiceForm initialData={invoice} isEditing={true} />
    </div>
  )
}
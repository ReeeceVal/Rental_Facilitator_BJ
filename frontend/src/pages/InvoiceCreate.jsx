import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProcessingStatus from '../components/upload/ProcessingStatus'
import { PROCESSING_STATUSES } from '../utils/constants'
import InvoiceForm from '../components/invoice/InvoiceForm'
import ImageScanner from '../components/invoice/ImageScanner'
import Button from '../components/ui/Button'
import { ArrowLeft, Camera } from 'lucide-react'

export default function InvoiceCreate() {
  const location = useLocation()
  const navigate = useNavigate()
  const showScanner = location.state?.showScanner
  
  const [processingStatus, setProcessingStatus] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [isScanning, setIsScanning] = useState(false)


  const handleScannerDataExtracted = (scannedData) => {
    setExtractedData(scannedData.extractedData)
    // Navigate to form with extracted data
    navigate('/invoices/new', { 
      state: { extractedData: scannedData.extractedData }, 
      replace: true 
    })
  }

  const handleScannerStart = () => {
    setProcessingStatus(PROCESSING_STATUSES.PROCESSING)
  }

  const handleScannerComplete = (result) => {
    setProcessingStatus(PROCESSING_STATUSES.COMPLETED)
    setTimeout(() => {
      setExtractedData(result.extractedData)
      // Navigate to form with extracted data
      navigate('/invoices/new', { 
        state: { extractedData: result.extractedData }, 
        replace: true 
      })
    }, 1000)
  }

  const handleScannerError = (error) => {
    setProcessingStatus(PROCESSING_STATUSES.FAILED)
  }

  const handleBackToList = () => {
    navigate('/invoices')
  }

  // Show scanner interface if requested
  if (showScanner && !extractedData) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBackToList}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scan Invoice Image</h1>
            <p className="mt-2 text-lg text-gray-600">
              Upload an image of an invoice or rental document to extract data automatically
            </p>
          </div>
        </div>

        {/* Scanner Section */}
        {!processingStatus && (
          <div className="card">
            <div className="card-body">
              <ImageScanner 
                onDataExtracted={handleScannerDataExtracted}
                onScanStart={handleScannerStart}
                onScanComplete={handleScannerComplete}
                onScanError={handleScannerError}
                isLoading={processingStatus === PROCESSING_STATUSES.PROCESSING}
              />
            </div>
          </div>
        )}

        {/* Processing Status */}
        {processingStatus && (
          <ProcessingStatus 
            status={processingStatus}
            error={null}
          />
        )}

        {/* Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Camera className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                AI-Powered Invoice Scanner
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Our AI will extract customer information, rental dates, and equipment details from your image. 
                  Equipment names will be automatically matched to items in your database.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // Show regular invoice form
  return <InvoiceForm />
}
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { PROCESSING_STATUSES, PROCESSING_STATUS_COLORS } from '../../utils/constants'

const statusIcons = {
  [PROCESSING_STATUSES.PENDING]: Clock,
  [PROCESSING_STATUSES.PROCESSING]: Loader2,
  [PROCESSING_STATUSES.COMPLETED]: CheckCircle,
  [PROCESSING_STATUSES.FAILED]: AlertCircle,
}

const statusMessages = {
  [PROCESSING_STATUSES.PENDING]: 'Queued for processing...',
  [PROCESSING_STATUSES.PROCESSING]: 'AI Processing Image...',
  [PROCESSING_STATUSES.COMPLETED]: 'Processing completed successfully!',
  [PROCESSING_STATUSES.FAILED]: 'Processing failed. Please try again.',
}

export default function ProcessingStatus({ status, error }) {
  const Icon = statusIcons[status] || Clock
  const message = statusMessages[status] || 'Unknown status'
  const colorClass = PROCESSING_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-4">
        <div className={`flex-shrink-0 p-2 rounded-full ${colorClass}`}>
          <Icon 
            className={`h-6 w-6 ${status === PROCESSING_STATUSES.PROCESSING ? 'animate-spin' : ''}`} 
          />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">
            Processing Status
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {message}
          </p>
          
          {error && (
            <p className="text-sm text-red-600 mt-2">
              Error: {error}
            </p>
          )}
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>

      {/* Processing spinner */}
      {status === PROCESSING_STATUSES.PROCESSING && (
        <div className="mt-4">
          <div className="flex items-center justify-center space-x-3 py-4">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-600">AI is analyzing your image...</span>
          </div>
        </div>
      )}

      {/* Processing info */}
      {status === PROCESSING_STATUSES.PROCESSING && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-700">
            Our AI is analyzing your image to extract customer information, rental dates, and equipment details. 
            This usually takes 3-8 seconds depending on image complexity.
          </p>
        </div>
      )}
    </div>
  )
}
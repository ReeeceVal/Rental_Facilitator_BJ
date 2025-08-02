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
  [PROCESSING_STATUSES.PROCESSING]: 'Analyzing screenshot with AI...',
  [PROCESSING_STATUSES.COMPLETED]: 'Processing completed successfully!',
  [PROCESSING_STATUSES.FAILED]: 'Processing failed. Please try again.',
}

export default function ProcessingStatus({ status, error, progress = null }) {
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

      {/* Progress bar for processing */}
      {status === PROCESSING_STATUSES.PROCESSING && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Analyzing image...</span>
            <span>{progress || ''}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress || 30}%` }}
            />
          </div>
        </div>
      )}

      {/* Processing steps */}
      {status === PROCESSING_STATUSES.PROCESSING && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-gray-600">Image uploaded successfully</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-gray-600">Extracting text from image</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400">Matching equipment to inventory</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400">Generating invoice data</span>
          </div>
        </div>
      )}
    </div>
  )
}
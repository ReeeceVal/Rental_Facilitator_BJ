import { useState, useRef } from 'react'
import { Upload, Camera, FileText, Loader2, X, CheckCircle } from 'lucide-react'
import Button from '../ui/Button'

export default function ImageScanner({ 
  onDataExtracted, 
  onScanStart,
  onScanComplete,
  onScanError,
  isLoading = false 
}) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, etc.)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleFileInput = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const processImage = async () => {
    if (!selectedFile) return

    try {
      setError(null)
      
      // Trigger processing animation start
      if (onScanStart) {
        onScanStart()
      }
      
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await fetch('/api/invoice/scan', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to process image')
      }

      const result = await response.json()
      setExtractedData(result.extractedData)
      
      // Trigger processing complete animation
      if (onScanComplete) {
        onScanComplete({ extractedData: result.extractedData })
      } else if (onDataExtracted) {
        onDataExtracted(result)
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to process image'
      setError(errorMessage)
      
      // Trigger error state
      if (onScanError) {
        onScanError(errorMessage)
      }
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setExtractedData(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
          ${selectedFile ? 'border-green-500 bg-green-50' : ''}
          ${error ? 'border-red-500 bg-red-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <div className="space-y-3">
          {selectedFile ? (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-xs text-green-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Upload an invoice image
                </p>
                <p className="text-xs text-gray-500">
                  Drag and drop or click to select (PNG, JPG, max 10MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      {selectedFile && !extractedData && (
        <div className="flex space-x-3">
          <Button
            onClick={processImage}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Extract Data
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={reset}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      )}

      {/* Extracted Data Preview */}
      {extractedData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-green-800">Data Extracted Successfully</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2 text-sm">
            {extractedData.customer_name && (
              <div>
                <span className="font-medium text-green-700">Customer:</span>
                <span className="ml-2 text-green-600">{extractedData.customer_name}</span>
              </div>
            )}
            {extractedData.phone_number && (
              <div>
                <span className="font-medium text-green-700">Phone:</span>
                <span className="ml-2 text-green-600">{extractedData.phone_number}</span>
              </div>
            )}
            {extractedData.rental_start_date && (
              <div>
                <span className="font-medium text-green-700">Start Date:</span>
                <span className="ml-2 text-green-600">{extractedData.rental_start_date}</span>
              </div>
            )}
            {extractedData.equipment && extractedData.equipment.length > 0 && (
              <div>
                <span className="font-medium text-green-700">Equipment:</span>
                <span className="ml-2 text-green-600">
                  {extractedData.equipment.length} item(s) found
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
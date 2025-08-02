import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileImage, AlertCircle } from 'lucide-react'
import { formatFileSize, isValidImageType } from '../../utils/helpers'
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '../../utils/constants'
import Button from '../ui/Button'

export default function ImageUpload({ onFileSelect, isProcessing = false }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState(null)

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors.some(e => e.code === 'file-too-large')) {
        setError(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`)
      } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
        setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
      } else {
        setError('Invalid file. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // Additional validation
      if (!isValidImageType(file)) {
        setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
        return
      }

      setSelectedFile(file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ALLOWED_IMAGE_TYPES.map(type => type.replace('image/', '.'))
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false
  })

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setError(null)
  }

  const handleProcess = () => {
    if (selectedFile) {
      const formData = new FormData()
      formData.append('screenshot', selectedFile)
      onFileSelect(formData)
    }
  }

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="flex justify-center">
              {error ? (
                <AlertCircle className="h-12 w-12 text-red-400" />
              ) : (
                <Upload className={`h-12 w-12 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} />
              )}
            </div>
            
            <div>
              <h3 className={`text-lg font-medium ${error ? 'text-red-900' : 'text-gray-900'}`}>
                {isDragActive 
                  ? 'Drop the screenshot here'
                  : error
                  ? 'Upload failed'
                  : 'Upload WhatsApp Screenshot'
                }
              </h3>
              
              {error ? (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              ) : (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-500">
                    Drag and drop your WhatsApp conversation screenshot, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports JPEG, PNG, WebP (max {formatFileSize(MAX_FILE_SIZE)})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File Preview */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {previewUrl ? (
                <div className="flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0">
                  <FileImage className="h-24 w-24 text-gray-400" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleRemoveFile}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    disabled={isProcessing}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="mt-2">
                  <div className="text-xs text-gray-500">
                    File ready for processing
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Process Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleProcess}
              loading={isProcessing}
              size="lg"
              className="px-8"
            >
              {isProcessing ? 'Processing Screenshot...' : 'Process Screenshot'}
            </Button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Tips for best results:
            </h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Ensure the screenshot shows the entire conversation</li>
              <li>• Make sure text is clear and readable</li>
              <li>• Include customer name, dates, and equipment requests</li>
              <li>• Crop out unnecessary parts of the screen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
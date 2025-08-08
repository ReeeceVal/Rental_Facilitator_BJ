import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image, AlertCircle } from 'lucide-react'
import { formatFileSize, isValidImageType } from '../../utils/helpers'
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '../../utils/constants'
import Button from '../ui/Button'

export default function LogoUpload({ onLogoChange, currentLogo = null, isUploading = false }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(currentLogo)
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
    if (previewUrl && previewUrl !== currentLogo) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(currentLogo)
    setError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('logo', selectedFile)

    try {
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      // Call the parent component with the base64 logo data
      onLogoChange(result.data.logoData)
      
      // Update preview to use the processed logo
      setPreviewUrl(result.data.logoData)
      setSelectedFile(null)
    } catch (error) {
      console.error('Logo upload error:', error)
      setError('Failed to upload logo. Please try again.')
    }
  }

  const handleRemoveLogo = () => {
    onLogoChange(null)
    setPreviewUrl(null)
    setSelectedFile(null)
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Company Logo
      </label>

      {!selectedFile && !previewUrl ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-3">
            <div className="flex justify-center">
              {error ? (
                <AlertCircle className="h-8 w-8 text-red-400" />
              ) : (
                <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} />
              )}
            </div>
            
            <div>
              <h4 className={`text-sm font-medium ${error ? 'text-red-900' : 'text-gray-900'}`}>
                {isDragActive 
                  ? 'Drop your logo here'
                  : error
                  ? 'Upload failed'
                  : 'Upload Company Logo'
                }
              </h4>
              
              {error ? (
                <p className="mt-1 text-xs text-red-600">{error}</p>
              ) : (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-gray-500">
                    Drag and drop your logo, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports JPEG, PNG, WebP (max {formatFileSize(MAX_FILE_SIZE)})
                  </p>
                  <p className="text-xs text-gray-400">
                    Logo will be resized to max 300x150px
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Logo Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Logo preview"
                  className="h-16 w-auto max-w-32 object-contain border rounded"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile ? 'New logo selected' : 'Current logo'}
                    </p>
                    {selectedFile && (
                      <p className="text-xs text-gray-500">
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={selectedFile ? handleRemoveFile : handleRemoveLogo}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    disabled={isUploading}
                    title={selectedFile ? 'Cancel upload' : 'Remove logo'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <div className="flex justify-center">
              <Button
                onClick={handleUpload}
                loading={isUploading}
                size="sm"
              >
                {isUploading ? 'Uploading Logo...' : 'Upload Logo'}
              </Button>
            </div>
          )}

          {/* Add New Logo Button */}
          {!selectedFile && previewUrl && (
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setPreviewUrl(null)
                  setSelectedFile(null)
                }}
                variant="outline"
                size="sm"
              >
                Change Logo
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex">
          <div className="flex-shrink-0">
            <Image className="h-4 w-4 text-blue-400" />
          </div>
          <div className="ml-2">
            <h4 className="text-xs font-medium text-blue-800">
              Logo Guidelines:
            </h4>
            <ul className="mt-1 text-xs text-blue-700 space-y-1">
              <li>• Use a high-quality image with transparent background</li>
              <li>• Horizontal logos work best (wide format)</li>
              <li>• Will be resized to fit 300x150px maximum</li>
              <li>• Appears in the top-right of your invoices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
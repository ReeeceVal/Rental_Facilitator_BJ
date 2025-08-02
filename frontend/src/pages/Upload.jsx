import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMockUploadScreenshot } from '../hooks/useUpload'
import ImageUpload from '../components/upload/ImageUpload'
import ProcessingStatus from '../components/upload/ProcessingStatus'
import { PROCESSING_STATUSES } from '../utils/constants'
import Button from '../components/ui/Button'
import Input, { Textarea } from '../components/ui/Input'
import { ArrowRight, RotateCcw, Edit, User, Calendar, Package, Plus, Trash2 } from 'lucide-react'

export default function Upload() {
  const [processingStatus, setProcessingStatus] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [progress, setProgress] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editableData, setEditableData] = useState(null)
  const navigate = useNavigate()
  
  // Using mock upload for demonstration - replace with real upload when AI is integrated
  const uploadScreenshot = useMockUploadScreenshot()

  const handleFileSelect = async (formData) => {
    try {
      setProcessingStatus(PROCESSING_STATUSES.PROCESSING)
      setProgress(0)
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 300)

      const result = await uploadScreenshot.mutateAsync(formData)
      
      clearInterval(progressInterval)
      setProgress(100)
      setProcessingStatus(PROCESSING_STATUSES.COMPLETED)
      setExtractedData(result.extracted_data)
      setEditableData(result.extracted_data)
      
    } catch (error) {
      setProcessingStatus(PROCESSING_STATUSES.FAILED)
      setProgress(0)
    }
  }

  const handleStartOver = () => {
    setProcessingStatus(null)
    setExtractedData(null)
    setEditableData(null)
    setProgress(0)
    setIsEditing(false)
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing)
  }

  const handleEquipmentChange = (index, field, value) => {
    setEditableData(prev => ({
      ...prev,
      equipment: prev.equipment.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addEquipmentItem = () => {
    setEditableData(prev => ({
      ...prev,
      equipment: [...prev.equipment, {
        equipment_name: '',
        quantity: 1,
        confidence: 'low'
      }]
    }))
  }

  const removeEquipmentItem = (index) => {
    if (editableData.equipment.length > 1) {
      setEditableData(prev => ({
        ...prev,
        equipment: prev.equipment.filter((_, i) => i !== index)
      }))
    }
  }

  const handleCreateInvoice = () => {
    // Navigate to invoice creation with edited data
    navigate('/invoices/new', { 
      state: { extractedData: editableData || extractedData } 
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Upload WhatsApp Screenshot</h1>
        <p className="mt-2 text-lg text-gray-600">
          Let AI analyze your conversation and automatically extract rental information
        </p>
      </div>

      {/* Upload Section */}
      {!processingStatus && (
        <div className="card">
          <div className="card-body">
            <ImageUpload 
              onFileSelect={handleFileSelect}
              isProcessing={uploadScreenshot.isLoading}
            />
          </div>
        </div>
      )}

      {/* Processing Status */}
      {processingStatus && (
        <ProcessingStatus 
          status={processingStatus}
          progress={progress}
          error={uploadScreenshot.error?.message}
        />
      )}

      {/* Extracted Data Review */}
      {extractedData && processingStatus === PROCESSING_STATUSES.COMPLETED && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Extracted Information</h3>
                <p className="text-sm text-gray-500">
                  {isEditing ? 'Edit the extracted data to correct any errors' : 'Review and verify the extracted data before creating an invoice'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
              >
                <Edit className="mr-2 h-4 w-4" />
                {isEditing ? 'Save Changes' : 'Edit Data'}
              </Button>
            </div>
          </div>
          <div className="card-body space-y-6">
            {/* Customer Information */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <User className="h-5 w-5 text-primary-600" />
                <h4 className="text-md font-medium text-gray-900">Customer Information</h4>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  {isEditing ? (
                    <Input
                      value={editableData?.customer_name || ''}
                      onChange={(e) => setEditableData(prev => ({...prev, customer_name: e.target.value}))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{editableData?.customer_name || extractedData.customer_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  {isEditing ? (
                    <Input
                      value={editableData?.phone_number || ''}
                      onChange={(e) => setEditableData(prev => ({...prev, phone_number: e.target.value}))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{editableData?.phone_number || extractedData.phone_number}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Rental Dates */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="h-5 w-5 text-primary-600" />
                <h4 className="text-md font-medium text-gray-900">Rental Period</h4>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editableData?.rental_start_date || ''}
                      onChange={(e) => setEditableData(prev => ({...prev, rental_start_date: e.target.value}))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{editableData?.rental_start_date || extractedData.rental_start_date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editableData?.rental_end_date || ''}
                      onChange={(e) => setEditableData(prev => ({...prev, rental_end_date: e.target.value}))}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{editableData?.rental_end_date || extractedData.rental_end_date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Equipment */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-primary-600" />
                  <h4 className="text-md font-medium text-gray-900">Requested Equipment</h4>
                </div>
                {isEditing && (
                  <Button size="sm" onClick={addEquipmentItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {(editableData?.equipment || extractedData.equipment).map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">Item {index + 1}</h5>
                          {editableData.equipment.length > 1 && (
                            <button
                              onClick={() => removeEquipmentItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
                            <Input
                              value={item.equipment_name || ''}
                              onChange={(e) => handleEquipmentChange(index, 'equipment_name', e.target.value)}
                              placeholder="Enter equipment name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity || 1}
                              onChange={(e) => handleEquipmentChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.equipment_name}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item.confidence === 'high' ? 'bg-green-100 text-green-800' :
                            item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.confidence} confidence
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {(extractedData.notes || isEditing) && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Additional Notes</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {isEditing ? (
                    <Textarea
                      value={editableData?.notes || ''}
                      onChange={(e) => setEditableData(prev => ({...prev, notes: e.target.value}))}
                      placeholder="Add any additional notes..."
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{editableData?.notes || extractedData.notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Conversation Summary */}
            {extractedData.conversation_summary && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Conversation Summary</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{extractedData.conversation_summary}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleStartOver}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Upload Different Screenshot
              </Button>
              
              <Button
                onClick={handleCreateInvoice}
              >
                Create PDF
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <div className="h-5 w-5 text-yellow-400">ℹ️</div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Demo Mode
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                This is currently running in demo mode with mock data. The AI integration will be added later to:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Analyze uploaded WhatsApp screenshots using GPT-4o Vision</li>
                <li>Extract customer information, dates, and equipment requests</li>
                <li>Match requested equipment to your inventory database</li>
                <li>Generate structured data for automatic invoice creation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
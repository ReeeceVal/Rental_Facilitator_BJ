import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Trash2, Eye, Calendar, User, Package, Search } from 'lucide-react'
import Button from '../ui/Button'
import Input, { Textarea } from '../ui/Input'
import Modal from '../ui/Modal'
import InvoicePreview from './InvoicePreview'
import { useCreateInvoiceAndGeneratePDF, useUpdateInvoice } from '../../hooks/useInvoices'
import { useEquipment } from '../../hooks/useEquipment'
import { useTemplates } from '../../hooks/useTemplates'
import { formatCurrency, formatDate } from '../../utils/helpers'

export default function InvoiceForm({ initialData = null, isEditing = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const extractedData = location.state?.extractedData
  const createInvoiceAndGeneratePDF = useCreateInvoiceAndGeneratePDF()
  const updateInvoice = useUpdateInvoice()

  // Fetch equipment data for dropdown
  const { data: equipmentData } = useEquipment({ active: 'true', limit: 1000 })
  const equipment = equipmentData?.data?.equipment || []

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useTemplates()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [equipmentSearchTerms, setEquipmentSearchTerms] = useState({})
  
  // Function to get initial form data
  const getInitialFormData = useCallback(() => {
    // If editing an existing invoice
    if (isEditing && initialData) {
      return {
        customer_name: initialData.customer_name || '',
        customer_address: initialData.customer_address || '',
        customer_phone: initialData.customer_phone || '',
        customer_email: initialData.customer_email || '',
        rental_start_date: initialData.rental_start_date ? initialData.rental_start_date.split('T')[0] : '',
        rental_duration_days: initialData.rental_duration_days || 1,
        notes: initialData.notes || '',
        items: initialData.items?.map(item => ({
          equipment_id: item.equipment_id,
          equipment_name: item.equipment_name,
          description: item.equipment_description || '',
          quantity: item.quantity || 1,
          daily_rate: parseFloat(item.daily_rate) || 0,
          days: item.rental_days || 1,
          total: parseFloat(item.line_total) || 0
        })) || []
      }
    }
    
    // If creating from extracted data
    if (extractedData) {
      return {
        customer_name: extractedData.customer_name || '',
        customer_address: '',
        customer_phone: extractedData.phone_number || '',
        customer_email: '',
        rental_start_date: extractedData.rental_start_date || '',
        rental_duration_days: extractedData.rental_duration_days || 1,
        notes: extractedData.notes || '',
        items: extractedData.equipment?.map(item => ({
          equipment_id: null,
          equipment_name: item.equipment_name,
          description: '',
          quantity: item.quantity || 1,
          daily_rate: 0,
          days: 1,
          total: 0
        })) || [
          {
            equipment_id: null,
            equipment_name: '',
            description: '',
            quantity: 1,
            daily_rate: 0,
            days: 1,
            total: 0
          }
        ]
      }
    }
    
    // Default empty form
    return {
      customer_name: '',
      customer_address: '',
      customer_phone: '',
      customer_email: '',
      rental_start_date: '',
      rental_duration_days: 1,
      notes: '',
      items: [
        {
          equipment_id: null,
          equipment_name: '',
          description: '',
          quantity: 1,
          daily_rate: 0,
          days: 1,
          total: 0
        }
      ]
    }
  }, [isEditing, initialData, extractedData])

  // Invoice form data
  const [formData, setFormData] = useState(getInitialFormData)

  // Duration options
  const durationOptions = [
    { value: 1, label: '1 Day' },
    { value: 2, label: '2 Days' },
    { value: 3, label: '3 Days' },
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' }
  ]

  // Calculate end date from start date and duration
  const calculateEndDate = (startDate, durationDays) => {
    if (!startDate || !durationDays) return ''
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + durationDays - 1) // -1 because rental includes start day
    return end.toISOString().split('T')[0]
  }

  // Set default template when templates are loaded
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0]
      setSelectedTemplate(defaultTemplate)
    }
  }, [templates, selectedTemplate])

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (isEditing && initialData) {
      console.log('InvoiceForm: Setting form data for editing:')
      console.log('InvoiceForm: initialData=', initialData)
      const newFormData = getInitialFormData()
      console.log('InvoiceForm: Transformed form data:')
      console.log('InvoiceForm: newFormData=', newFormData)
      setFormData(newFormData)
    }
  }, [isEditing, initialData, getInitialFormData])

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0)
  const taxAmount = subtotal * (selectedTemplate?.template_data?.taxRate || 0.08)
  const total = subtotal + taxAmount

  // Update item total when quantity, rate, or days change
  const updateItemTotal = (index) => {
    const item = formData.items[index]
    const newTotal = (item.quantity || 0) * (item.daily_rate || 0) * (item.days || 1)
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, total: newTotal } : item
      )
    }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleEquipmentSelect = (index, selectedEquipment) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { 
          ...item, 
          equipment_id: selectedEquipment.id,
          equipment_name: selectedEquipment.name,
          daily_rate: parseFloat(selectedEquipment.daily_rate) || 0,
          description: selectedEquipment.description || ''
        } : item
      )
    }))
    // Remove search term after selection to show selected equipment name
    setEquipmentSearchTerms(prev => {
      const newTerms = { ...prev }
      delete newTerms[index]
      return newTerms
    })
    // Update total
    setTimeout(() => updateItemTotal(index), 0)
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        equipment_id: null,
        equipment_name: '',
        description: '',
        quantity: 1,
        daily_rate: 0,
        days: 1,
        total: 0
      }]
    }))
  }

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedTemplate) {
      alert('Please select a template before submitting')
      return
    }
    
    try {
      if (isEditing && initialData) {
        // Update existing invoice
        const updateData = {
          customer_id: initialData.customer_id,
          rental_start_date: formData.rental_start_date,
          rental_end_date: calculateEndDate(formData.rental_start_date, formData.rental_duration_days),
          rental_duration_days: formData.rental_duration_days,
          notes: formData.notes,
          tax_amount: taxAmount,
          status: initialData.status || 'draft',
          items: formData.items.filter(item => item.equipment_name).map((item) => ({
            equipment_id: item.equipment_id,
            equipment_name: item.equipment_name,
            quantity: item.quantity,
            daily_rate: item.daily_rate,
            rental_days: item.days
          }))
        }

        await updateInvoice.mutateAsync({ id: initialData.id, data: updateData })
        navigate('/invoices')
      } else {
        // Create new invoice and generate PDF
        const invoiceData = {
          customer_data: {
            name: formData.customer_name,
            phone: formData.customer_phone,
            email: formData.customer_email,
            address: formData.customer_address
          },
          rental_start_date: formData.rental_start_date,
          rental_end_date: calculateEndDate(formData.rental_start_date, formData.rental_duration_days),
          rental_duration_days: formData.rental_duration_days,
          notes: formData.notes,
          tax_amount: taxAmount,
          template_config: selectedTemplate.template_data,
          items: formData.items.filter(item => item.equipment_name).map((item) => ({
            equipment_name: item.equipment_name,
            description: item.description,
            quantity: item.quantity,
            daily_rate: item.daily_rate,
            rental_days: item.days
          }))
        }

        await createInvoiceAndGeneratePDF.mutateAsync(invoiceData)
        navigate('/invoices')
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} invoice:`, error)
      // Error handling is done in the hook
    }
  }

  // Generate preview data for InvoicePreview component
  const previewData = selectedTemplate ? {
    ...selectedTemplate.template_data,
    invoice_number: `${selectedTemplate.template_data.invoiceNumberPrefix || 'INV-'}001`,
    date: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    customer: {
      name: formData.customer_name || 'Customer Name',
      address: formData.customer_address || 'Customer Address',
      phone: formData.customer_phone || 'Customer Phone',
      email: formData.customer_email || 'customer@email.com'
    },
    items: formData.items.filter(item => item.equipment_name).map((item, index) => ({
      id: index + 1,
      name: item.equipment_name,
      description: item.description,
      quantity: item.quantity,
      days: item.days,
      daily_rate: item.daily_rate,
      total: item.total
    })),
    subtotal,
    discount: 0,
    total
  } : null

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
          <p className="mt-1 text-sm text-gray-500">
            {extractedData ? 'Review and edit the extracted data, then create your invoice' : 'Create a new rental invoice'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      <div className="flex space-x-6">
        {/* Form Section */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Selection */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Template Selection</h3>
                {templatesLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading templates...</div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No templates available</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: template.template_data.headerColor }}
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            <p className="text-sm text-gray-500">{template.template_data.companyName}</p>
                            {template.is_default && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 mt-1">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name *
                    </label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <Textarea
                      value={formData.customer_address}
                      onChange={(e) => setFormData({...formData, customer_address: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rental Information */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-medium text-gray-900">Rental Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.rental_start_date}
                      onChange={(e) => setFormData({...formData, rental_start_date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rental Duration *
                    </label>
                    <select
                      value={formData.rental_duration_days}
                      onChange={(e) => setFormData({...formData, rental_duration_days: parseInt(e.target.value)})}
                      className="input"
                      required
                    >
                      {durationOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Show calculated end date */}
                {formData.rental_start_date && formData.rental_duration_days && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <strong>Calculated End Date:</strong> {formatDate(calculateEndDate(formData.rental_start_date, formData.rental_duration_days))}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Equipment Items */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-primary-600" />
                    <h3 className="text-lg font-medium text-gray-900">Equipment Items</h3>
                  </div>
                  <Button type="button" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Equipment Name *
                          </label>
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-4 w-4 text-gray-400" style={{top: '50%', transform: 'translateY(-50%)', left: '12px'}} />
                              <Input
                                value={equipmentSearchTerms[index] !== undefined ? equipmentSearchTerms[index] : item.equipment_name}
                                onChange={(e) => setEquipmentSearchTerms(prev => ({ ...prev, [index]: e.target.value }))}
                                onFocus={() => {
                                  if (equipmentSearchTerms[index] === undefined && item.equipment_name) {
                                    setEquipmentSearchTerms(prev => ({ ...prev, [index]: '' }))
                                  }
                                }}
                                placeholder="Search for equipment..."
                                className="pl-10"
                                required={!item.equipment_id}
                              />
                            </div>
                            {equipmentSearchTerms[index] && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                {equipment
                                  .filter(eq => 
                                    eq.name.toLowerCase().includes(equipmentSearchTerms[index].toLowerCase()) ||
                                    eq.description?.toLowerCase().includes(equipmentSearchTerms[index].toLowerCase())
                                  )
                                  .slice(0, 10)
                                  .map(eq => (
                                    <div
                                      key={eq.id}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      onClick={() => handleEquipmentSelect(index, eq)}
                                    >
                                      <div className="font-medium text-gray-900">{eq.name}</div>
                                      <div className="text-sm text-gray-500">
                                        {formatCurrency(eq.daily_rate)}/day
                                        {eq.description && ` • ${eq.description}`}
                                      </div>
                                    </div>
                                  ))}
                                {equipment.filter(eq => 
                                  eq.name.toLowerCase().includes(equipmentSearchTerms[index].toLowerCase()) ||
                                  eq.description?.toLowerCase().includes(equipmentSearchTerms[index].toLowerCase())
                                ).length === 0 && (
                                  <div className="px-4 py-2 text-gray-500 text-sm">
                                    No equipment found matching "{equipmentSearchTerms[index]}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const inputValue = e.target.value
                              const newQuantity = inputValue === '' ? '' : (parseInt(inputValue) || 1)
                              const item = formData.items[index]
                              const numericQuantity = typeof newQuantity === 'string' ? 1 : newQuantity
                              const newTotal = numericQuantity * (item.daily_rate || 0) * (item.days || 1)
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((item, i) => 
                                  i === index ? { ...item, quantity: newQuantity, total: newTotal } : item
                                )
                              }))
                            }}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Days
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={item.days}
                            onChange={(e) => {
                              const inputValue = e.target.value
                              const newDays = inputValue === '' ? '' : (parseInt(inputValue) || 1)
                              const item = formData.items[index]
                              const numericDays = typeof newDays === 'string' ? 1 : newDays
                              const newTotal = (item.quantity || 1) * (item.daily_rate || 0) * numericDays
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((item, i) => 
                                  i === index ? { ...item, days: newDays, total: newTotal } : item
                                )
                              }))
                            }}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Daily Rate
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.daily_rate}
                            onChange={(e) => {
                              const inputValue = e.target.value
                              const newRate = inputValue === '' ? '' : (parseFloat(inputValue) || 0)
                              const item = formData.items[index]
                              const numericRate = typeof newRate === 'string' ? 0 : newRate
                              const newTotal = (item.quantity || 1) * numericRate * (item.days || 1)
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((item, i) => 
                                  i === index ? { ...item, daily_rate: newRate, total: newTotal } : item
                                )
                              }))
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Optional description"
                        />
                      </div>
                      
                      <div className="mt-3 text-right">
                        <span className="text-sm text-gray-500">Total: </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h3>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={4}
                  placeholder="Any additional notes or special instructions..."
                />
              </div>
            </div>

            {/* Summary */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({((selectedTemplate?.template_data?.taxRate || 0.08) * 100).toFixed(1)}%):</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/invoices')}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={isEditing ? updateInvoice.isLoading : createInvoiceAndGeneratePDF.isLoading}
              >
                {isEditing 
                  ? (updateInvoice.isLoading ? 'Updating...' : 'Update Invoice')
                  : (createInvoiceAndGeneratePDF.isLoading ? 'Creating PDF...' : 'Create PDF')
                }
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="w-1/2">
            <div className="sticky top-0">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
              <div className="max-h-[80vh] overflow-y-auto">
                {previewData ? (
                  <InvoicePreview templateData={previewData} className="scale-75 origin-top" />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Select a template to see preview
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
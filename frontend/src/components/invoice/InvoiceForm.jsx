import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Trash2, Eye, Calendar, User, Package } from 'lucide-react'
import Button from '../ui/Button'
import Input, { Textarea } from '../ui/Input'
import Modal from '../ui/Modal'
import InvoicePreview from './InvoicePreview'
import { useCreateInvoiceAndGeneratePDF } from '../../hooks/useInvoices'
import { formatCurrency, formatDate } from '../../utils/helpers'

const mockTemplates = [
  {
    id: 1,
    name: 'Standard Sound Rental Invoice',
    template_data: {
      companyName: 'Sound Rental Pro',
      companyAddress: '123 Music Street\nAudio City, AC 12345',
      companyPhone: '(555) 123-4567',
      companyEmail: 'info@soundrentalpro.com',
      headerColor: '#2563eb',
      accentColor: '#1d4ed8',
      footerText: 'Thank you for your business!',
      termsAndConditions: 'Equipment must be returned in the same condition as rented.',
      taxRate: 0.08,
      currency: 'USD',
      invoiceNumberPrefix: 'SR-'
    },
    is_default: true
  },
  {
    id: 2,
    name: 'Simple Template',
    template_data: {
      companyName: 'Audio Rentals LLC',
      companyAddress: '456 Sound Ave\nMusic City, MC 67890',
      companyPhone: '(555) 987-6543',
      companyEmail: 'rentals@audiorentals.com',
      headerColor: '#059669',
      accentColor: '#047857',
      footerText: 'Professional audio equipment rentals',
      termsAndConditions: 'Payment due within 15 days.',
      taxRate: 0.075,
      currency: 'USD',
      invoiceNumberPrefix: 'AR-'
    },
    is_default: false
  }
]

export default function InvoiceForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const extractedData = location.state?.extractedData
  const createInvoiceAndGeneratePDF = useCreateInvoiceAndGeneratePDF()

  const [selectedTemplate, setSelectedTemplate] = useState(mockTemplates.find(t => t.is_default) || mockTemplates[0])
  const [showPreview, setShowPreview] = useState(false)
  
  // Invoice form data
  const [formData, setFormData] = useState({
    customer_name: extractedData?.customer_name || '',
    customer_address: '',
    customer_phone: extractedData?.phone_number || '',
    customer_email: '',
    rental_start_date: extractedData?.rental_start_date || '',
    rental_end_date: extractedData?.rental_end_date || '',
    notes: extractedData?.notes || '',
    items: extractedData?.equipment?.map(item => ({
      equipment_name: item.equipment_name,
      description: '',
      quantity: item.quantity || 1,
      daily_rate: 0,
      days: 1,
      total: 0
    })) || [
      {
        equipment_name: '',
        description: '',
        quantity: 1,
        daily_rate: 0,
        days: 1,
        total: 0
      }
    ]
  })

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

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
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
    
    try {
      // Transform form data to match backend expectations
      // Note: In a real implementation, you'd need to:
      // 1. Create or find customer by name/phone
      // 2. Create or find equipment items by name
      // 3. Use actual IDs instead of mock data
      
      const invoiceData = {
        customer_data: {
          name: formData.customer_name,
          phone: formData.customer_phone,
          email: formData.customer_email,
          address: formData.customer_address
        },
        rental_start_date: formData.rental_start_date,
        rental_end_date: formData.rental_end_date,
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

      // Create invoice and generate PDF
      await createInvoiceAndGeneratePDF.mutateAsync(invoiceData)
      
      // Navigate back to invoices list
      navigate('/invoices')
    } catch (error) {
      console.error('Error creating invoice:', error)
      // Error handling is done in the hook
    }
  }

  // Generate preview data for InvoicePreview component
  const previewData = {
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
  }

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedTemplate.id === template.id
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                      End Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.rental_end_date}
                      onChange={(e) => setFormData({...formData, rental_end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>
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
                          <Input
                            value={item.equipment_name}
                            onChange={(e) => handleItemChange(index, 'equipment_name', e.target.value)}
                            required
                          />
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
                              handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)
                              setTimeout(() => updateItemTotal(index), 0)
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
                              handleItemChange(index, 'days', parseInt(e.target.value) || 1)
                              setTimeout(() => updateItemTotal(index), 0)
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
                              handleItemChange(index, 'daily_rate', parseFloat(e.target.value) || 0)
                              setTimeout(() => updateItemTotal(index), 0)
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
                disabled={createInvoiceAndGeneratePDF.isLoading}
              >
                {createInvoiceAndGeneratePDF.isLoading ? 'Creating PDF...' : 'Create PDF'}
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
                <InvoicePreview templateData={previewData} className="scale-75 origin-top" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
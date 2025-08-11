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
        transport_amount: parseFloat(initialData.transport_amount) || 0,
        transport_discount: parseFloat(initialData.transport_discount) || 0,
        services: [{
          name: 'Service Fee',
          amount: parseFloat(initialData.service_fee) || 0,
          discount: parseFloat(initialData.service_discount) || 0,
          total: (parseFloat(initialData.service_fee) || 0) - (parseFloat(initialData.service_discount) || 0)
        }].filter(service => service.amount > 0 || service.discount > 0),
        notes: initialData.notes || '',
        items: initialData.items?.map(item => ({
          equipment_id: item.equipment_id,
          equipment_name: item.equipment_name,
          description: item.equipment_description || '',
          quantity: item.quantity || 1,
          rate: parseFloat(item.equipment_rate || item.rate) || 0,
          days: item.rental_days || 1,
          item_discount_amount: parseFloat(item.item_discount_amount) || 0,
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
        transport_amount: 0,
        transport_discount: 0,
        services: [],
        notes: extractedData.notes || '',
        items: extractedData.equipment?.map(item => {
          const quantity = item.quantity || 1
          const rate = item.rate || 0
          const days = 1
          const total = quantity * rate * days
          
          return {
            equipment_id: item.equipment_id || null,
            equipment_name: item.equipment_name,
            description: item.description || '',
            quantity: quantity,
            rate: rate,
            days: days,
            item_discount_amount: 0,
            total: total
          }
        }) || [
          {
            equipment_id: null,
            equipment_name: '',
            description: '',
            quantity: 1,
            rate: 0,
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
      transport_amount: 0,
      transport_discount: 0,
      services: [],
      notes: '',
      items: [
        {
          equipment_id: null,
          equipment_name: '',
          description: '',
          quantity: 1,
          rate: 0,
          days: 1,
          item_discount_amount: 0,
          total: 0
        }
      ]
    }
  }, [isEditing, initialData, extractedData])

  // Invoice form data
  const [formData, setFormData] = useState(getInitialFormData)



  // Set template when templates are loaded
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      if (isEditing && initialData?.template_id) {
        // When editing, use the invoice's stored template
        const invoiceTemplate = templates.find(t => t.id === initialData.template_id)
        setSelectedTemplate(invoiceTemplate || templates.find(t => t.is_default) || templates[0])
      } else {
        // When creating, use default template
        const defaultTemplate = templates.find(t => t.is_default) || templates[0]
        setSelectedTemplate(defaultTemplate)
      }
    }
  }, [templates, selectedTemplate, isEditing, initialData])

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
  const equipmentSubtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0)
  const transportAmount = parseFloat(formData.transport_amount) || 0
  const transportDiscount = parseFloat(formData.transport_discount) || 0
  const servicesSubtotal = formData.services.reduce((sum, service) => sum + (service.total || 0), 0)
  
  // Calculate full invoice subtotal (equipment + transport + services - transport discount)
  const invoiceSubtotal = equipmentSubtotal + transportAmount - transportDiscount + servicesSubtotal
  
  // Calculate VAT on the full invoice subtotal
  const taxAmount = invoiceSubtotal * (selectedTemplate?.template_data?.taxRate || 0.15)
  
  // Calculate total due (subtotal + VAT)
  const total = invoiceSubtotal + taxAmount


  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleEquipmentSelect = (index, selectedEquipment) => {
    const rate = parseFloat(selectedEquipment.rate) || 0
    const currentItem = formData.items[index]
    const subtotal = (currentItem.quantity || 1) * rate * formData.rental_duration_days
    const newTotal = subtotal - (currentItem.item_discount_amount || 0)
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { 
          ...item, 
          equipment_id: selectedEquipment.id,
          equipment_name: selectedEquipment.name,
          rate: rate,
          description: selectedEquipment.description || '',
          days: typeof formData.rental_duration_days === 'string' ? 1 : formData.rental_duration_days,
          total: newTotal
        } : item
      )
    }))
    // Remove search term after selection to show selected equipment name
    setEquipmentSearchTerms(prev => {
      const newTerms = { ...prev }
      delete newTerms[index]
      return newTerms
    })
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        equipment_id: null,
        equipment_name: '',
        description: '',
        quantity: 1,
        rate: 0,
        days: prev.rental_duration_days,
        item_discount_amount: 0,
        total: 0
      }]
    }))
  }

  const addService = () => {
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, {
        name: '',
        amount: 0,
        discount: 0,
        total: 0
      }]
    }))
  }

  const removeService = (index) => {
    if (formData.services.length > 0) {
      setFormData(prev => ({
        ...prev,
        services: prev.services.filter((_, i) => i !== index)
      }))
    }
  }

  const handleServiceChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map((service, i) => {
        if (i === index) {
          const updatedService = { ...service, [field]: value }
          // Recalculate total when amount or discount changes
          if (field === 'amount' || field === 'discount') {
            const amount = field === 'amount' ? parseFloat(value) || 0 : parseFloat(updatedService.amount) || 0
            const discount = field === 'discount' ? parseFloat(value) || 0 : parseFloat(updatedService.discount) || 0
            updatedService.total = amount - discount
          }
          return updatedService
        }
        return service
      })
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
          customer_data: {
            name: formData.customer_name,
            phone: formData.customer_phone,
            email: formData.customer_email,
            address: formData.customer_address
          },
          rental_start_date: formData.rental_start_date,
          rental_duration_days: typeof formData.rental_duration_days === 'string' ? 1 : formData.rental_duration_days,
          transport_amount: transportAmount,
          transport_discount: transportDiscount,
          services: formData.services,
          notes: formData.notes,
          tax_amount: taxAmount,
          status: initialData.status || 'draft',
          template_id: selectedTemplate?.id,
          items: formData.items.filter(item => item.equipment_name).map((item) => ({
            equipment_id: item.equipment_id,
            equipment_name: item.equipment_name,
            quantity: item.quantity,
            rate: item.rate,
            rental_days: typeof formData.rental_duration_days === 'string' ? 1 : formData.rental_duration_days,
            item_discount_amount: item.item_discount_amount
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
          rental_duration_days: typeof formData.rental_duration_days === 'string' ? 1 : formData.rental_duration_days,
          transport_amount: transportAmount,
          transport_discount: transportDiscount,
          services: formData.services,
          notes: formData.notes,
          tax_amount: taxAmount,
          template_config: selectedTemplate.template_data,
          template_id: selectedTemplate?.id,
          items: formData.items.filter(item => item.equipment_name).map((item) => ({
            equipment_name: item.equipment_name,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            rental_days: typeof formData.rental_duration_days === 'string' ? 1 : formData.rental_duration_days,
            item_discount_amount: item.item_discount_amount
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
    rental_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    rental_start_date: formData.rental_start_date || new Date().toISOString(),
    rental_duration_days: formData.rental_duration_days || 1,
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
      days: typeof formData.rental_duration_days === 'string' ? 1 : formData.rental_duration_days,
      rate: item.rate,
      item_discount_amount: item.item_discount_amount,
      total: item.total
    })),
    subtotal: equipmentSubtotal,
    tax_amount: taxAmount,
    transport_amount: transportAmount,
    transport_discount: transportDiscount,
    services: formData.services,
    total,
    notes: formData.notes || ''
  } : null

  return (
    <div className={`${showPreview ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto space-y-6 px-4`}>
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
        <div className={`${showPreview ? 'w-2/5' : 'w-full'} transition-all duration-300`}>
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
                      Rental Duration (Days) *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.rental_duration_days}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Allow empty string for clearing, but ensure minimum 1 for calculations
                        const newDuration = inputValue === '' ? '' : Math.max(1, parseInt(inputValue) || 1);
                        const calculationDuration = typeof newDuration === 'string' ? 1 : newDuration;
                        
                        setFormData(prev => ({
                          ...prev,
                          rental_duration_days: newDuration,
                          items: prev.items.map(item => ({
                            ...item,
                            days: calculationDuration,
                            total: (item.quantity || 1) * (item.rate || 0) * calculationDuration - (item.item_discount_amount || 0)
                          }))
                        }));
                      }}
                      placeholder="Enter number of days"
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Equipment Name *
                          </label>
                          <div className="relative">
                            <div className="relative">
                              <Input
                                value={equipmentSearchTerms[index] !== undefined ? equipmentSearchTerms[index] : item.equipment_name}
                                onChange={(e) => setEquipmentSearchTerms(prev => ({ ...prev, [index]: e.target.value }))}
                                onFocus={() => {
                                  if (equipmentSearchTerms[index] === undefined && item.equipment_name) {
                                    setEquipmentSearchTerms(prev => ({ ...prev, [index]: '' }))
                                  }
                                }}
                                placeholder="Search for equipment..."
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
                                        {formatCurrency(eq.rate)}/day
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
                              const subtotal = numericQuantity * (item.rate || 0) * formData.rental_duration_days
                              const newTotal = subtotal - (item.item_discount_amount || 0)
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
                            value={formData.rental_duration_days === '' ? '' : formData.rental_duration_days}
                            readOnly
                            className="bg-gray-50 text-gray-600"
                            title="Days are set from the rental duration above"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rate
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.rate}
                            readOnly
                            className="bg-gray-50 text-gray-600"
                            title="Rate is automatically set from selected equipment"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Discount
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.item_discount_amount === 0 ? '' : item.item_discount_amount}
                            onChange={(e) => {
                              const inputValue = e.target.value
                              const newDiscount = inputValue === '' ? 0 : (parseFloat(inputValue) || 0)
                              const item = formData.items[index]
                              const subtotal = (item.quantity || 1) * (item.rate || 0) * formData.rental_duration_days
                              const newTotal = subtotal - newDiscount
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((item, i) => 
                                  i === index ? { ...item, item_discount_amount: newDiscount, total: newTotal } : item
                                )
                              }))
                            }}
                            placeholder="0.00"
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

            {/* Services */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-primary-600" />
                    <h3 className="text-lg font-medium text-gray-900">Services</h3>
                  </div>
                  <Button type="button" size="sm" onClick={addService}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.services.map((service, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Service {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeService(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Service Name *
                          </label>
                          <Input
                            value={service.name}
                            onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                            placeholder="e.g., Setup Service, Delivery Fee"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={service.amount === 0 ? '' : service.amount}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              handleServiceChange(index, 'amount', value);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={service.discount === 0 ? '' : service.discount}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              handleServiceChange(index, 'discount', value);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 text-right">
                        <span className="text-sm text-gray-500">Total: </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(service.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {formData.services.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No services added. Click "Add Service" to add custom services to this invoice.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transport */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Transport</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transport Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.transport_amount === 0 ? '' : formData.transport_amount}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                        setFormData({...formData, transport_amount: value});
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transport Discount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.transport_discount === 0 ? '' : formData.transport_discount}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                        setFormData({...formData, transport_discount: value});
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal (Excl. VAT):</span>
                    <span className="font-medium">{formatCurrency(invoiceSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT @ {((selectedTemplate?.template_data?.taxRate || 0.15) * 100).toFixed(0)}%:</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total Due:</span>
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
          <div className="w-3/5">
            <div className="sticky top-0">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
              <div className="max-h-[80vh] overflow-y-auto border border-gray-200 rounded-lg bg-white">
                {previewData ? (
                  <InvoicePreview templateData={previewData} className="" />
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
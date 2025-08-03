import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, FileText, Settings, Copy, Eye } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input, { Textarea } from '../components/ui/Input'
import { PageLoader } from '../components/shared/LoadingSpinner'
import InvoicePreview from '../components/invoice/InvoicePreview'
import { 
  useTemplates, 
  useCreateTemplate, 
  useUpdateTemplate, 
  useDeleteTemplate, 
  useSetDefaultTemplate, 
  useDuplicateTemplate 
} from '../hooks/useTemplates'

function TemplateCard({ template, onEdit, onDelete, onSetDefault, onDuplicate, onPreview }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-primary-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
              {template.is_default && (
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Default Template
                </span>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onPreview(template)}
              className="text-gray-400 hover:text-blue-600"
              title="Preview Template"
            >
              <Eye className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => onEdit(template)}
              className="text-gray-400 hover:text-primary-600"
              title="Edit Template"
            >
              <Edit className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => onDuplicate(template)}
              className="text-gray-400 hover:text-blue-600"
              title="Duplicate Template"
            >
              <Copy className="h-4 w-4" />
            </button>
            
            {!template.is_default && (
              <button
                onClick={() => onSetDefault(template)}
                className="text-gray-400 hover:text-green-600"
                title="Set as Default"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
            
            {!template.is_default && (
              <button
                onClick={() => onDelete(template)}
                className="text-gray-400 hover:text-red-600"
                title="Delete Template"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Company:</span>
              <p className="font-medium">{template.template_data.companyName}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone:</span>
              <p className="font-medium">{template.template_data.companyPhone}</p>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>
              <p className="font-medium">{template.template_data.companyEmail}</p>
            </div>
            <div>
              <span className="text-gray-500">Tax Rate:</span>
              <p className="font-medium">{(template.template_data.taxRate * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div 
                className="w-6 h-6 rounded"
                style={{ backgroundColor: template.template_data.headerColor }}
                title="Header Color"
              />
              <span className="text-sm text-gray-500">
                Prefix: {template.template_data.invoiceNumberPrefix}
              </span>
              <span className="text-sm text-gray-500">
                Currency: {template.template_data.currency}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateForm({ template, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    headerColor: '#2563eb',
    accentColor: '#1d4ed8',
    footerText: '',
    termsAndConditions: '',
    taxRate: 0.08,
    currency: 'USD',
    invoiceNumberPrefix: 'INV-'
  })
  
  const [templateName, setTemplateName] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Update form data when template changes
  useEffect(() => {
    if (template) {
      setFormData(template.template_data || {
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        headerColor: '#2563eb',
        accentColor: '#1d4ed8',
        footerText: '',
        termsAndConditions: '',
        taxRate: 0.08,
        currency: 'USD',
        invoiceNumberPrefix: 'INV-'
      })
      setTemplateName(template.name || '')
    } else {
      // Reset form for new template
      setFormData({
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        headerColor: '#2563eb',
        accentColor: '#1d4ed8',
        footerText: '',
        termsAndConditions: '',
        taxRate: 0.08,
        currency: 'USD',
        invoiceNumberPrefix: 'INV-'
      })
      setTemplateName('')
    }
  }, [template])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      name: templateName,
      template_data: formData
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={template ? 'Edit Template' : 'Create Template'} size="6xl">
      <div className="flex space-x-6">
        {/* Form Section */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Template Settings</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name *
          </label>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Standard Invoice Template"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <Input
              value={formData.companyName}
              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              placeholder="Your Company Name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <Input
              value={formData.companyPhone}
              onChange={(e) => setFormData({...formData, companyPhone: e.target.value})}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <Input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => setFormData({...formData, companyEmail: e.target.value})}
              placeholder="info@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number Prefix
            </label>
            <Input
              value={formData.invoiceNumberPrefix}
              onChange={(e) => setFormData({...formData, invoiceNumberPrefix: e.target.value})}
              placeholder="INV-"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Header Color
            </label>
            <Input
              type="color"
              value={formData.headerColor}
              onChange={(e) => setFormData({...formData, headerColor: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.taxRate}
              onChange={(e) => setFormData({...formData, taxRate: parseFloat(e.target.value)})}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Address
          </label>
          <Textarea
            value={formData.companyAddress}
            onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
            placeholder="123 Main Street&#10;City, State 12345"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Footer Text
          </label>
          <Input
            value={formData.footerText}
            onChange={(e) => setFormData({...formData, footerText: e.target.value})}
            placeholder="Thank you for your business!"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Terms & Conditions
          </label>
          <Textarea
            value={formData.termsAndConditions}
            onChange={(e) => setFormData({...formData, termsAndConditions: e.target.value})}
            placeholder="Enter your terms and conditions..."
            rows={4}
          />
        </div>

            <ModalFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {template ? 'Update Template' : 'Create Template'}
              </Button>
            </ModalFooter>
          </form>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="w-1/2">
            <div className="sticky top-0">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
              <div className="max-h-[600px] overflow-y-auto">
                <InvoicePreview templateData={formData} className="scale-75 origin-top" />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function Templates() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewingTemplate, setPreviewingTemplate] = useState(null)

  // API hooks
  const { data: templates = [], isLoading, error } = useTemplates()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const setDefaultTemplate = useSetDefaultTemplate()
  const duplicateTemplate = useDuplicateTemplate()

  const handleEdit = (template) => {
    setEditingTemplate(template)
  }

  const handlePreview = (template) => {
    setPreviewingTemplate(template)
  }

  const handleDelete = (template) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteTemplate.mutate(template.id)
    }
  }

  const handleSetDefault = (template) => {
    setDefaultTemplate.mutate(template.id)
  }

  const handleDuplicate = (template) => {
    duplicateTemplate.mutate(template.id)
  }

  const handleSave = async (templateData) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, data: templateData })
        setEditingTemplate(null)
      } else {
        await createTemplate.mutateAsync(templateData)
        setIsCreateModalOpen(false)
      }
    } catch (error) {
      // Error handling is done in the hooks
      console.error('Template save error:', error)
    }
  }

  const handleCloseModals = () => {
    setIsCreateModalOpen(false)
    setEditingTemplate(null)
    setPreviewingTemplate(null)
  }

  if (isLoading) {
    return <PageLoader />
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg">Error loading templates</div>
        <p className="text-gray-500 mt-2">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Customize your invoice appearance and company information
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onDuplicate={handleDuplicate}
              onPreview={handlePreview}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first invoice template to get started.
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        </div>
      )}

      {/* Template Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <Settings className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              About Invoice Templates
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p className="mb-2">
                Templates define how your invoices will look when generated as PDFs. You can customize:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Company information and branding</li>
                <li>Colors and styling</li>
                <li>Tax rates and currency</li>
                <li>Terms and conditions</li>
                <li>Footer text and messaging</li>
              </ul>
              <p className="mt-2">
                The default template will be used for all new invoices unless otherwise specified.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <TemplateForm
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        onSave={handleSave}
      />

      {/* Edit Modal */}
      <TemplateForm
        template={editingTemplate}
        isOpen={!!editingTemplate}
        onClose={handleCloseModals}
        onSave={handleSave}
      />

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewingTemplate}
        onClose={handleCloseModals}
        title={`Preview: ${previewingTemplate?.name || ''}`}
        size="4xl"
      >
        {previewingTemplate && (
          <div className="max-h-[80vh] overflow-y-auto">
            <InvoicePreview templateData={previewingTemplate.template_data} />
          </div>
        )}
      </Modal>
    </div>
  )
}
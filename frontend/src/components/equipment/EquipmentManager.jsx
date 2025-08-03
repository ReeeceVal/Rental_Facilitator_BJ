import { useState } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Package } from 'lucide-react'
import { useEquipment, useDeleteEquipment, useEquipmentCategories } from '../../hooks/useEquipment'
import { PageLoader } from '../shared/LoadingSpinner'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Modal from '../ui/Modal'
import EquipmentForm from './EquipmentForm'
import { formatCurrency } from '../../utils/helpers'
import { debounce } from '../../utils/helpers'

export default function EquipmentManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState(null)
  const [page, setPage] = useState(1)

  const debouncedSearch = debounce((value) => {
    setSearchTerm(value)
    setPage(1)
  }, 300)

  const { data, isLoading, error } = useEquipment({
    search: searchTerm,
    category: selectedCategory,
    active: showActiveOnly ? 'true' : 'all',
    page,
    limit: 20
  })

  const { data: categoriesResponse } = useEquipmentCategories()
  const categories = categoriesResponse?.data || []
  const deleteEquipment = useDeleteEquipment()

  const handleSearch = (e) => {
    debouncedSearch(e.target.value)
  }

  const handleCategoryFilter = (e) => {
    setSelectedCategory(e.target.value)
    setPage(1)
  }

  const handleDelete = async (equipment) => {
    if (window.confirm(`Are you sure you want to delete "${equipment.name}"?`)) {
      await deleteEquipment.mutateAsync(equipment.id)
    }
  }

  const handleEdit = (equipment) => {
    setEditingEquipment(equipment)
  }

  const handleCloseModals = () => {
    setIsCreateModalOpen(false)
    setEditingEquipment(null)
  }

  if (isLoading) return <PageLoader />

  if (error) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading equipment</h3>
        <p className="mt-1 text-sm text-gray-500">Please try refreshing the page.</p>
      </div>
    )
  }

  const equipment = data?.data?.equipment || []
  const pagination = data?.data?.pagination

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your rental equipment inventory
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search equipment..."
                  className="pl-10"
                  onChange={handleSearch}
                />
              </div>
            </div>
            
            <div>
              <select
                value={selectedCategory}
                onChange={handleCategoryFilter}
                className="input"
              >
                <option value="">All Categories</option>
                {(categories || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => {
                    setShowActiveOnly(e.target.checked)
                    setPage(1)
                  }}
                  className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Active only</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      {equipment.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {equipment.map((item) => (
              <div key={item.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-primary-600" />
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-gray-400 hover:text-red-600"
                        disabled={deleteEquipment.isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {item.name}
                  </h3>
                  
                  {item.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Daily Rate:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.daily_rate)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Stock:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {item.stock_quantity}
                      </span>
                    </div>

                    {item.category_name && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Category:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {item.category_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(page * pagination.limit, pagination.total)}
                    </span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    <Button
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="rounded-r-none"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.pages}
                      className="rounded-l-none"
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory 
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first equipment item.'
            }
          </p>
          {!searchTerm && !selectedCategory && (
            <div className="mt-6">
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        title="Add New Equipment"
        size="lg"
      >
        <EquipmentForm onSuccess={handleCloseModals} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingEquipment}
        onClose={handleCloseModals}
        title="Edit Equipment"
        size="lg"
      >
        {editingEquipment && (
          <EquipmentForm
            equipment={editingEquipment}
            onSuccess={handleCloseModals}
          />
        )}
      </Modal>
    </div>
  )
}
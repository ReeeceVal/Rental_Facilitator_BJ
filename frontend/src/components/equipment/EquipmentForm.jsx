import { useForm } from 'react-hook-form'
import { useEquipmentCategories, useCreateEquipment, useUpdateEquipment } from '../../hooks/useEquipment'
import Button from '../ui/Button'
import Input, { Textarea } from '../ui/Input'
import { ModalFooter } from '../ui/Modal'

export default function EquipmentForm({ equipment, onSuccess }) {
  const isEditing = !!equipment
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: equipment || {
      name: '',
      description: '',
      daily_rate: '',
      weekly_rate: '',
      monthly_rate: '',
      category_id: '',
      stock_quantity: 1,
      is_active: true
    }
  })

  const { data: categoriesResponse } = useEquipmentCategories()
  const categories = categoriesResponse?.data || []
  const createEquipment = useCreateEquipment()
  const updateEquipment = useUpdateEquipment()

  const watchDailyRate = watch('daily_rate')

  const onSubmit = async (data) => {
    try {
      // Convert string values to numbers
      const formattedData = {
        ...data,
        daily_rate: parseFloat(data.daily_rate),
        weekly_rate: data.weekly_rate ? parseFloat(data.weekly_rate) : null,
        monthly_rate: data.monthly_rate ? parseFloat(data.monthly_rate) : null,
        category_id: data.category_id ? parseInt(data.category_id) : null,
        stock_quantity: parseInt(data.stock_quantity),
      }

      if (isEditing) {
        await updateEquipment.mutateAsync({ id: equipment.id, data: formattedData })
      } else {
        await createEquipment.mutateAsync(formattedData)
      }
      
      onSuccess?.()
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const isLoading = createEquipment.isLoading || updateEquipment.isLoading

  // Auto-calculate suggested rates based on daily rate
  const suggestedWeeklyRate = watchDailyRate ? (parseFloat(watchDailyRate) * 6).toFixed(2) : ''
  const suggestedMonthlyRate = watchDailyRate ? (parseFloat(watchDailyRate) * 25).toFixed(2) : ''

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Equipment Name */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Equipment Name *
          </label>
          <Input
            {...register('name', { required: 'Equipment name is required' })}
            error={!!errors.name}
            placeholder="e.g., JBL EON615 15&quot; Powered Speaker"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            {...register('category_id')}
            className="input"
          >
            <option value="">Select Category</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock Quantity *
          </label>
          <Input
            type="number"
            min="0"
            {...register('stock_quantity', { 
              required: 'Stock quantity is required',
              min: { value: 0, message: 'Stock quantity must be 0 or greater' }
            })}
            error={!!errors.stock_quantity}
            placeholder="1"
          />
          {errors.stock_quantity && (
            <p className="mt-1 text-sm text-red-600">{errors.stock_quantity.message}</p>
          )}
        </div>

        {/* Daily Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily Rate * ($)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('daily_rate', { 
              required: 'Daily rate is required',
              min: { value: 0, message: 'Rate must be positive' }
            })}
            error={!!errors.daily_rate}
            placeholder="50.00"
          />
          {errors.daily_rate && (
            <p className="mt-1 text-sm text-red-600">{errors.daily_rate.message}</p>
          )}
        </div>

        {/* Weekly Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weekly Rate ($)
            {suggestedWeeklyRate && (
              <span className="text-xs text-gray-500 ml-1">
                (Suggested: ${suggestedWeeklyRate})
              </span>
            )}
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('weekly_rate', { 
              min: { value: 0, message: 'Rate must be positive' }
            })}
            error={!!errors.weekly_rate}
            placeholder={suggestedWeeklyRate || "300.00"}
          />
          {errors.weekly_rate && (
            <p className="mt-1 text-sm text-red-600">{errors.weekly_rate.message}</p>
          )}
        </div>

        {/* Monthly Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Rate ($)
            {suggestedMonthlyRate && (
              <span className="text-xs text-gray-500 ml-1">
                (Suggested: ${suggestedMonthlyRate})
              </span>
            )}
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('monthly_rate', { 
              min: { value: 0, message: 'Rate must be positive' }
            })}
            error={!!errors.monthly_rate}
            placeholder={suggestedMonthlyRate || "1000.00"}
          />
          {errors.monthly_rate && (
            <p className="mt-1 text-sm text-red-600">{errors.monthly_rate.message}</p>
          )}
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('is_active')}
              className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Inactive equipment won't appear in rental selections
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <Textarea
          {...register('description')}
          rows={3}
          placeholder="Detailed description of the equipment, specifications, condition notes, etc."
        />
      </div>

      <ModalFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={onSuccess}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isLoading}
        >
          {isEditing ? 'Update Equipment' : 'Add Equipment'}
        </Button>
      </ModalFooter>
    </form>
  )
}
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { equipmentAPI } from '../services/api'

export function useEquipment(params = {}) {
  return useQuery(
    ['equipment', params],
    () => equipmentAPI.getAll(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

export function useEquipmentById(id) {
  return useQuery(
    ['equipment', id],
    () => equipmentAPI.getById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  )
}

export function useEquipmentCategories() {
  return useQuery(
    'equipment-categories',
    () => equipmentAPI.getCategories(),
    {
      staleTime: 30 * 60 * 1000, // 30 minutes - categories don't change often
    }
  )
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()
  
  return useMutation(equipmentAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('equipment')
      toast.success('Equipment created successfully')
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to create equipment'
      toast.error(message)
    }
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, data }) => equipmentAPI.update(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('equipment')
        queryClient.invalidateQueries(['equipment', variables.id])
        toast.success('Equipment updated successfully')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to update equipment'
        toast.error(message)
      }
    }
  )
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient()
  
  return useMutation(equipmentAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('equipment')
      toast.success('Equipment deleted successfully')
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to delete equipment'
      toast.error(message)
    }
  })
}
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { customersAPI } from '../services/api'

export function useCustomers(params = {}) {
  return useQuery(
    ['customers', params],
    () => customersAPI.getAll(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

export function useCustomerById(id) {
  return useQuery(
    ['customers', id],
    () => customersAPI.getById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  )
}

export function useCustomerSearch(query) {
  return useQuery(
    ['customer-search', query],
    () => customersAPI.search(query),
    {
      enabled: !!query && query.length >= 2,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation(customersAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers')
      queryClient.invalidateQueries('customer-search')
      toast.success('Customer created successfully')
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to create customer'
      toast.error(message)
    }
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, data }) => customersAPI.update(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('customers')
        queryClient.invalidateQueries(['customers', variables.id])
        queryClient.invalidateQueries('customer-search')
        toast.success('Customer updated successfully')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to update customer'
        toast.error(message)
      }
    }
  )
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation(customersAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers')
      queryClient.invalidateQueries('customer-search')
      toast.success('Customer deleted successfully')
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to delete customer'
      toast.error(message)
    }
  })
}
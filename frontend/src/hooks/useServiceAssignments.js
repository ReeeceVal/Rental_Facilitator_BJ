import { useQuery, useMutation, useQueryClient } from 'react-query'
import { invoicesAPI } from '../services/api'

export function useServiceAssignments(invoiceId) {
  return useQuery(
    ['service-assignments', invoiceId],
    async () => {
      const response = await invoicesAPI.getServiceAssignments(invoiceId)
      return response.data
    },
    {
      enabled: !!invoiceId,
      staleTime: 0, // Always fetch fresh data
      cacheTime: 1000 * 60 * 5, // Keep in cache for 5 minutes for back button
      refetchOnWindowFocus: true, // Refetch when window gains focus
      refetchOnMount: true, // Always refetch when component mounts
    }
  )
}

export function useCreateServiceAssignment(invoiceId) {
  const queryClient = useQueryClient()
  
  return useMutation(
    (data) => {
      console.log('Creating service assignment with data:', data)
      return invoicesAPI.createServiceAssignment(invoiceId, data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['service-assignments', invoiceId])
        queryClient.invalidateQueries(['invoices', invoiceId])
      },
      onError: (error) => {
        console.error('Error creating service assignment:', error.response?.data || error.message)
      }
    }
  )
}

export function useUpdateServiceAssignment(invoiceId) {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ assignmentId, data }) => invoicesAPI.updateServiceAssignment(invoiceId, assignmentId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['service-assignments', invoiceId])
        queryClient.invalidateQueries(['invoices', invoiceId])
      }
    }
  )
}

export function useDeleteServiceAssignment(invoiceId) {
  const queryClient = useQueryClient()
  
  return useMutation(
    (assignmentId) => invoicesAPI.deleteServiceAssignment(invoiceId, assignmentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['service-assignments', invoiceId])
        queryClient.invalidateQueries(['invoices', invoiceId])
      }
    }
  )
}

// Helper function to process service assignments into the format expected by components
export function processServiceAssignments(assignments = []) {
  const assignmentsByService = {};
  
  assignments.forEach(assignment => {
    const serviceId = assignment.invoice_service_id;
    if (!assignmentsByService[serviceId]) {
      assignmentsByService[serviceId] = [];
    }
    assignmentsByService[serviceId].push({
      id: assignment.id,
      employee_id: assignment.employee_id,
      employee_name: assignment.employee_name,
      commission_percentage: assignment.commission_percentage,
      commission_amount: assignment.commission_amount,
      paid_at: assignment.paid_at
    });
  });
  
  return assignmentsByService;
}
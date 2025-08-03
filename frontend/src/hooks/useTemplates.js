import { useQuery, useMutation, useQueryClient } from 'react-query'
import { templatesAPI } from '../services/api'
import { toast } from 'react-hot-toast'

// Get all templates
export const useTemplates = () => {
  return useQuery(
    'templates',
    async () => {
      const response = await templatesAPI.getAll()
      return response.data
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

// Get single template
export const useTemplate = (id) => {
  return useQuery(
    ['templates', id],
    async () => {
      const response = await templatesAPI.getById(id)
      return response.data
    },
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

// Get default template
export const useDefaultTemplate = () => {
  return useQuery(
    ['templates', 'default'],
    async () => {
      const response = await templatesAPI.getDefault()
      return response.data
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

// Create template
export const useCreateTemplate = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    async (templateData) => {
      const response = await templatesAPI.create(templateData)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates')
        toast.success('Template created successfully!')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to create template'
        toast.error(message)
      },
    }
  )
}

// Update template
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, data }) => templatesAPI.update(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('templates')
        queryClient.invalidateQueries(['templates', variables.id])
        toast.success('Template updated successfully!')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to update template'
        toast.error(message)
      },
    }
  )
}

// Set template as default
export const useSetDefaultTemplate = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    (id) => templatesAPI.setDefault(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates')
        queryClient.invalidateQueries(['templates', 'default'])
        toast.success('Default template updated!')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to set default template'
        toast.error(message)
      },
    }
  )
}

// Duplicate template
export const useDuplicateTemplate = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    (id) => templatesAPI.duplicate(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates')
        toast.success('Template duplicated successfully!')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to duplicate template'
        toast.error(message)
      },
    }
  )
}

// Delete template
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    (id) => templatesAPI.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates')
        toast.success('Template deleted successfully!')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to delete template'
        toast.error(message)
      },
    }
  )
}
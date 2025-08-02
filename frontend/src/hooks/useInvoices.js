import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { invoicesAPI } from '../services/api'

export function useInvoices(params = {}) {
  return useQuery(
    ['invoices', params],
    () => invoicesAPI.getAll(params),
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )
}

export function useInvoiceById(id) {
  return useQuery(
    ['invoices', id],
    () => invoicesAPI.getById(id),
    {
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    }
  )
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation(invoicesAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('invoices')
      toast.success('Invoice created successfully')
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to create invoice'
      toast.error(message)
    }
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, data }) => invoicesAPI.update(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('invoices')
        queryClient.invalidateQueries(['invoices', variables.id])
        toast.success('Invoice updated successfully')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to update invoice'
        toast.error(message)
      }
    }
  )
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation(invoicesAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('invoices')
      toast.success('Invoice deleted successfully')
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to delete invoice'
      toast.error(message)
    }
  })
}

export function useGenerateInvoicePDF() {
  return useMutation(
    (id) => invoicesAPI.generatePDF(id),
    {
      onSuccess: (response, invoiceId) => {
        // Create blob and download
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `invoice-${invoiceId}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast.success('PDF generated successfully')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to generate PDF'
        toast.error(message)
      }
    }
  )
}

export function useCreateInvoiceAndGeneratePDF() {
  const queryClient = useQueryClient()
  
  return useMutation(
    async (invoiceData) => {
      // Use the new combined endpoint
      const response = await invoicesAPI.createAndGeneratePDF(invoiceData)
      return response
    },
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('invoices')
        
        // Create blob and download PDF
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `invoice.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast.success('Invoice created and PDF generated successfully')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to create invoice and generate PDF'
        toast.error(message)
      }
    }
  )
}
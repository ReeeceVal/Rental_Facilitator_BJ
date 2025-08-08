import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { uploadAPI } from '../services/api'

export function useUploadHistory(params = {}) {
  return useQuery(
    ['upload-history', params],
    () => uploadAPI.getUploadHistory(params),
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )
}

export function useUploadScreenshot() {
  const queryClient = useQueryClient()
  
  return useMutation(uploadAPI.uploadScreenshot, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('upload-history')
      toast.success('Screenshot processed successfully')
      return data
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to process screenshot'
      toast.error(message)
    }
  })
}

// Mock upload function for demonstration until AI is integrated
export function useMockUploadScreenshot() {
  const queryClient = useQueryClient()
  
  return useMutation(
    async (formData) => {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Mock extracted data structure that AI would return
      return {
        id: Date.now(),
        extracted_data: {
          customer_name: "John Smith",
          phone_number: "+1 (555) 123-4567", 
          rental_start_date: "2024-08-15",
          rental_duration_days: 2,
          equipment: [
            {
              equipment_id: 1,
              equipment_name: "JBL EON615 15\" Powered Speaker",
              quantity: 2,
              confidence: "high"
            },
            {
              equipment_id: 5,
              equipment_name: "Shure SM58 Dynamic Microphone", 
              quantity: 3,
              confidence: "medium"
            }
          ],
          notes: "Wedding reception setup needed",
          conversation_summary: "Customer requested speakers and microphones for wedding reception on Aug 15-17"
        },
        processing_status: "completed",
        file_path: "/uploads/mock-screenshot.jpg"
      }
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('upload-history')
        toast.success('Screenshot processed successfully (Mock Data)')
        return data
      },
      onError: (error) => {
        toast.error('Failed to process screenshot')
      }
    }
  )
}
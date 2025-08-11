import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded - retrying after delay')
      // Retry after 1 second for rate limit errors
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(api.request(error.config))
        }, 1000)
      })
    }
    return Promise.reject(error)
  }
)

// Equipment API
export const equipmentAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value)
      }
    })
    return api.get(`/equipment?${searchParams}`)
  },
  getById: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  getCategories: () => api.get('/equipment/categories'),
}

// Customers API
export const customersAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value)
      }
    })
    return api.get(`/customers?${searchParams}`)
  },
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  search: (query) => api.get(`/customers/search?q=${encodeURIComponent(query)}`),
}

// Invoices API
export const invoicesAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value)
      }
    })
    return api.get(`/invoices?${searchParams}`)
  },
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  generatePDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  createAndGeneratePDF: (data) => api.post('/invoices/create-and-generate-pdf', data, { responseType: 'blob' }),
  getCalendarEvents: (params = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value)
      }
    })
    return api.get(`/invoices/calendar?${searchParams}`)
  },
}

// Upload API
export const uploadAPI = {
  uploadScreenshot: (formData) => {
    return api.post('/upload/screenshot', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for AI processing
    })
  },
  getUploadHistory: (params = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value)
      }
    })
    return api.get(`/upload/history?${searchParams}`)
  },
  getUploadStatus: (id) => api.get(`/upload/status/${id}`),
}

// Templates API
export const templatesAPI = {
  getAll: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  getDefault: () => api.get('/templates/default/active'),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  duplicate: (id) => api.post(`/templates/${id}/duplicate`),
  delete: (id) => api.delete(`/templates/${id}`),
}

export default api
// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

export const INVOICE_STATUSES = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  CANCELLED: 'cancelled'
}

export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUSES.UNPAID]: 'Unpaid',
  [INVOICE_STATUSES.PAID]: 'Paid',
  [INVOICE_STATUSES.CANCELLED]: 'Cancelled'
}

export const INVOICE_STATUS_COLORS = {
  [INVOICE_STATUSES.UNPAID]: 'bg-red-100 text-red-800',
  [INVOICE_STATUSES.PAID]: 'bg-green-100 text-green-800',
  [INVOICE_STATUSES.CANCELLED]: 'bg-yellow-100 text-yellow-800'
}

export const PROCESSING_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

export const PROCESSING_STATUS_LABELS = {
  [PROCESSING_STATUSES.PENDING]: 'Pending',
  [PROCESSING_STATUSES.PROCESSING]: 'Processing',
  [PROCESSING_STATUSES.COMPLETED]: 'Completed',
  [PROCESSING_STATUSES.FAILED]: 'Failed'
}

export const PROCESSING_STATUS_COLORS = {
  [PROCESSING_STATUSES.PENDING]: 'bg-yellow-100 text-yellow-800',
  [PROCESSING_STATUSES.PROCESSING]: 'bg-blue-100 text-blue-800',
  [PROCESSING_STATUSES.COMPLETED]: 'bg-green-100 text-green-800',
  [PROCESSING_STATUSES.FAILED]: 'bg-red-100 text-red-800'
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export const DEFAULT_TAX_RATE = 0.08 // 8%

export const EQUIPMENT_CATEGORIES = [
  'Speakers',
  'Microphones',
  'Mixing Equipment',
  'Amplifiers',
  'Lighting',
  'DJ Equipment',
  'Cables & Accessories',
  'Recording Equipment'
]

export const PAGINATION_LIMITS = {
  EQUIPMENT: 20,
  INVOICES: 10,
  CUSTOMERS: 20,
  UPLOADS: 15
}
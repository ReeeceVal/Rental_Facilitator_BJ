import { useEffect, useState } from 'react'

export default function InvoicePreview({ templateData, invoiceId, className = '' }) {
  const [htmlContent, setHtmlContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPreview = async () => {
      if (!templateData && !invoiceId) {
        setHtmlContent('')
        return
      }

      setLoading(true)
      setError(null)

      try {
        let response
        
        if (invoiceId) {
          // Fetch existing invoice HTML
          response = await fetch(`/api/invoices/${invoiceId}/html`)
        } else {
          // Preview template with actual form data
          response = await fetch('/api/invoices/preview-template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              templateData: templateData,
              invoiceData: templateData // Pass the actual invoice data
            }),
          })
        }

        if (!response.ok) {
          throw new Error('Failed to fetch preview')
        }

        const html = await response.text()
        setHtmlContent(html)
      } catch (err) {
        console.error('Error fetching preview:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [templateData, invoiceId])

  if (!templateData && !invoiceId) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
        <div className="p-6 text-center text-gray-500">
          Select a template to see preview
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
        <div className="p-6 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          Loading preview...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
        <div className="p-6 text-center text-red-500">
          Error loading preview: {error}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
      <div 
        className="invoice-preview-content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{
          // Override any conflicting styles and ensure proper scaling
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#333',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      />
      <style>{`
        .invoice-preview-content {
          max-width: 100%;
          overflow-x: hidden;
        }
        .invoice-preview-content .invoice-container {
          padding: 20px !important;
          max-width: 100% !important;
          margin: 0 !important;
        }
      `}</style>
    </div>
  )
}
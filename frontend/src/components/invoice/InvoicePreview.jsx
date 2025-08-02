import { formatCurrency, formatDate } from '../../utils/helpers'

const sampleInvoiceData = {
  invoice_number: 'INV-001',
  date: new Date().toISOString(),
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  customer: {
    name: 'Sample Customer',
    address: '123 Customer Street\nCity, State 12345',
    phone: '(555) 123-4567',
    email: 'customer@example.com'
  },
  items: [
    {
      id: 1,
      name: 'Microphone System',
      description: 'Professional wireless microphone',
      quantity: 2,
      days: 3,
      daily_rate: 50,
      total: 300
    },
    {
      id: 2,
      name: 'Speaker Package',
      description: 'Full range PA speakers',
      quantity: 1,
      days: 3,
      daily_rate: 100,
      total: 300
    },
    {
      id: 3,
      name: 'Lighting Kit',
      description: 'LED stage lighting setup',
      quantity: 1,
      days: 3,
      daily_rate: 75,
      total: 225
    }
  ],
  subtotal: 825,
  discount: 50,
  total: 775
}

export default function InvoicePreview({ templateData, className = '' }) {
  const {
    companyName = 'Your Company',
    companyAddress = '123 Business St\nCity, State 12345',
    companyPhone = '(555) 123-4567',
    companyEmail = 'info@company.com',
    headerColor = '#2563eb',
    accentColor = '#1d4ed8',
    footerText = 'Thank you for your business!',
    termsAndConditions = 'Payment terms and conditions...',
    taxRate = 0.08,
    currency = 'USD',
    invoiceNumberPrefix = 'INV-'
  } = templateData || {}

  const taxAmount = sampleInvoiceData.total * taxRate
  const finalTotal = sampleInvoiceData.total + taxAmount

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
      <div className="p-6 space-y-6" style={{ fontSize: '14px' }}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: headerColor }}>
              Invoice
            </h1>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <div><strong>DATE:</strong> {formatDate(sampleInvoiceData.date)}</div>
              <div><strong>INV NO:</strong> {invoiceNumberPrefix}{sampleInvoiceData.invoice_number.replace(/\D/g, '')}</div>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-lg font-semibold text-gray-900">{companyName}</h2>
            <div className="mt-2 text-sm text-gray-600 whitespace-pre-line">
              {companyAddress}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <div>Tel: {companyPhone}</div>
              <div>Email: {companyEmail}</div>
            </div>
          </div>
        </div>

        {/* Bill To & Payment Info */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Bill To</h3>
            <div className="text-sm text-gray-600">
              <div className="font-medium">{sampleInvoiceData.customer.name}</div>
              <div className="whitespace-pre-line">{sampleInvoiceData.customer.address}</div>
              <div>Tel: {sampleInvoiceData.customer.phone}</div>
              <div>Email: {sampleInvoiceData.customer.email}</div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Payment Terms</h3>
            <div className="text-sm text-gray-600">
              <div><strong>Due Date:</strong> {formatDate(sampleInvoiceData.due_date)}</div>
              <div><strong>Payment Terms:</strong> Due prior to rental</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr style={{ backgroundColor: accentColor, color: 'white' }}>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                  Description
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                  QTY
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                  Days
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sampleInvoiceData.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.description}</div>
                  </td>
                  <td className="px-3 py-2 text-center text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-center text-sm text-gray-900">
                    {item.days}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-900">
                    {formatCurrency(item.daily_rate)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(sampleInvoiceData.subtotal)}</span>
            </div>
            {sampleInvoiceData.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Less Discount:</span>
                <span className="font-medium">({formatCurrency(sampleInvoiceData.discount)})</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(1)}%):</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold">Total:</span>
                <span 
                  className="text-lg font-bold px-3 py-1 rounded text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Footer */}
        {termsAndConditions && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{termsAndConditions}</p>
          </div>
        )}

        {footerText && (
          <div className="border-t pt-4 text-center">
            <p className="text-sm font-medium" style={{ color: headerColor }}>
              {footerText}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
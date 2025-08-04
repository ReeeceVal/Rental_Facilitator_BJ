import { Routes, Route } from 'react-router-dom'
import Layout from './components/shared/Layout'
import Dashboard from './pages/Dashboard'
import Equipment from './pages/Equipment'
import Invoices from './pages/Invoices'
import InvoiceCreate from './pages/InvoiceCreate'
import InvoiceEdit from './pages/InvoiceEdit'
import InvoiceDetail from './pages/InvoiceDetail'
import Templates from './pages/Templates'
import Calendar from './pages/Calendar'
import Employees from './pages/Employees'
import CommissionReports from './pages/CommissionReports'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<InvoiceCreate />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/commissions" element={<CommissionReports />} />
        <Route path="/templates" element={<Templates />} />
      </Routes>
    </Layout>
  )
}

export default App
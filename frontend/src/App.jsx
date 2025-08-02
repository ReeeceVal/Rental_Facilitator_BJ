import { Routes, Route } from 'react-router-dom'
import Layout from './components/shared/Layout'
import Dashboard from './pages/Dashboard'
import Equipment from './pages/Equipment'
import Upload from './pages/Upload'
import Invoices from './pages/Invoices'
import InvoiceCreate from './pages/InvoiceCreate'
import Templates from './pages/Templates'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<InvoiceCreate />} />
        <Route path="/templates" element={<Templates />} />
      </Routes>
    </Layout>
  )
}

export default App
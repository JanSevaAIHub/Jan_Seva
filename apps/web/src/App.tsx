import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ComplaintForm } from './pages/ComplaintForm'
import { Home } from './pages/Home'
import { MyRequests } from './pages/MyRequests'
import { Officer } from './pages/Officer'
import { SchemeSearch } from './pages/SchemeSearch'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="schemes" element={<SchemeSearch />} />
        <Route path="complaints/new" element={<ComplaintForm />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="officer" element={<Officer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

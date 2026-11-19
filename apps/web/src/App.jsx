import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ComplaintForm } from './pages/ComplaintForm'
import { Home } from './pages/Home'
import { MyRequests } from './pages/MyRequests'
import { Officer } from './pages/Officer'
import { SchemeSearch } from './pages/SchemeSearch'
import { TrackStatus } from './pages/TrackStatus'
import { NotificationsPage } from './pages/NotificationsPage'
import { AuthReturn } from './pages/AuthReturn'
import { AccountRequired } from './components/common/AccountRequired'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="auth/callback" element={<AuthReturn />} />
        <Route path="auth/reset" element={<AuthReturn />} />
        <Route index element={<Home />} />
        <Route path="schemes" element={<SchemeSearch />} />
        <Route path="complaints/new" element={<ComplaintForm />} />
        <Route path="requests" element={<AccountRequired><MyRequests /></AccountRequired>} />
        <Route path="track" element={<AccountRequired><TrackStatus /></AccountRequired>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="officer" element={<Officer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

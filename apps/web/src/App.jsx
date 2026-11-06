import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ComplaintForm } from './pages/ComplaintForm'
import { Home } from './pages/Home'
import { MyRequests } from './pages/MyRequests'
import { Officer } from './pages/Officer'
import { SchemeSearch } from './pages/SchemeSearch'
import { TrackStatus } from './pages/TrackStatus'
import { NotificationsPage } from './pages/NotificationsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="schemes" element={<SchemeSearch />} />
        <Route path="complaints/new" element={<ComplaintForm />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="track" element={<TrackStatus />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="officer" element={<Officer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

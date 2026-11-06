import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from '../common/Toast'
import { SchemeDetailModal } from '../schemes/SchemeDetailModal'
import { ComplaintReviewModal } from '../complaints/ComplaintReviewModal'
import { ComplaintPackageModal } from '../complaints/ComplaintPackageModal'
import { TicketDetailModal } from '../officer/TicketDetailModal'

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Global Interactive Modals & Toast Feedback */}
      <ToastContainer />
      <SchemeDetailModal />
      <ComplaintReviewModal />
      <ComplaintPackageModal />
      <TicketDetailModal />
    </div>
  )
}

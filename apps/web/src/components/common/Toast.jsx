import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function ToastContainer() {
  const { toasts, removeToast } = useApp()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700'
              : toast.type === 'info'
              ? 'bg-indigo-900/95 text-indigo-100 border-indigo-700'
              : 'bg-amber-900/95 text-amber-100 border-amber-700'
          }`}
        >
          <span className="mt-0.5 flex-none">
            {toast.type === 'success' && <CheckCircle2 size={17} className="text-emerald-400" />}
            {toast.type === 'info' && <Info size={17} className="text-indigo-300" />}
            {toast.type === 'warning' && <AlertTriangle size={17} className="text-amber-400" />}
          </span>
          <p className="text-xs leading-relaxed font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}


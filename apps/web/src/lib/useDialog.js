import { useEffect, useRef } from 'react'

// Keep keyboard interaction in the existing modal, including stacked sign-in.
export function useDialog(open, onClose, busy = false) {
  const dialogRef = useRef(null)
  const actions = useRef({ onClose, busy })
  actions.current = { onClose, busy }
  useEffect(() => {
    if (!open || !dialogRef.current) return
    const dialog = dialogRef.current
    const previous = document.activeElement
    const focusable = () => [...dialog.querySelectorAll('a[href], button, input, textarea, select, [tabindex]')]
      .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length > 0)
    const isTop = () => [...document.querySelectorAll('[role="dialog"]')].at(-1) === dialog
    ;(focusable()[0] || dialog).focus()
    const onKeyDown = event => {
      if (!isTop()) return
      if (event.key === 'Escape' && !actions.current.busy) {
        event.preventDefault()
        event.stopPropagation()
        actions.current.onClose()
      }
      if (event.key !== 'Tab') return
      const nodes = focusable()
      const first = nodes[0], last = nodes.at(-1)
      if (!first) { event.preventDefault(); dialog.focus(); return }
      if (!nodes.includes(document.activeElement) ||
        (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous?.isConnected) previous.focus()
    }
  }, [open])
  return dialogRef
}

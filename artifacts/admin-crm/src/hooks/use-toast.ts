import * as React from "react"
import type { ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 300 // ms after close animation before unmounting

export type NotificationType = 'chat' | 'order' | 'sale-order' | 'booking' | 'success' | 'error' | 'warning' | 'info'

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement
  duration?: number
  notificationType?: NotificationType
  onClick?: () => void
  // backward compat with shadcn variant
  variant?: 'default' | 'destructive'
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes
type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: string }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: string }

interface State { toasts: ToasterToast[] }

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const autoDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const scheduleRemove = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, TOAST_REMOVE_DELAY)
  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) }
    case "UPDATE_TOAST":
      return { ...state, toasts: state.toasts.map(t => t.id === action.toast.id ? { ...t, ...action.toast } : t) }
    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        scheduleRemove(toastId)
        autoDismissTimeouts.get(toastId) && clearTimeout(autoDismissTimeouts.get(toastId)!)
        autoDismissTimeouts.delete(toastId)
      } else {
        state.toasts.forEach(t => {
          scheduleRemove(t.id)
          autoDismissTimeouts.get(t.id) && clearTimeout(autoDismissTimeouts.get(t.id)!)
          autoDismissTimeouts.delete(t.id)
        })
      }
      return {
        ...state,
        toasts: state.toasts.map(t =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) return { ...state, toasts: [] }
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.toastId) }
  }
}

const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach(l => l(memoryState))
}

type Toast = Omit<ToasterToast, "id">

// Default durations by type
const DEFAULT_DURATION: Record<NotificationType | 'default', number> = {
  'chat': 8000,
  'order': 8000,
  'sale-order': 8000,
  'booking': 8000,
  'success': 4000,
  'error': 6000,
  'warning': 5000,
  'info': 5000,
  'default': 5000,
}

function toast({ duration, notificationType, ...props }: Toast) {
  const id = genId()
  const autoDuration = duration ?? DEFAULT_DURATION[notificationType ?? 'default']

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })
  const update = (p: ToasterToast) => dispatch({ type: "UPDATE_TOAST", toast: { ...p, id } })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      duration: autoDuration,
      notificationType,
      onOpenChange: (open) => { if (!open) dismiss() },
    },
  })

  // Auto-dismiss
  const autoDismissTimer = setTimeout(dismiss, autoDuration)
  autoDismissTimeouts.set(id, autoDismissTimer)

  return { id, dismiss, update }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const i = listeners.indexOf(setState)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [state])

  return { ...state, toast, dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }) }
}

export { useToast, toast }
export type { ToasterToast }

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X, MessageSquare, ShoppingBag, ShoppingCart, CalendarCheck, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NotificationType } from "@/hooks/use-toast"

export type { NotificationType }

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-[400px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// ── Type config ───────────────────────────────────────────────────────────────

export const TOAST_TYPE_CONFIG: Record<NotificationType, {
  Icon: React.FC<{ className?: string }>
  iconClass: string
  borderClass: string
  bgClass: string
}> = {
  chat: {
    Icon: MessageSquare,
    iconClass: 'text-blue-500',
    borderClass: 'border-l-blue-500',
    bgClass: 'bg-blue-50',
  },
  order: {
    Icon: ShoppingBag,
    iconClass: 'text-green-500',
    borderClass: 'border-l-green-500',
    bgClass: 'bg-green-50',
  },
  'sale-order': {
    Icon: ShoppingCart,
    iconClass: 'text-violet-500',
    borderClass: 'border-l-violet-500',
    bgClass: 'bg-violet-50',
  },
  booking: {
    Icon: CalendarCheck,
    iconClass: 'text-amber-500',
    borderClass: 'border-l-amber-500',
    bgClass: 'bg-amber-50',
  },
  success: {
    Icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    borderClass: 'border-l-emerald-500',
    bgClass: 'bg-emerald-50',
  },
  error: {
    Icon: XCircle,
    iconClass: 'text-red-500',
    borderClass: 'border-l-red-500',
    bgClass: 'bg-red-50',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'text-yellow-500',
    borderClass: 'border-l-yellow-500',
    bgClass: 'bg-yellow-50',
  },
  info: {
    Icon: Info,
    iconClass: 'text-sky-500',
    borderClass: 'border-l-sky-500',
    bgClass: 'bg-sky-50',
  },
}

// ── Toast root ────────────────────────────────────────────────────────────────

interface ToastRootProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
  notificationType?: NotificationType
  onClick?: () => void
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastRootProps
>(({ className, notificationType, onClick, ...props }, ref) => {
  const cfg = notificationType ? TOAST_TYPE_CONFIG[notificationType] : null

  return (
    <ToastPrimitives.Root
      ref={ref}
      onClick={onClick}
      className={cn(
        // base
        "group pointer-events-auto relative flex w-full items-start gap-3",
        "overflow-hidden rounded-xl border bg-white shadow-lg",
        "pl-4 pr-10 py-3",
        "border-l-4",
        "transition-all",
        "data-[swipe=cancel]:translate-x-0",
        "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[swipe=end]:animate-out",
        "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
        "data-[state=open]:slide-in-from-bottom-full",
        // type styling
        cfg ? cfg.borderClass : "border-l-gray-300",
        onClick ? "cursor-pointer hover:shadow-xl" : "",
        className
      )}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1",
      "text-gray-400 opacity-70 transition-opacity",
      "hover:text-gray-600 hover:opacity-100",
      "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-300",
      className
    )}
    toast-close=""
    onClick={e => e.stopPropagation()}
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold text-gray-900 leading-snug", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-gray-500 mt-0.5 leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-7 shrink-0 items-center justify-center rounded-md border bg-transparent px-2.5",
      "text-xs font-medium transition-colors hover:bg-gray-100 focus:outline-none",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}

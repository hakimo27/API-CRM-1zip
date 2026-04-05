import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  TOAST_TYPE_CONFIG,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, action, notificationType, onClick, variant, ...props }) => {
        // Map legacy `variant: 'destructive'` → notificationType 'error'
        const effectiveType = notificationType ?? (variant === 'destructive' ? 'error' : undefined)
        const cfg = effectiveType ? TOAST_TYPE_CONFIG[effectiveType] : null
        const Icon = cfg?.Icon

        return (
          <Toast key={id} notificationType={effectiveType} onClick={onClick} {...props}>
            {/* Icon */}
            {Icon && (
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={`w-4 h-4 ${cfg.iconClass}`} />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
              {onClick && (
                <p className="text-[10px] text-gray-400 mt-1">Нажмите, чтобы открыть →</p>
              )}
            </div>

            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

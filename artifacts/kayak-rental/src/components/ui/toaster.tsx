import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  VARIANT_CONFIG,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, action, toastVariant = 'default', ...props }) => {
        const cfg = VARIANT_CONFIG[toastVariant]
        const Icon = cfg?.Icon

        return (
          <Toast key={id} toastVariant={toastVariant} {...props}>
            {Icon && (
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={`w-4 h-4 ${cfg.iconClass}`} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
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

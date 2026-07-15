import { ref } from 'vue'

interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

const toasts = ref<ToastItem[]>([])
let toastId = 0

export function useToast() {
  const show = (message: string, type: ToastItem['type'] = 'info', duration = 3000) => {
    const id = ++toastId
    toasts.value.push({ id, message, type })

    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)

    return id
  }

  const info = (msg: string, duration?: number) => show(msg, 'info', duration)
  const success = (msg: string, duration?: number) => show(msg, 'success', duration)
  const error = (msg: string, duration?: number) => show(msg, 'error', duration)
  const warning = (msg: string, duration?: number) => show(msg, 'warning', duration)

  return { toasts, show, info, success, error, warning }
}

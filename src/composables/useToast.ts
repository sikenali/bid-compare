import { ref } from 'vue'

interface ToastState {
  message: string
  visible: boolean
}

const toast = ref<ToastState>({ message: '', visible: false })
let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  const show = (message: string) => {
    if (timer) clearTimeout(timer)
    toast.value = { message, visible: true }
    timer = setTimeout(() => {
      toast.value.visible = false
    }, 2000)
  }

  const dismiss = () => {
    if (timer) clearTimeout(timer)
    toast.value.visible = false
  }

  return { toast, show, dismiss }
}
import { ref } from 'vue'

interface ConfirmState {
  visible: boolean
  message: string
  resolve: ((value: boolean) => void) | null
}

const confirm = ref<ConfirmState>({ visible: false, message: '', resolve: null })

export function useConfirm() {
  const show = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirm.value = { visible: true, message, resolve }
    })
  }

  const confirmAction = () => {
    if (confirm.value.resolve) {
      confirm.value.resolve(true)
    }
    confirm.value = { visible: false, message: '', resolve: null }
  }

  const cancel = () => {
    if (confirm.value.resolve) {
      confirm.value.resolve(false)
    }
    confirm.value = { visible: false, message: '', resolve: null }
  }

  return { confirm, show, confirmAction, cancel }
}
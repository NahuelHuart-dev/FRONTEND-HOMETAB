import { reactive } from 'vue'

const state = reactive({
  visible: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  severity: 'danger',
  resolve: null,
})

export function useConfirmDialog() {
  const confirm = (options = {}) => new Promise((resolve) => {
    state.title = options.title || 'Confirmar accion'
    state.message = options.message || 'Quieres continuar?'
    state.confirmLabel = options.confirmLabel || 'Confirmar'
    state.cancelLabel = options.cancelLabel || 'Cancelar'
    state.severity = options.severity || 'danger'
    state.resolve = resolve
    state.visible = true
  })

  const accept = () => {
    state.visible = false
    state.resolve?.(true)
    state.resolve = null
  }

  const reject = () => {
    state.visible = false
    state.resolve?.(false)
    state.resolve = null
  }

  return { state, confirm, accept, reject }
}

import { computed, ref } from 'vue'
import http from '@/services/http'

const households = ref([])
const totalUnread = ref(0)
const loading = ref(false)
const error = ref('')
let pollId = null
let focusHandler = null

const items = computed(() => households.value.flatMap((household) =>
  (household.items || []).map((item) => ({ ...item, household }))
))

const fetchNotifications = async () => {
  if (!localStorage.getItem('token')) return
  loading.value = true
  error.value = ''
  try {
    const response = await http.get('/notifications')
    households.value = response.data.households || []
    totalUnread.value = response.data.totalUnread || 0
  } catch (err) {
    error.value = err.response?.data?.error || 'No se han podido cargar las notificaciones.'
  } finally {
    loading.value = false
  }
}

const markRead = async (id) => {
  await http.post(`/notifications/${id}/read`)
  await fetchNotifications()
}

const markAllRead = async () => {
  await http.post('/notifications/read-all')
  await fetchNotifications()
}

const startPolling = () => {
  if (pollId) return
  fetchNotifications()
  pollId = window.setInterval(fetchNotifications, 45000)
  focusHandler = () => {
    if (!document.hidden) fetchNotifications()
  }
  window.addEventListener('focus', focusHandler)
}

const stopPolling = () => {
  if (pollId) {
    window.clearInterval(pollId)
    pollId = null
  }
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler)
    focusHandler = null
  }
  households.value = []
  totalUnread.value = 0
}

export function useNotifications() {
  return {
    households,
    items,
    totalUnread,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
    startPolling,
    stopPolling,
  }
}

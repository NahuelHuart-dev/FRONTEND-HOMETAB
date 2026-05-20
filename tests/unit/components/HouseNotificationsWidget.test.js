import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import HouseNotificationsWidget from '@/components/HouseNotificationsWidget.vue'

const routerPush = vi.fn()
const markRead = vi.fn()
const markAllRead = vi.fn()
const notificationState = {
  households: ref([]),
  totalUnread: ref(0),
  loading: ref(false),
}

vi.mock('@/composables/useNotifications', () => ({
  useNotifications: () => ({
    ...notificationState,
    markRead,
    markAllRead,
  }),
}))

vi.mock('@/services/http', () => ({
  assetUrl: (path) => `http://assets.test${path}`,
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key }),
}))

describe('HouseNotificationsWidget', () => {
  beforeEach(() => {
    routerPush.mockReset()
    markRead.mockReset()
    markAllRead.mockReset()
    notificationState.households.value = []
    notificationState.totalUnread.value = 0
    notificationState.loading.value = false
  })

  it('renders empty state when there are no notifications', () => {
    const wrapper = mount(HouseNotificationsWidget, { props: { open: true } })

    expect(wrapper.text()).toContain('notifications.empty')
  })

  it('renders unread count and marks all notifications', async () => {
    notificationState.totalUnread.value = 2
    notificationState.households.value = [
      {
        id: 1,
        name: 'Casa',
        unreadCount: 2,
        items: [{ id: 10, type: 'task', title: 'Tarea', message: 'Pendiente', read: false }],
      },
    ]

    const wrapper = mount(HouseNotificationsWidget, { props: { open: true } })
    expect(wrapper.text()).toContain('2 notifications.unread')
    expect(wrapper.text()).toContain('Tarea')

    await wrapper.find('.notifications-actions button').trigger('click')
    expect(markAllRead).toHaveBeenCalled()
  })

  it('marks a clicked notification as read and navigates to its route', async () => {
    markRead.mockResolvedValueOnce()
    notificationState.households.value = [
      {
        id: 1,
        name: 'Casa',
        unreadCount: 1,
        items: [{ id: 10, type: 'event', title: 'Cena', message: 'Hoy', route: '/households/1/calendar', read: false }],
      },
    ]

    const wrapper = mount(HouseNotificationsWidget, { props: { open: true } })
    await wrapper.find('.notification-card').trigger('click')
    await flushPromises()

    expect(markRead).toHaveBeenCalledWith(10)
    expect(routerPush).toHaveBeenCalledWith('/households/1/calendar')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

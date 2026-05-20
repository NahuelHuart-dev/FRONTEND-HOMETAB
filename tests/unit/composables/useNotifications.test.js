import { beforeEach, describe, expect, it, vi } from 'vitest'
import http from '@/services/http'
import { useNotifications } from '@/composables/useNotifications'

vi.mock('@/services/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useRealTimers()
    http.get.mockReset()
    http.post.mockReset()
    const notifications = useNotifications()
    notifications.stopPolling()
  })

  it('does not fetch without a JWT token', async () => {
    const notifications = useNotifications()

    await notifications.fetchNotifications()

    expect(http.get).not.toHaveBeenCalled()
    expect(notifications.households.value).toEqual([])
  })

  it('fetches notifications and flattens items', async () => {
    localStorage.setItem('token', 'jwt')
    http.get.mockResolvedValueOnce({
      data: {
        totalUnread: 1,
        households: [
          {
            id: 1,
            name: 'Casa',
            items: [{ id: 10, title: 'Tarea', read: false }],
          },
        ],
      },
    })

    const notifications = useNotifications()
    await notifications.fetchNotifications()

    expect(http.get).toHaveBeenCalledWith('/notifications')
    expect(notifications.totalUnread.value).toBe(1)
    expect(notifications.items.value[0].household.name).toBe('Casa')
  })

  it('marks one or all notifications as read and refreshes', async () => {
    localStorage.setItem('token', 'jwt')
    http.post.mockResolvedValue({})
    http.get.mockResolvedValue({ data: { totalUnread: 0, households: [] } })

    const notifications = useNotifications()
    await notifications.markRead(10)
    await notifications.markAllRead()

    expect(http.post).toHaveBeenCalledWith('/notifications/10/read')
    expect(http.post).toHaveBeenCalledWith('/notifications/read-all')
    expect(http.get).toHaveBeenCalledTimes(2)
  })

  it('starts and stops polling notifications', () => {
    vi.useFakeTimers()
    localStorage.setItem('token', 'jwt')
    http.get.mockResolvedValue({ data: { totalUnread: 0, households: [] } })

    const notifications = useNotifications()
    notifications.startPolling()

    expect(http.get).toHaveBeenCalledWith('/notifications')
    vi.advanceTimersByTime(45000)
    expect(http.get).toHaveBeenCalledTimes(2)

    notifications.stopPolling()
    expect(notifications.totalUnread.value).toBe(0)
    expect(notifications.households.value).toEqual([])
    vi.useRealTimers()
  })

  it('stores an error message when the API fails', async () => {
    localStorage.setItem('token', 'jwt')
    http.get.mockRejectedValueOnce({ response: { data: { error: 'API caida' } } })

    const notifications = useNotifications()
    await notifications.fetchNotifications()

    expect(notifications.error.value).toBe('API caida')
  })
})

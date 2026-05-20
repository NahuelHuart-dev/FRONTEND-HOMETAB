import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardTab from '@/views/tabs/DashboardTab.vue'
import http from '@/services/http'

const routerPush = vi.fn()

vi.mock('@/services/http', () => ({
  default: {
    get: vi.fn(),
  },
}))

vi.mock('@/composables/useNavigation', () => ({
  useNavigation: () => ({ router: { push: routerPush } }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params?.name ? `${key} ${params.name}` : key) }),
}))

describe('DashboardTab', () => {
  beforeEach(() => {
    routerPush.mockReset()
    http.get.mockReset()
  })

  it('renders household summary and task progress from API data', async () => {
    http.get
      .mockResolvedValueOnce({
        data: {
          user: { firstName: 'Naomi' },
          household: { id: 1, name: 'Casa Home' },
          stats: { totalTasks: 4, completedTasks: 3 },
          timeline: [
            { type: 'task', title: 'Limpiar', date: '2026-05-20T10:00:00Z' },
            { type: 'event', title: 'Cena', date: '2026-05-21T20:00:00Z' },
          ],
          alerts: [],
        },
      })
      .mockResolvedValueOnce({
        data: [{ amount: 50, paidAt: new Date().toISOString() }],
      })

    const wrapper = mount(DashboardTab, {
      props: {
        homeId: 1,
        config: { darkMode: false, colorAcento: '#ea580c' },
      },
    })
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/households/1/dashboard')
    expect(http.get).toHaveBeenCalledWith('/households/1/expenses')
    expect(wrapper.text()).toContain('Casa Home')
    expect(wrapper.text()).toContain('75%')
    expect(wrapper.text()).toContain('Limpiar')
    expect(wrapper.text()).toContain('Cena')
  })
})

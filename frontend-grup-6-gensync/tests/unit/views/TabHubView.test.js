import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TabHubView from '@/views/TabHubView.vue'
import http from '@/services/http'

const go = vi.fn()
const routerPush = vi.fn()

vi.mock('@/services/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
  assetUrl: (path) => path,
}))

vi.mock('@/composables/useNavigation', () => ({
  useNavigation: () => ({ go, router: { push: routerPush } }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key }),
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

const mountTabHub = () => mount(TabHubView, {
  props: {
    config: { darkMode: false, colorAcento: '#ea580c' },
    isLoggedIn: true,
  },
  global: {
    stubs: {
      PostItCard: {
        props: ['titulo'],
        emits: ['click'],
        template: '<button class="post-it-card" @click="$emit(\'click\')">{{ titulo }}</button>',
      },
      Dialog: { template: '<div><slot /></div>' },
      Button: { props: ['label'], template: '<button type="button">{{ label }}</button>' },
      InputText: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
      },
    },
  },
})

describe('TabHubView', () => {
  beforeEach(() => {
    go.mockReset()
    routerPush.mockReset()
    http.get.mockReset()
    http.post.mockReset()
    http.put.mockReset()
  })

  it('loads and renders the user households', async () => {
    http.get.mockResolvedValueOnce({
      data: [{ id: 12, name: 'Casa Test', avatarIcon: 'pi-home', role: 'owner' }],
    })

    const wrapper = mountTabHub()
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/households')
    expect(wrapper.text()).toContain('Casa Test')
  })

  it('redirects to login when the API returns unauthorized', async () => {
    localStorage.setItem('token', 'expired')
    http.get.mockRejectedValueOnce({ response: { status: 401 } })

    mountTabHub()
    await flushPromises()

    expect(localStorage.getItem('token')).toBe(null)
    expect(go).toHaveBeenCalledWith('/login')
  })

  it('opens a household when its post-it is clicked', async () => {
    http.get.mockResolvedValueOnce({
      data: [{ id: 15, name: 'Casa Click', avatarIcon: 'pi-home', role: 'owner' }],
    })

    const wrapper = mountTabHub()
    await flushPromises()
    await wrapper.find('.post-it-card').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/households/15')
  })
})

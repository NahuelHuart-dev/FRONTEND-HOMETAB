import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import HouseChatWidget from '@/components/HouseChatWidget.vue'
import http from '@/services/http'

const houseState = {
  isChatOpen: ref(false),
  currentHomeId: ref(null),
  closeChat: vi.fn(() => { houseState.isChatOpen.value = false }),
}

vi.mock('@/services/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  assetUrl: (path) => `http://assets.test${path}`,
}))

vi.mock('@/composables/useHouseState', () => ({
  useHouseState: () => houseState,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('HouseChatWidget', () => {
  beforeEach(() => {
    vi.useRealTimers()
    http.get.mockReset()
    http.post.mockReset()
    houseState.isChatOpen.value = false
    houseState.currentHomeId.value = null
    houseState.closeChat.mockClear()
  })

  it('opens chat and loads available houses', async () => {
    http.get.mockResolvedValueOnce({ data: [{ id: 1, name: 'Casa', messageCount: 3 }] })

    const wrapper = mount(HouseChatWidget, { props: { user: { id: 1 } } })
    await wrapper.find('.house-chat-fab').trigger('click')
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/chat/households')
    expect(wrapper.text()).toContain('Casa')
  })

  it('loads messages when selecting a house and sends a message', async () => {
    houseState.currentHomeId.value = 1
    http.get.mockResolvedValueOnce({ data: [] })
    http.post.mockResolvedValueOnce({
      data: {
        chatMessage: {
          id: 50,
          content: 'Hola casa',
          sender: { id: 1, fullName: 'Naomi' },
          createdAt: '2026-05-19T10:00:00Z',
        },
      },
    })

    const wrapper = mount(HouseChatWidget, { props: { user: { id: 1 } } })
    await wrapper.find('.house-chat-fab').trigger('click')
    await flushPromises()

    await wrapper.find('textarea').setValue('Hola casa')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith('/households/1/chat/messages', { content: 'Hola casa', imageData: null })
  })

  it('does not send an empty message', async () => {
    houseState.currentHomeId.value = 1
    http.get.mockResolvedValueOnce({ data: [] })

    const wrapper = mount(HouseChatWidget, { props: { user: { id: 1 } } })
    await wrapper.find('.house-chat-fab').trigger('click')
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(http.post).not.toHaveBeenCalled()
  })
})

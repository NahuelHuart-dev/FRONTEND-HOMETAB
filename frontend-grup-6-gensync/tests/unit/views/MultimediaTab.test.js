import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MultimediaTab from '@/views/tabs/MultimediaTab.vue'
import http from '@/services/http'

vi.mock('@/services/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  assetUrl: (path) => `http://assets.test${path}`,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
}))

const mountMultimedia = async () => {
  const wrapper = mount(MultimediaTab, {
    props: {
      homeId: 1,
      config: { colorAcento: '#ea580c' },
    },
  })
  await flushPromises()
  return wrapper
}

describe('MultimediaTab', () => {
  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
  })

  it('loads playlists and renders videos', async () => {
    http.get.mockResolvedValueOnce({
      data: {
        playlists: [
          {
            id: 3,
            name: 'Recetas',
            videos: [{ id: 9, title: 'Tortilla', youtubeId: 'dQw4w9WgXcQ', addedBy: { fullName: 'Naomi' } }],
            createdBy: { fullName: 'Naomi' },
          },
        ],
      },
    })

    const wrapper = await mountMultimedia()

    expect(http.get).toHaveBeenCalledWith('/households/1/multimedia/playlists')
    expect(wrapper.text()).toContain('Recetas')
    expect(wrapper.text()).toContain('Tortilla')
  })

  it('creates a playlist', async () => {
    http.get.mockResolvedValueOnce({ data: { playlists: [] } })
    http.post.mockResolvedValueOnce({ data: { playlist: { id: 4, name: 'Musica', videos: [] } } })

    const wrapper = await mountMultimedia()
    await wrapper.find('.playlist-form input').setValue('Musica')
    await wrapper.find('.playlist-form').trigger('submit')
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith('/households/1/multimedia/playlists', { name: 'Musica' })
    expect(wrapper.text()).toContain('Musica')
    expect(wrapper.text()).toContain('multimedia.playlistCreated')
  })

  it('adds a video to the selected playlist', async () => {
    http.get.mockResolvedValueOnce({ data: { playlists: [{ id: 5, name: 'Videos', videos: [] }] } })
    http.post.mockResolvedValueOnce({ data: { video: { id: 6, title: 'Video nuevo', youtubeId: 'dQw4w9WgXcQ' } } })

    const wrapper = await mountMultimedia()
    await wrapper.find('.add-url-form input').setValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await wrapper.find('.add-url-form').trigger('submit')
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith('/households/1/multimedia/playlists/5/videos', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })
    expect(wrapper.text()).toContain('Video nuevo')
  })

  it('shows API errors', async () => {
    http.get.mockRejectedValueOnce({ response: { data: { error: 'Sin permisos' } } })

    const wrapper = await mountMultimedia()

    expect(wrapper.text()).toContain('Sin permisos')
  })
})

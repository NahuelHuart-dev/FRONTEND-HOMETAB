import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileView from '@/views/ProfileView.vue'
import http from '@/services/http'

const go = vi.fn()

vi.mock('@/services/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  assetUrl: (path) => (path ? `http://assets.test${path}` : ''),
}))

vi.mock('@/composables/useNavigation', () => ({
  useNavigation: () => ({ go }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key }),
}))

const InputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}

const ButtonStub = {
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
}

const mountProfile = async () => {
  const wrapper = mount(ProfileView, {
    global: {
      stubs: {
        Button: ButtonStub,
        InputText: InputStub,
        Password: InputStub,
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ProfileView', () => {
  beforeEach(() => {
    go.mockReset()
    http.get.mockReset()
    http.post.mockReset()
  })

  it('loads profile data from the API', async () => {
    http.get.mockResolvedValueOnce({
      data: {
        firstName: 'Naomi',
        lastName: 'Home',
        email: 'naomi@example.test',
        phoneNumber: '600123456',
        bio: 'Bio',
        avatarIcon: 'pi-star',
      },
    })

    const wrapper = await mountProfile()

    expect(http.get).toHaveBeenCalledWith('/profile')
    expect(wrapper.text()).toContain('profile.title')
    const inputs = wrapper.findAll('input')
    expect(inputs[1].element.value).toBe('Naomi')
    expect(inputs[3].element.value).toBe('naomi@example.test')
  })

  it('rejects invalid avatar files before calling the API', async () => {
    http.get.mockResolvedValueOnce({ data: { email: 'avatar@example.test' } })
    const wrapper = await mountProfile()
    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['x'], 'avatar.gif', { type: 'image/gif' })

    Object.defineProperty(fileInput.element, 'files', { value: [file], configurable: true })
    await fileInput.trigger('change')

    expect(wrapper.text()).toContain('profile.avatarInvalid')
    expect(http.post).not.toHaveBeenCalled()
  })

  it('saves profile changes and stores returned user data', async () => {
    http.get.mockResolvedValueOnce({ data: { email: 'save@example.test' } })
    http.post.mockResolvedValueOnce({
      data: {
        user: { email: 'save@example.test', firstName: 'Save' },
      },
    })

    const wrapper = await mountProfile()
    const inputs = wrapper.findAll('input')
    await inputs[1].setValue('Save')
    await wrapper.findAll('button').at(-1).trigger('click')
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith('/profile', expect.objectContaining({ firstName: 'Save' }))
    expect(localStorage.getItem('hometab_user')).toContain('save@example.test')
    expect(wrapper.text()).toContain('Perfil actualizado correctamente.')
  })

  it('shows API errors when password change fails', async () => {
    http.get.mockResolvedValueOnce({ data: { email: 'password@example.test' } })
    http.post.mockRejectedValueOnce({ response: { data: { error: 'La contraseña actual no es correcta.' } } })

    const wrapper = await mountProfile()
    await wrapper.findAll('button').at(-1).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('La contraseña actual no es correcta.')
  })
})

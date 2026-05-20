import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginView from '@/views/LoginView.vue'
import http from '@/services/http'

const go = vi.fn()
const toastAdd = vi.fn()

vi.mock('@/services/http', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('@/composables/useNavigation', () => ({
  useNavigation: () => ({ go }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key }),
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAdd }),
}))

const ButtonStub = {
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
}

const InputTextStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}

const PasswordStub = InputTextStub

const mountLogin = () => mount(LoginView, {
  props: {
    config: { darkMode: false, colorAcento: '#ea580c' },
    isLoggedIn: false,
  },
  global: {
    stubs: {
      Button: ButtonStub,
      InputText: InputTextStub,
      Password: PasswordStub,
      Dialog: { template: '<div><slot /></div>' },
    },
  },
})

describe('LoginView', () => {
  beforeEach(() => {
    go.mockReset()
    http.post.mockReset()
  })

  it('redirects to tabhub when a token already exists', () => {
    localStorage.setItem('token', 'existing-token')

    mountLogin()

    expect(go).toHaveBeenCalledWith('/tabhub')
  })

  it('stores the JWT and emits auth update on successful login', async () => {
    http.post.mockResolvedValueOnce({
      data: {
        token: 'new-token',
        showTwoFactorPrompt: false,
        user: { id: 1, email: 'user@example.test' },
      },
    })

    const wrapper = mountLogin()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('user@example.test')
    await inputs[1].setValue('HomeTab2026!Test')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith('/login_check', {
      username: 'user@example.test',
      password: 'HomeTab2026!Test',
    })
    expect(localStorage.getItem('token')).toBe('new-token')
    expect(wrapper.emitted('update-auth')).toBeTruthy()
    expect(go).toHaveBeenCalledWith('/tabhub')
  })

  it('shows an error when login fails', async () => {
    http.post.mockRejectedValueOnce({ response: { status: 401 } })

    const wrapper = mountLogin()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('¡Ops! Email o contraseña incorrectos.')
  })

  it('asks for a 2FA code when login requires verification', async () => {
    http.post.mockResolvedValueOnce({
      data: {
        requiresTwoFactor: true,
        challengeId: 'challenge-1',
        message: 'Codigo enviado',
      },
    })

    const wrapper = mountLogin()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('user@example.test')
    await inputs[1].setValue('HomeTab2026!Test')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Codigo enviado')
    expect(wrapper.text()).toContain('auth.verifyCode')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('verifies the 2FA login code and completes login', async () => {
    http.post
      .mockResolvedValueOnce({
        data: {
          requiresTwoFactor: true,
          challengeId: 'challenge-2',
        },
      })
      .mockResolvedValueOnce({
        data: {
          token: 'verified-token',
          showTwoFactorPrompt: false,
          user: { id: 1, email: 'user@example.test' },
        },
      })

    const wrapper = mountLogin()
    let inputs = wrapper.findAll('input')
    await inputs[0].setValue('user@example.test')
    await inputs[1].setValue('HomeTab2026!Test')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    inputs = wrapper.findAll('input')
    await inputs[0].setValue('123456')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(http.post).toHaveBeenLastCalledWith('/login/verify', {
      challengeId: 'challenge-2',
      code: '123456',
    })
    expect(localStorage.getItem('token')).toBe('verified-token')
    expect(go).toHaveBeenCalledWith('/tabhub')
  })

  it('can start, verify or skip 2FA activation after login', async () => {
    http.post
      .mockResolvedValueOnce({
        data: {
          token: 'prompt-token',
          showTwoFactorPrompt: true,
          user: { id: 1, email: 'user@example.test' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          challengeId: 'enable-challenge',
          message: 'Activa 2FA',
        },
      })
      .mockResolvedValueOnce({ data: { twoFactorEnabled: true } })

    const wrapper = mountLogin()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('auth.enable2fa')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenLastCalledWith('/2fa/enable/start')

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('654321')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(http.post).toHaveBeenLastCalledWith('/2fa/enable/verify', {
      challengeId: 'enable-challenge',
      code: '654321',
    })
    expect(go).toHaveBeenCalledWith('/tabhub')
  })
})

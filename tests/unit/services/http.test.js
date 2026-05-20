import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('http service', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('uses the local backend API when no VITE_API_URL is configured', async () => {
    const { default: http } = await import('@/services/http')

    expect(http.defaults.baseURL).toBe('http://localhost:8000/api')
  })

  it('injects JWT tokens into outgoing requests', async () => {
    const { default: http } = await import('@/services/http')
    localStorage.setItem('token', 'jwt-token')

    const config = await http.interceptors.request.handlers[0].fulfilled({ headers: {} })

    expect(config.headers.Authorization).toBe('Bearer jwt-token')
  })

  it('resolves upload asset URLs against the backend in local development', async () => {
    const { assetUrl } = await import('@/services/http')

    expect(assetUrl('/uploads/avatar.png')).toBe('http://localhost:8000/uploads/avatar.png')
    expect(assetUrl('https://cdn.example.test/image.png')).toBe('https://cdn.example.test/image.png')
  })
})

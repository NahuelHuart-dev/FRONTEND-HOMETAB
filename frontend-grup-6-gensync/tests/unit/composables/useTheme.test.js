import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

describe('useTheme', () => {
  it('applies dark mode and accent CSS variables', async () => {
    const config = ref({ darkMode: true, colorAcento: '#16a34a' })

    useTheme(config)
    await nextTick()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#16a34a')

    config.value.darkMode = false
    config.value.colorAcento = '#2563eb'
    await nextTick()

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#2563eb')
  })
})

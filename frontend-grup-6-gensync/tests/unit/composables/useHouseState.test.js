import { describe, expect, it } from 'vitest'
import { useHouseState } from '@/composables/useHouseState'

describe('useHouseState', () => {
  it('tracks active household context and clears chat state on exit', () => {
    const state = useHouseState()

    state.setHouseData(7, [{ id: 'tasks', label: 'Tareas' }], 'Casa Test')
    state.openChat()

    expect(state.isInsideHouse.value).toBe(true)
    expect(state.currentHomeId.value).toBe(7)
    expect(state.currentHouseName.value).toBe('Casa Test')
    expect(state.isChatOpen.value).toBe(true)

    state.clearHouseData()

    expect(state.isInsideHouse.value).toBe(false)
    expect(state.currentHomeId.value).toBe(null)
    expect(state.houseTabs.value).toEqual([])
    expect(state.isChatOpen.value).toBe(false)
  })
})

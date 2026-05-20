import { ref, computed } from 'vue'

const currentHomeId = ref(null)
const currentHouseName = ref('')
const houseTabs = ref([])
const isChatOpen = ref(false)

export function useHouseState() {
  const isInsideHouse = computed(() => !!currentHomeId.value)

  const setHouseData = (id, tabs, name = '') => {
    currentHomeId.value = id
    houseTabs.value = tabs
    currentHouseName.value = name
  }

  const clearHouseData = () => {
    currentHomeId.value = null
    currentHouseName.value = ''
    houseTabs.value = []
    isChatOpen.value = false
  }

  const toggleChat = () => {
    isChatOpen.value = !isChatOpen.value
  }

  const openChat = () => {
    isChatOpen.value = true
  }

  const closeChat = () => {
    isChatOpen.value = false
  }

  return {
    currentHomeId,
    currentHouseName,
    houseTabs,
    isInsideHouse,
    isChatOpen,
    setHouseData,
    clearHouseData,
    toggleChat,
    openChat,
    closeChat
  }
}

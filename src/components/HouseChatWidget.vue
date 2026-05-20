<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import http, { assetUrl } from '@/services/http'
import { useHouseState } from '@/composables/useHouseState'

defineProps({
  user: { type: Object, default: null }
})

const { isChatOpen, currentHomeId, closeChat } = useHouseState()
const { t } = useI18n()
const router = useRouter()

const view = ref('houses')
const loading = ref(false)
const error = ref('')
const houses = ref([])
const selectedHouse = ref(null)
const messages = ref([])
const draft = ref('')
const typers = ref([])
const imageData = ref('')
const imageInput = ref(null)
const attachMenuOpen = ref(false)
const youtubePickerOpen = ref(false)
const youtubeLoading = ref(false)
const youtubePlaylists = ref([])
const youtubeSelectedPlaylistId = ref(null)
const youtubeError = ref('')
const readPanelPosition = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('hometab_vue_chat_pos') || 'null')
    if (!saved || typeof saved.left !== 'number' || typeof saved.top !== 'number') return null

    const panelWidth = Math.min(460, window.innerWidth - 32)
    const panelHeight = Math.min(680, window.innerHeight - 140)

    return {
      left: Math.max(12, Math.min(window.innerWidth - panelWidth - 12, saved.left)),
      top: Math.max(12, Math.min(window.innerHeight - panelHeight - 12, saved.top))
    }
  } catch {
    localStorage.removeItem('hometab_vue_chat_pos')
    return null
  }
}

const panelPosition = ref(readPanelPosition())
const isSending = ref(false)
let pollTimer = null
let typingTimer = null
let typingSentAt = 0

const stopPolling = () => {
  if (pollTimer) clearInterval(pollTimer)
  if (typingTimer) clearInterval(typingTimer)
  pollTimer = null
  typingTimer = null
}

const formatTime = (raw) => {
  if (!raw) return ''
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(raw))
}

const scrollBottom = async () => {
  await nextTick()
  const el = document.querySelector('[data-vue-chat-messages]')
  if (el) el.scrollTop = el.scrollHeight
}

const loadHouses = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await http.get('/chat/households')
    houses.value = response.data
  } catch (err) {
    error.value = err.response?.data?.error || t('chat.noHouses')
  } finally {
    loading.value = false
  }
}

const loadMessages = async (after = false) => {
  if (!selectedHouse.value) return
  const lastId = messages.value[messages.value.length - 1]?.id
  const query = after && lastId ? { afterId: lastId } : { limit: 50 }
  const response = await http.get(`/households/${selectedHouse.value.id}/chat/messages`, { params: query })
  const merged = after ? [...messages.value, ...response.data] : response.data
  const seen = new Set()
  messages.value = merged.filter((message) => {
    if (!message?.id || seen.has(message.id)) return false
    seen.add(message.id)
    return true
  })
  if (!after || response.data.length) scrollBottom()
}

const loadTyping = async () => {
  if (!selectedHouse.value) return
  const response = await http.get(`/households/${selectedHouse.value.id}/chat/typing`)
  typers.value = response.data.typing || []
}

const selectedYoutubePlaylist = computed(() =>
  youtubePlaylists.value.find((playlist) => playlist.id === youtubeSelectedPlaylistId.value) || youtubePlaylists.value[0] || null
)

const markTyping = () => {
  if (!selectedHouse.value) return
  const now = Date.now()
  if (now - typingSentAt < 2000) return
  typingSentAt = now
  http.post(`/households/${selectedHouse.value.id}/chat/typing`, {}).catch(() => {})
}

watch(isChatOpen, async (newVal) => {
  if (newVal) {
    if (currentHomeId.value) {
      enterHouse({ id: currentHomeId.value, name: 'Chat de la casa' })
    } else {
      view.value = 'houses'
      selectedHouse.value = null
      stopPolling()
      await loadHouses()
    }
  } else {
    stopPolling()
  }
})

const enterHouse = async (house) => {
  selectedHouse.value = house
  view.value = 'room'
  error.value = ''
  loading.value = true
  messages.value = []
  attachMenuOpen.value = false
  youtubePickerOpen.value = false
  youtubePlaylists.value = []
  youtubeSelectedPlaylistId.value = null
  try {
    await loadMessages(false)
    stopPolling()
    pollTimer = setInterval(() => loadMessages(true).catch(() => {}), 4000)
    typingTimer = setInterval(() => loadTyping().catch(() => {}), 2500)
  } catch (err) {
    error.value = err.response?.data?.error || t('chat.noHouses')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  selectedHouse.value = null
  view.value = 'houses'
  messages.value = []
  stopPolling()
  loadHouses()
}

const addEmoji = (emoji) => {
  draft.value += emoji
}

const openAttachMenu = () => {
  attachMenuOpen.value = !attachMenuOpen.value
  if (!attachMenuOpen.value) youtubePickerOpen.value = false
}

const choosePhotoAttachment = () => {
  attachMenuOpen.value = false
  youtubePickerOpen.value = false
  imageInput.value?.click()
}

const loadYoutubePlaylists = async () => {
  if (!selectedHouse.value || youtubeLoading.value) return
  youtubeLoading.value = true
  youtubeError.value = ''
  try {
    const response = await http.get(`/households/${selectedHouse.value.id}/multimedia/playlists`)
    youtubePlaylists.value = response.data.playlists || []
    youtubeSelectedPlaylistId.value = youtubePlaylists.value[0]?.id || null
  } catch (err) {
    youtubeError.value = err.response?.data?.error || t('chat.youtubeLoadError')
  } finally {
    youtubeLoading.value = false
  }
}

const chooseYoutubeAttachment = async () => {
  attachMenuOpen.value = false
  youtubePickerOpen.value = true
  if (!youtubePlaylists.value.length) await loadYoutubePlaylists()
}

const handleImage = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    error.value = t('chat.imageInvalid')
    event.target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    imageData.value = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

const clearImage = () => {
  imageData.value = ''
  if (imageInput.value) imageInput.value.value = ''
}

const sendMessage = async () => {
  const content = draft.value.trim()
  if ((!content && !imageData.value) || !selectedHouse.value || isSending.value) return
  isSending.value = true
  draft.value = ''
  const imagePayload = imageData.value
  clearImage()
  try {
    const response = await http.post(`/households/${selectedHouse.value.id}/chat/messages`, { content, imageData: imagePayload || null })
    if (!messages.value.some((message) => message.id === response.data.chatMessage.id)) {
      messages.value.push(response.data.chatMessage)
    }
    scrollBottom()
  } catch (err) {
    error.value = err.response?.data?.error || t('feedback.error')
    draft.value = content
    imageData.value = imagePayload
  } finally {
    isSending.value = false
  }
}

const mediaMessagePayload = (message) => {
  const raw = String(message?.content || '')
  if (!raw.startsWith('HT_MEDIA::')) return null
  try {
    return JSON.parse(raw.slice('HT_MEDIA::'.length))
  } catch {
    return null
  }
}

const sendMediaReference = async (payload) => {
  if (!selectedHouse.value || isSending.value) return
  isSending.value = true
  youtubePickerOpen.value = false
  try {
    const response = await http.post(`/households/${selectedHouse.value.id}/chat/messages`, {
      content: `HT_MEDIA::${JSON.stringify(payload)}`,
    })
    if (!messages.value.some((message) => message.id === response.data.chatMessage.id)) {
      messages.value.push(response.data.chatMessage)
    }
    scrollBottom()
  } catch (err) {
    error.value = err.response?.data?.error || t('feedback.error')
  } finally {
    isSending.value = false
  }
}

const sharePlaylist = (playlist) => {
  if (!playlist || !selectedHouse.value) return
  sendMediaReference({
    type: 'playlist',
    houseId: Number(selectedHouse.value.id),
    playlistId: playlist.id,
    title: playlist.name,
    subtitle: `${playlist.videos?.length || 0} ${t('multimedia.videos')}`,
  })
}

const shareVideo = (playlist, video) => {
  if (!playlist || !video || !selectedHouse.value) return
  sendMediaReference({
    type: 'video',
    houseId: Number(selectedHouse.value.id),
    playlistId: playlist.id,
    videoId: video.id,
    youtubeId: video.youtubeId,
    title: video.title,
    subtitle: playlist.name,
    thumbnailUrl: video.thumbnailUrl,
  })
}

const openMediaReference = (payload) => {
  if (!payload?.houseId || !payload?.playlistId) return
  router.push({
    path: `/households/${payload.houseId}/multimedia`,
    query: {
      playlist: payload.playlistId,
      ...(payload.videoId ? { video: payload.videoId } : {}),
    },
  })
  closeChat()
}

const typingText = () => {
  const names = typers.value.map((user) => user.fullName).filter(Boolean)
  if (!names.length) return ''
  return names.length === 1 ? `${names[0]} está escribiendo...` : `${names.join(', ')} están escribiendo...`
}

const startDrag = (event) => {
  if (event.target.closest('button') || window.innerWidth <= 768) return
  const panel = event.currentTarget.closest('.house-chat-panel')
  if (!panel) return
  const rect = panel.getBoundingClientRect()
  const start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
  const move = (moveEvent) => {
    const maxLeft = window.innerWidth - rect.width - 12
    const maxTop = window.innerHeight - rect.height - 12
    panelPosition.value = {
      left: Math.max(12, Math.min(maxLeft, start.left + moveEvent.clientX - start.x)),
      top: Math.max(12, Math.min(maxTop, start.top + moveEvent.clientY - start.y))
    }
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    localStorage.setItem('hometab_vue_chat_pos', JSON.stringify(panelPosition.value))
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

onBeforeUnmount(stopPolling)
</script>

<template>
  <section class="house-chat-widget">
    <button class="house-chat-fab" :class="{ active: isChatOpen }" type="button" :aria-label="t('chat.open')" @click="isChatOpen = !isChatOpen">
      <i class="pi pi-comments"></i>
    </button>

    <transition name="slide-up">
      <div
        v-if="isChatOpen"
        class="house-chat-panel"
        :style="panelPosition ? { position: 'fixed', left: panelPosition.left + 'px', top: panelPosition.top + 'px', right: 'auto', bottom: 'auto' } : null"
      >
        <header class="house-chat-head" @pointerdown="startDrag">
          <button v-if="view === 'room' && !currentHomeId" class="chat-icon-btn" type="button" aria-label="Volver" @click="goBack">
            <i class="pi pi-arrow-left"></i>
          </button>
          <span v-else></span>
          <div>
            <strong>{{ view === 'room' ? selectedHouse?.name : t('chat.title') }}</strong>
            <small>{{ view === 'room' ? t('chat.group') : t('chat.yourHouses') }}</small>
          </div>
          <button class="chat-icon-btn" type="button" aria-label="Cerrar" @click="closeChat">
            <i class="pi pi-times"></i>
          </button>
        </header>

      <main v-if="view === 'houses'" class="house-chat-houses">
        <p v-if="loading" class="chat-note">{{ t('chat.loadingHouses') }}</p>
        <p v-else-if="error" class="chat-note">{{ error }}</p>
        <p v-else-if="!houses.length" class="chat-note">{{ t('chat.noHouses') }}</p>
        <button v-for="house in houses" :key="house.id" class="house-chat-house" type="button" @click="enterHouse(house)">
          <span class="pi pi-home"></span>
          <span>
            <strong>{{ house.name }}</strong>
            <small>{{ house.messageCount || 0 }} {{ t('chat.messages') }}</small>
          </span>
          <i class="pi pi-chevron-right"></i>
        </button>
      </main>

      <main v-else class="house-chat-room">
        <div class="house-chat-messages" data-vue-chat-messages>
          <p v-if="loading" class="chat-note">{{ t('chat.loadingMessages') }}</p>
          <p v-else-if="error" class="chat-note">{{ error }}</p>
          <p v-else-if="!messages.length" class="chat-note">{{ t('chat.empty') }}</p>
          <article
            v-for="message in messages"
            :key="message.id"
            class="house-chat-message"
            :class="{ own: Number(message.sender?.id) === Number(user?.id) }"
          >
            <div class="house-chat-bubble">
              <strong>{{ message.sender?.fullName }}</strong>
              <button v-if="mediaMessagePayload(message)" class="chat-media-card" type="button" @click="openMediaReference(mediaMessagePayload(message))">
                <img v-if="mediaMessagePayload(message).thumbnailUrl" :src="mediaMessagePayload(message).thumbnailUrl" alt="" />
                <span class="chat-media-icon" v-else><i class="pi pi-youtube"></i></span>
                <span>
                  <small>{{ mediaMessagePayload(message).type === 'video' ? t('chat.youtubeVideo') : t('chat.youtubePlaylist') }}</small>
                  <strong>{{ mediaMessagePayload(message).title }}</strong>
                  <em>{{ mediaMessagePayload(message).subtitle }}</em>
                </span>
                <i class="pi pi-arrow-up-right"></i>
              </button>
              <template v-else>
                <img v-if="message.imagePath" class="chat-image" :src="assetUrl(message.imagePath)" alt="" />
                <p>{{ message.content }}</p>
              </template>
              <time>{{ formatTime(message.createdAt) }}</time>
            </div>
          </article>
        </div>

        <div v-if="typingText()" class="house-chat-typing">{{ typingText() }}</div>

        <form class="house-chat-compose" @submit.prevent="sendMessage">
          <div class="house-chat-emojis">
            <button v-for="emoji in ['😊', '😂', '❤️', '👍', '🙏', '🎉']" :key="emoji" type="button" @click="addEmoji(emoji)">
              {{ emoji }}
            </button>
          </div>
          <div class="house-chat-input-row">
            <div class="chat-attach-wrap">
              <button class="chat-attach-btn" type="button" :aria-label="t('chat.attach')" @click="openAttachMenu">
                <i class="pi pi-paperclip"></i>
              </button>
              <div v-if="attachMenuOpen" class="chat-attach-menu">
                <button type="button" @click="choosePhotoAttachment"><i class="pi pi-image"></i>{{ t('chat.photo') }}</button>
                <button type="button" @click="chooseYoutubeAttachment"><i class="pi pi-youtube"></i>{{ t('chat.youtube') }}</button>
              </div>
            </div>
            <input ref="imageInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="handleImage" />
            <textarea v-model="draft" maxlength="1000" rows="1" :placeholder="t('chat.write')" @input="markTyping" />
            <button type="submit" :aria-label="t('chat.send')" :disabled="isSending"><i class="pi pi-send"></i></button>
          </div>
          <section v-if="youtubePickerOpen" class="chat-youtube-picker">
            <header>
              <strong>{{ t('chat.shareYoutube') }}</strong>
              <button type="button" @click="youtubePickerOpen = false"><i class="pi pi-times"></i></button>
            </header>
            <p v-if="youtubeLoading" class="chat-note">{{ t('common.loading') }}</p>
            <p v-else-if="youtubeError" class="chat-note">{{ youtubeError }}</p>
            <p v-else-if="!youtubePlaylists.length" class="chat-note">{{ t('chat.noPlaylists') }}</p>
            <template v-else>
              <select v-model="youtubeSelectedPlaylistId" class="chat-youtube-select">
                <option v-for="playlist in youtubePlaylists" :key="playlist.id" :value="playlist.id">{{ playlist.name }}</option>
              </select>
              <button class="chat-youtube-share" type="button" @click="sharePlaylist(selectedYoutubePlaylist)">
                <i class="pi pi-list"></i>{{ t('chat.sharePlaylist') }}
              </button>
              <div class="chat-youtube-videos">
                <button v-for="video in selectedYoutubePlaylist?.videos || []" :key="video.id" type="button" @click="shareVideo(selectedYoutubePlaylist, video)">
                  <img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" alt="" />
                  <span>
                    <strong>{{ video.title }}</strong>
                    <small>{{ t('chat.shareVideo') }}</small>
                  </span>
                </button>
              </div>
            </template>
          </section>
          <div v-if="imageData" class="chat-image-preview">
            <img :src="imageData" alt="" />
            <button type="button" @click="clearImage"><i class="pi pi-times"></i></button>
          </div>
        </form>
      </main>
      </div>
    </transition>
  </section>
</template>

<style scoped>
.house-chat-widget {
  position: fixed;
  right: 30px;
  bottom: 102px;
  z-index: 360;
}

.house-chat-fab {
  width: 64px;
  height: 56px;
  border: 0;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent, #fff);
  box-shadow: var(--shadow-md);
  font-size: 1.35rem;
  transition: transform var(--duration-base) var(--ease-bounce), box-shadow var(--duration-base);
}

.house-chat-fab:hover,
.house-chat-fab.active {
  transform: scale(1.06);
  box-shadow: 0 18px 38px rgba(var(--color-accent-rgb), 0.28);
}

.house-chat-panel {
  position: absolute;
  right: 0;
  bottom: 72px;
  width: min(460px, calc(100vw - 32px));
  height: min(680px, calc(100vh - 140px));
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid var(--accent-border);
  border-radius: 26px;
  background: color-mix(in srgb, var(--color-bg) 82%, transparent);
  color: var(--color-text);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(22px);
}

.house-chat-head {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border-strong);
  background: linear-gradient(135deg, var(--accent-bg), transparent);
  cursor: grab;
}

.house-chat-head:active {
  cursor: grabbing;
}

.house-chat-head strong,
.house-chat-head small {
  display: block;
}

.house-chat-head small {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.chat-icon-btn {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-muted);
}

.chat-icon-btn:hover {
  background: var(--accent-bg);
  color: var(--color-accent);
}

.house-chat-houses {
  overflow-y: auto;
  padding: var(--space-4);
}

.house-chat-house {
  width: 100%;
  display: grid;
  grid-template-columns: 42px 1fr 18px;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--accent-border);
  border-radius: 16px;
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
}

.house-chat-house:hover {
  border-color: var(--color-accent);
  background: var(--accent-bg);
}

.house-chat-house > .pi-home {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--accent-bg-icon);
  color: var(--color-accent);
}

.house-chat-house small {
  display: block;
  color: var(--color-text-muted);
}

.house-chat-room {
  min-height: 0;
  display: grid;
  grid-template-rows: 1fr auto;
}

.house-chat-messages {
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.house-chat-message {
  display: flex;
}

.house-chat-message.own {
  justify-content: flex-end;
}

.house-chat-bubble {
  max-width: 82%;
  padding: 0.78rem 0.92rem 0.52rem;
  border-radius: 20px;
  border-bottom-left-radius: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.house-chat-message.own .house-chat-bubble {
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 6px;
  background: var(--color-accent);
  color: var(--color-on-accent, #fff);
  border-color: var(--color-accent);
}

.house-chat-bubble strong {
  display: block;
  margin-bottom: 0.2rem;
  font-size: var(--text-xs);
}

.house-chat-message.own .house-chat-bubble strong {
  color: currentColor;
  opacity: 0.82;
}

.house-chat-message:not(.own) .house-chat-bubble strong {
  color: var(--color-accent);
}

.house-chat-bubble p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.4;
}

.house-chat-bubble time {
  display: block;
  margin-top: 0.3rem;
  text-align: right;
  font-size: 0.68rem;
  opacity: 0.7;
}

.house-chat-compose {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border-strong);
  background: var(--color-drawer-bg);
}

.house-chat-emojis {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.house-chat-emojis button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-bg);
}

.house-chat-input-row {
  display: grid;
  grid-template-columns: 42px 1fr 46px;
  gap: var(--space-2);
  align-items: end;
}

.house-chat-input-row textarea {
  min-height: 46px;
  max-height: 120px;
  resize: none;
  border: 1px solid var(--accent-border);
  border-radius: 18px;
  padding: 0.75rem 0.9rem;
  font: inherit;
  background: var(--color-input-bg);
  color: var(--color-text);
}

.house-chat-input-row button {
  width: 46px;
  height: 46px;
  border: 0;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent, #fff);
}

.house-chat-input-row .chat-attach-btn {
  width: 42px;
  background: var(--accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--accent-border);
}

.chat-attach-wrap {
  position: relative;
}

.chat-attach-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  min-width: 170px;
  padding: var(--space-2);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  display: grid;
  gap: var(--space-1);
  z-index: 2;
}

.chat-attach-menu button {
  width: 100%;
  min-height: 38px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-2);
  padding: 0 var(--space-2);
}

.chat-attach-menu button:hover {
  background: var(--accent-bg);
  color: var(--color-accent);
}

.chat-media-card {
  width: 100%;
  border: 1px solid var(--accent-border);
  border-radius: 16px;
  background: var(--accent-bg-subtle);
  color: inherit;
  display: grid;
  grid-template-columns: 72px 1fr 20px;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2);
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.chat-media-card img,
.chat-media-icon {
  width: 72px;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: rgba(255, 0, 0, .12);
  color: #ef4444;
  display: grid;
  place-items: center;
}

.chat-media-card span {
  min-width: 0;
}

.chat-media-card small,
.chat-media-card em {
  display: block;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-style: normal;
}

.chat-media-card strong {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-youtube-picker {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border: 1px dashed var(--accent-border);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-2);
}

.chat-youtube-picker header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-youtube-picker header button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-bg);
  color: var(--color-accent);
}

.chat-youtube-select {
  width: 100%;
  min-height: 38px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--color-input-bg);
  color: var(--color-text);
  padding: 0 var(--space-2);
}

.chat-youtube-share,
.chat-youtube-videos button {
  width: 100%;
  min-height: 38px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--color-input-bg);
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  text-align: left;
}

.chat-youtube-share:hover,
.chat-youtube-videos button:hover {
  border-color: var(--color-accent);
  background: var(--accent-bg);
}

.chat-youtube-videos {
  display: grid;
  gap: var(--space-2);
  max-height: 170px;
  overflow-y: auto;
}

.chat-youtube-videos img {
  width: 64px;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.chat-youtube-videos span {
  min-width: 0;
}

.chat-youtube-videos strong,
.chat-youtube-videos small {
  display: block;
}

.chat-youtube-videos strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-youtube-videos small {
  color: var(--color-text-muted);
}

.chat-image {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 14px;
  margin: .25rem 0 .4rem;
  display: block;
}

.chat-image-preview {
  margin-top: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: .35rem;
  border: 1px dashed var(--accent-border);
  border-radius: var(--radius-md);
}

.chat-image-preview img {
  width: 72px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.chat-image-preview button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-bg);
  color: var(--color-accent);
}

.chat-note {
  margin: 0;
  padding: var(--space-3);
  border: 1px dashed var(--accent-border);
  border-radius: 14px;
  color: var(--color-text-muted);
}

.house-chat-typing {
  padding: 0 var(--space-5) var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

@media (max-width: 768px) {
  .house-chat-fab {
    display: none;
  }

  .house-chat-panel {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: var(--bottom-nav-height, 60px) !important;
    width: 100% !important;
    height: calc(100vh - var(--bottom-nav-height, 60px) - 56px) !important;
    top: auto !important;
    border-radius: 20px 20px 0 0;
    border-bottom: none;
  }
}

/* Transición para efecto cortina en móvil y fade en desktop */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (max-width: 768px) {
  .slide-up-enter-from,
  .slide-up-leave-to {
    opacity: 1;
    transform: translateY(100%);
  }
}
</style>

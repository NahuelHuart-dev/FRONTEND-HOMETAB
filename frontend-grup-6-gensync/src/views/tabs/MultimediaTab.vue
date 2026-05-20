<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import http, { assetUrl } from '@/services/http'

const props = defineProps(['config', 'homeId'])
const { t } = useI18n()
const route = useRoute()

const loading = ref(true)
const playlists = ref([])
const playlistName = ref('')
const selectedPlaylistId = ref(null)
const videoUrl = ref('')
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const highlightedVideoId = ref(null)

const selectedPlaylist = computed(() => playlists.value.find((playlist) => playlist.id === selectedPlaylistId.value) || playlists.value[0] || null)

const iconClass = (icon) => {
  if (!icon) return 'pi pi-user'
  return icon.startsWith('pi ') ? icon : `pi ${icon}`
}

const loadPlaylists = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await http.get(`/households/${props.homeId}/multimedia/playlists`)
    playlists.value = response.data.playlists || []
    applyRouteSelection()
  } catch (err) {
    error.value = err.response?.data?.error || t('multimedia.loadError')
  } finally {
    loading.value = false
  }
}

const applyRouteSelection = () => {
  const playlistId = Number(route.query.playlist)
  const videoId = Number(route.query.video)
  selectedPlaylistId.value = playlists.value.some((playlist) => Number(playlist.id) === playlistId)
    ? playlistId
    : playlists.value[0]?.id || null
  highlightedVideoId.value = Number.isFinite(videoId) && videoId > 0 ? videoId : null
}

const showSuccess = (message) => {
  success.value = message
  setTimeout(() => { success.value = '' }, 2600)
}

const createPlaylist = async () => {
  const name = playlistName.value.trim()
  if (!name || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const response = await http.post(`/households/${props.homeId}/multimedia/playlists`, { name })
    playlists.value.unshift(response.data.playlist)
    selectedPlaylistId.value = response.data.playlist.id
    playlistName.value = ''
    showSuccess(t('multimedia.playlistCreated'))
  } catch (err) {
    error.value = err.response?.data?.error || t('multimedia.saveError')
  } finally {
    saving.value = false
  }
}

const addVideo = async (video) => {
  if (!selectedPlaylist.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const payload = video?.youtubeId ? video : { url: videoUrl.value.trim() }
    const response = await http.post(`/households/${props.homeId}/multimedia/playlists/${selectedPlaylist.value.id}/videos`, payload)
    selectedPlaylist.value.videos.push(response.data.video)
    videoUrl.value = ''
    showSuccess(t('multimedia.videoAdded'))
  } catch (err) {
    error.value = err.response?.data?.error || t('multimedia.saveError')
  } finally {
    saving.value = false
  }
}

const searchVideos = async () => {
  const q = searchQuery.value.trim()
  if (q.length < 2 || searching.value) return
  searching.value = true
  error.value = ''
  try {
    const response = await http.get(`/households/${props.homeId}/multimedia/search`, { params: { q } })
    searchResults.value = response.data.videos || []
  } catch (err) {
    error.value = err.response?.data?.error || t('multimedia.searchError')
  } finally {
    searching.value = false
  }
}

onMounted(loadPlaylists)
watch(() => [route.query.playlist, route.query.video], applyRouteSelection)
</script>

<template>
  <div class="multimedia-tab">
    <header class="tab-header">
      <div class="header-title">
        <i class="pi pi-youtube icon-header" :style="{ color: config.colorAcento, backgroundColor: config.colorAcento + '20' }"></i>
        <div>
          <h2>{{ t('multimedia.title') }}</h2>
          <p>{{ t('multimedia.subtitle') }}</p>
        </div>
      </div>
    </header>

    <div v-if="loading" class="media-note">{{ t('common.loading') }}</div>
    <div v-else class="media-layout">
      <aside class="playlist-panel">
        <form class="playlist-form" @submit.prevent="createPlaylist">
          <label>
            {{ t('multimedia.newPlaylist') }}
            <input v-model="playlistName" class="media-input" :placeholder="t('multimedia.playlistName')" maxlength="120">
          </label>
          <button class="media-primary" type="submit" :disabled="saving || !playlistName.trim()">
            <i class="pi pi-plus"></i>{{ t('common.create') }}
          </button>
        </form>

        <div class="playlist-list">
          <button
            v-for="playlist in playlists"
            :key="playlist.id"
            type="button"
            class="playlist-pill"
            :class="{ active: selectedPlaylist?.id === playlist.id }"
            @click="selectedPlaylistId = playlist.id"
          >
            <span>{{ playlist.name }}</span>
            <small>{{ playlist.videos.length }} {{ t('multimedia.videos') }}</small>
          </button>
        </div>
      </aside>

      <section class="media-main">
        <div v-if="error" class="media-alert error">{{ error }}</div>
        <div v-if="success" class="media-alert success">{{ success }}</div>

        <div v-if="!selectedPlaylist" class="empty-playlist">
          <i class="pi pi-youtube"></i>
          <h3>{{ t('multimedia.emptyTitle') }}</h3>
          <p>{{ t('multimedia.emptyText') }}</p>
        </div>

        <template v-else>
          <div class="playlist-head">
            <div>
              <span>{{ t('multimedia.playlist') }}</span>
              <h3>{{ selectedPlaylist.name }}</h3>
            </div>
            <div class="creator-chip">
              <img v-if="selectedPlaylist.createdBy?.avatar" :src="assetUrl(selectedPlaylist.createdBy.avatar)" alt="">
              <i v-else :class="iconClass(selectedPlaylist.createdBy?.avatarIcon)"></i>
              <span>{{ selectedPlaylist.createdBy?.fullName }}</span>
            </div>
          </div>

          <div class="add-video-grid">
            <form class="add-url-form" @submit.prevent="addVideo(null)">
              <label>
                {{ t('multimedia.addByUrl') }}
                <input v-model="videoUrl" class="media-input" placeholder="https://youtu.be/..." />
              </label>
              <button class="media-primary" type="submit" :disabled="saving || !videoUrl.trim()">
                <i class="pi pi-save"></i>{{ t('multimedia.saveVideo') }}
              </button>
            </form>

            <form class="search-form" @submit.prevent="searchVideos">
              <label>
                {{ t('multimedia.search') }}
                <input v-model="searchQuery" class="media-input" :placeholder="t('multimedia.searchPlaceholder')" />
              </label>
              <button class="media-secondary" type="submit" :disabled="searching || searchQuery.trim().length < 2">
                <i :class="searching ? 'pi pi-spin pi-spinner' : 'pi pi-search'"></i>{{ t('multimedia.searchButton') }}
              </button>
            </form>
          </div>

          <div v-if="searchResults.length" class="search-results">
            <article v-for="video in searchResults" :key="video.youtubeId" class="video-row">
              <img :src="video.thumbnailUrl" alt="">
              <div>
                <strong>{{ video.title }}</strong>
                <small>{{ video.channelTitle }}</small>
              </div>
              <button class="media-secondary" type="button" @click="addVideo(video)">
                <i class="pi pi-plus"></i>{{ t('multimedia.add') }}
              </button>
            </article>
          </div>

          <div class="video-grid">
            <article v-for="video in selectedPlaylist.videos" :key="video.id" class="video-card" :class="{ highlighted: Number(video.id) === Number(highlightedVideoId) }">
              <iframe :src="video.embedUrl" :title="video.title" allowfullscreen></iframe>
              <div class="video-meta">
                <strong>{{ video.title }}</strong>
                <small>{{ video.channelTitle }}</small>
                <span>{{ t('multimedia.addedBy') }} {{ video.addedBy?.fullName }}</span>
              </div>
            </article>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.multimedia-tab { animation: ht-fade-in .25s ease-out; }
.tab-header { margin-bottom: var(--space-5); }
.header-title { display: flex; align-items: center; gap: var(--space-3); }
.header-title h2 { margin: 0; font-size: var(--text-2xl); color: var(--color-text); }
.header-title p { margin: .2rem 0 0; color: var(--color-text-muted); }
.icon-header { font-size: 1.5rem; padding: .8rem; border-radius: var(--radius-md); }
.media-layout { display: grid; grid-template-columns: minmax(220px, 280px) 1fr; gap: var(--space-5); align-items: start; }
.playlist-panel, .media-main { border: 1px solid var(--accent-border); border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-surface) 88%, transparent); padding: var(--space-4); }
.playlist-form, .add-url-form, .search-form { display: grid; gap: var(--space-3); }
.playlist-form label, .add-url-form label, .search-form label { display: grid; gap: var(--space-2); font-weight: 700; color: var(--color-text); }
.media-input { width: 100%; min-height: 44px; border: 1px solid var(--accent-border); border-radius: var(--radius-sm); padding: 0 .9rem; background: var(--color-input-bg); color: var(--color-text); font: inherit; }
.media-primary, .media-secondary { min-height: 42px; border-radius: var(--radius-pill); border: 1px solid var(--color-accent); padding: 0 var(--space-3); font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); cursor: pointer; }
.media-primary { background: var(--color-accent); color: var(--color-on-accent, #fff); }
.media-secondary { background: transparent; color: var(--color-accent); }
.media-primary:disabled, .media-secondary:disabled { opacity: .45; cursor: not-allowed; }
.playlist-list { display: grid; gap: var(--space-2); margin-top: var(--space-4); }
.playlist-pill { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-input-bg); color: var(--color-text); padding: var(--space-3); text-align: left; display: grid; gap: .2rem; cursor: pointer; }
.playlist-pill.active { border-color: var(--color-accent); background: var(--accent-bg-subtle); }
.playlist-pill small, .video-meta small, .video-meta span { color: var(--color-text-muted); font-size: var(--text-xs); }
.playlist-head { display: flex; justify-content: space-between; gap: var(--space-4); align-items: center; margin-bottom: var(--space-4); }
.playlist-head span { color: var(--color-accent); font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; }
.playlist-head h3 { margin: 0; font-size: var(--text-xl); }
.creator-chip { display: inline-flex; align-items: center; gap: var(--space-2); border: 1px solid var(--accent-border); border-radius: var(--radius-pill); padding: .35rem .7rem; }
.creator-chip img, .creator-chip i { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; object-fit: cover; color: var(--color-accent); background: var(--accent-bg-subtle); }
.add-video-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4); }
.search-results, .video-grid { display: grid; gap: var(--space-3); }
.search-results { margin-bottom: var(--space-4); }
.video-row { display: grid; grid-template-columns: 116px 1fr auto; gap: var(--space-3); align-items: center; padding: var(--space-2); border: 1px dashed var(--accent-border); border-radius: var(--radius-md); }
.video-row img { width: 116px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--radius-sm); }
.video-row strong { display: block; font-size: var(--text-sm); }
.video-row small { color: var(--color-text-muted); }
.video-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.video-card { border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; background: var(--color-input-bg); }
.video-card.highlighted { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), .16); }
.video-card iframe { width: 100%; aspect-ratio: 16 / 9; border: 0; display: block; }
.video-meta { padding: var(--space-3); display: grid; gap: .2rem; }
.media-alert, .media-note, .empty-playlist { border: 1px dashed var(--accent-border); border-radius: var(--radius-md); padding: var(--space-4); color: var(--color-text-muted); }
.media-alert.error { color: #ef4444; border-color: rgba(239, 68, 68, .45); }
.media-alert.success { color: var(--color-accent); border-color: var(--color-accent); }
.empty-playlist { text-align: center; }
.empty-playlist i { font-size: 2rem; color: var(--color-accent); }
@media (max-width: 820px) {
  .media-layout, .add-video-grid { grid-template-columns: 1fr; }
  .video-row { grid-template-columns: 86px 1fr; }
  .video-row .media-secondary { grid-column: 1 / -1; }
}
</style>

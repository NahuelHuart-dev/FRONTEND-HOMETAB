<script setup>
/**
 * TabHubView.vue
 *
 * Vista "Mis Tabs" — listado de casas del usuario.
 *
 * CAMBIOS vs versión anterior:
 *   - PostItCard ya no recibe :config
 *   - Sin ternarios de color en el template (usan CSS vars)
 *   - Utilidades CSS movidas a clases globales
 *   - useNavigation en lugar de router local
 */
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import http, { assetUrl } from '@/services/http'
import PostItCard from '@/components/PostItCard.vue'
import { useNavigation } from '@/composables/useNavigation'

const props = defineProps(['config', 'isLoggedIn'])
const emit = defineEmits(['update-auth'])
const { go, router } = useNavigation()
const { t } = useI18n()
const toast = useToast()

const households = ref([])
const cargando   = ref(true)
const sortingMode = ref(false)
const draggedHouseId = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const dragChanged = ref(false)
const dragStarted = ref(false)
const savingOrder = ref(false)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// Modal — Crear casa
const mostrarModalCrear = ref(false)
const nuevaCasaNombre   = ref('')
const nuevaCasaIcono    = ref('pi-home')
const nuevaCasaAvatar   = ref('')
const creando           = ref(false)
const errorCrear        = ref('')
const householdIcons = ['pi-home', 'pi-building', 'pi-users', 'pi-heart', 'pi-star', 'pi-briefcase', 'pi-sparkles', 'pi-crown', 'pi-map-marker', 'pi-key']

// Modal — Unirse a casa
const mostrarModalUnirse  = ref(false)
const codigoInvitacion    = ref('')
const uniendo             = ref(false)
const errorUnirse         = ref('')

const cargarCasas = async () => {
  try {
    const response = await http.get('/households')
    households.value = response.data
  } catch (error) {
    console.error('Error cargando casas:', error)
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      emit('update-auth')
      go('/login')
    }
  } finally {
    cargando.value = false
  }
}

onMounted(cargarCasas)

const primeIcon = (icon) => {
  if (!icon) return 'pi pi-home'
  return icon.startsWith('pi ') ? icon : `pi ${icon}`
}

const uploadUrl = (path) => assetUrl(path)

const persistOrder = async () => {
  savingOrder.value = true
  try {
    await http.put('/households/order', { orderedIds: households.value.map(house => house.id) })
    toast.add({ severity: 'success', summary: 'Orden guardado', life: 1800 })
  } catch (error) {
    console.error('Error guardando orden:', error)
    toast.add({ severity: 'error', summary: 'No se pudo guardar el orden', life: 2600 })
    await cargarCasas()
  } finally {
    savingOrder.value = false
  }
}

const moveHouse = (fromIndex, toIndex) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
  const next = [...households.value]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  households.value = next
}

const openHouse = (houseId) => {
  if (sortingMode.value || dragStarted.value) return
  router.push(`/households/${houseId}`)
}

const toggleSortingMode = async () => {
  if (sortingMode.value && dragChanged.value) {
    await persistOrder()
    dragChanged.value = false
  }
  sortingMode.value = !sortingMode.value
}

const startSortDrag = (event, houseId) => {
  if (!sortingMode.value || savingOrder.value) return
  event.preventDefault()
  draggedHouseId.value = houseId
  dragOffset.value = { x: 0, y: 0 }
  dragStarted.value = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

const moveSortDrag = (event) => {
  if (!sortingMode.value || draggedHouseId.value === null) return

  dragOffset.value = {
    x: event.clientX - (event.currentTarget.dataset.startX || event.clientX),
    y: event.clientY - (event.currentTarget.dataset.startY || event.clientY),
  }

  const previousPointerEvents = event.currentTarget.style.pointerEvents
  event.currentTarget.style.pointerEvents = 'none'
  const target = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest('[data-house-id]')
  event.currentTarget.style.pointerEvents = previousPointerEvents

  if (!target) return
  const targetId = Number(target.dataset.houseId)
  if (!targetId || targetId === draggedHouseId.value) return

  const fromIndex = households.value.findIndex((house) => house.id === draggedHouseId.value)
  const toIndex = households.value.findIndex((house) => house.id === targetId)
  if (fromIndex === -1 || toIndex === -1) return

  moveHouse(fromIndex, toIndex)
  dragChanged.value = true
}

const endSortDrag = async (event) => {
  if (draggedHouseId.value === null) return
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  draggedHouseId.value = null
  dragOffset.value = { x: 0, y: 0 }
  window.setTimeout(() => {
    dragStarted.value = false
  }, 0)

  if (dragChanged.value) {
    await persistOrder()
    dragChanged.value = false
  }
}

const dragStyle = (houseId) => {
  if (draggedHouseId.value !== houseId) return null
  const visualX = clamp(dragOffset.value.x * 0.28, -34, 34)
  const visualY = clamp(dragOffset.value.y * 0.18, -22, 22)
  return {
    transform: `translate3d(${visualX}px, ${visualY}px, 0) scale(1.03)`,
  }
}

const handleAvatarFile = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    errorCrear.value = 'La imagen debe ser PNG, JPG o WEBP y pesar menos de 2MB.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    nuevaCasaAvatar.value = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

const resetCrearCasa = () => {
  nuevaCasaNombre.value = ''
  nuevaCasaIcono.value = 'pi-home'
  nuevaCasaAvatar.value = ''
  errorCrear.value = ''
}

const handleCrearCasa = async () => {
  if (!nuevaCasaNombre.value.trim()) { errorCrear.value = t('tabhub.requiredName'); return }
  creando.value = true; errorCrear.value = ''
  try {
    const response = await http.post('/households/new', {
      name: nuevaCasaNombre.value,
      avatarIcon: nuevaCasaIcono.value,
      avatarCropData: nuevaCasaAvatar.value || null
    })
    households.value.push(response.data.household)
    mostrarModalCrear.value = false
    resetCrearCasa()
  } catch (error) {
    console.error('Error creando casa:', error)
    errorCrear.value = error.response?.data?.error || t('tabhub.createError')
  } finally {
    creando.value = false
  }
}

const handleUnirseCasa = async () => {
  if (!codigoInvitacion.value.trim()) { errorUnirse.value = t('tabhub.requiredCode'); return }
  uniendo.value = true; errorUnirse.value = ''
  try {
    await http.post('/households/join', { code: codigoInvitacion.value })
    await cargarCasas()
    mostrarModalUnirse.value = false
    codigoInvitacion.value   = ''
  } catch (error) {
    console.error('Error al unirse:', error)
    errorUnirse.value = error.response?.data?.error || 'Error al intentar unirse a la casa.'
  } finally {
    uniendo.value = false
  }
}
</script>

<template>
  <div class="tabhub-container ht-container ht-fade-in">

    <div class="tabhub-heading">
      <div>
        <h1 class="tabhub-title">{{ t('tabhub.title') }}</h1>
        <p class="ht-text-muted tabhub-subtitle">{{ t('tabhub.subtitle') }}</p>
        <p class="ht-text-muted tabhub-hint">
          {{ sortingMode ? 'Arrastra tus tabs para ordenarlas' : 'Puedes ordenar las tabs como quieras' }}
        </p>
      </div>
    </div>

    <button type="button" class="sort-mode-button" :class="{ active: sortingMode }" @click="toggleSortingMode" :disabled="savingOrder">
      <i :class="sortingMode ? 'pi pi-check' : 'pi pi-arrows-alt'"></i>
      <span>{{ sortingMode ? 'Listo' : 'Ordenar' }}</span>
    </button>

    <!-- Estado de carga -->
    <div v-if="cargando" class="ht-loading-state">
      <i class="pi pi-spin pi-spinner" aria-label="Cargando..."></i>
      <p>{{ t('tabhub.loading') }}</p>
    </div>

    <!-- Grid de casas -->
    <div v-else class="postit-grid" :class="{ 'is-sorting': sortingMode }">
      <!--
        PostItCard ya no recibe :config.
        Los colores vienen de CSS vars gestionadas por useTheme.
      -->
      <div
        v-for="(house, index) in households"
        :key="house.id"
        class="house-sort-item"
        :data-house-id="house.id"
        :style="dragStyle(house.id)"
        :class="{ dragging: draggedHouseId === house.id, saving: savingOrder }"
        @pointerdown="startSortDrag($event, house.id); $event.currentTarget.dataset.startX = $event.clientX; $event.currentTarget.dataset.startY = $event.clientY"
        @pointermove="moveSortDrag"
        @pointerup="endSortDrag"
        @pointercancel="endSortDrag"
      >

        <PostItCard
          :titulo="house.name"
          :icono="primeIcon(house.avatarIcon)"
          :avatar="uploadUrl(house.avatar)"
          :rotacion="index % 2 === 0 ? 'left' : 'right'"
          variant="house"
          @click="openHouse(house.id)"
        />
      </div>

      <PostItCard
        :titulo="t('tabhub.createCard')"
        icono="pi pi-plus"
        rotacion="left"
        class="card-dashed"
        @click="mostrarModalCrear = true"
      />

      <PostItCard
        :titulo="t('tabhub.joinCard')"
        icono="pi pi-link"
        rotacion="right"
        class="card-dashed"
        @click="mostrarModalUnirse = true"
      />
    </div>

    <!-- ── MODAL CREAR CASA ── -->
    <Dialog v-model:visible="mostrarModalCrear" modal :header="t('tabhub.createTitle')" :style="{ width: '90%', maxWidth: '520px' }">
      <div class="modal-body">
        <p class="ht-text-muted ht-mb-4">
          {{ t('tabhub.createText') }}
        </p>
        <div class="ht-mb-4 ht-text-left">
          <label class="ht-block ht-mb-1 modal-label">{{ t('tabhub.name') }}</label>
          <InputText
            v-model="nuevaCasaNombre"
            class="ht-input ht-w-full"
            placeholder="Ej: Piso de Estudiantes BCN"
            @keyup.enter="handleCrearCasa"
          />
          <small v-if="errorCrear" class="ht-text-error">{{ errorCrear }}</small>
        </div>

        <div class="ht-mb-4 ht-text-left">
          <label class="ht-block ht-mb-2 modal-label">{{ t('tabhub.chooseIcon') }}</label>
          <div class="icon-picker">
            <button
              v-for="icon in householdIcons"
              :key="icon"
              type="button"
              class="icon-choice"
              :class="{ selected: nuevaCasaIcono === icon }"
              @click="nuevaCasaIcono = icon"
            >
              <i :class="primeIcon(icon)"></i>
            </button>
          </div>
        </div>

        <div class="ht-mb-4 ht-text-left">
          <label class="ht-block ht-mb-2 modal-label">{{ t('tabhub.photo') }}</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" @change="handleAvatarFile" />
          <div v-if="nuevaCasaAvatar" class="house-preview">
            <img :src="nuevaCasaAvatar" alt="" />
            <Button :label="t('tabhub.removePhoto')" text size="small" @click="nuevaCasaAvatar = ''" />
          </div>
        </div>

        <div class="modal-actions">
          <Button :label="t('tabhub.cancel')" text @click="mostrarModalCrear = false" class="btn-modal-cancel" />
          <Button :label="t('tabhub.createButton')" :loading="creando" @click="handleCrearCasa" class="btn-modal-confirm" />
        </div>
      </div>
    </Dialog>

    <!-- ── MODAL UNIRSE ── -->
    <Dialog v-model:visible="mostrarModalUnirse" modal :header="t('tabhub.joinTitle')" :style="{ width: '90%', maxWidth: '450px' }">
      <div class="modal-body">
        <p class="ht-text-muted ht-mb-4">
          {{ t('tabhub.joinText') }}
        </p>
        <div class="ht-mb-4 ht-text-left">
          <label class="ht-block ht-mb-1 modal-label">{{ t('tabhub.secretCode') }}</label>
          <InputText
            v-model="codigoInvitacion"
            class="ht-input ht-w-full"
            placeholder="Ej: HOME01"
            style="text-transform: uppercase;"
            @keyup.enter="handleUnirseCasa"
          />
          <small v-if="errorUnirse" class="ht-text-error">{{ errorUnirse }}</small>
        </div>
        <div class="modal-actions">
          <Button :label="t('tabhub.cancel')" text @click="mostrarModalUnirse = false" class="btn-modal-cancel" />
          <Button :label="t('tabhub.joinButton')" :loading="uniendo" @click="handleUnirseCasa" class="btn-modal-confirm" />
        </div>
      </div>
    </Dialog>

  </div>
</template>

<style scoped>
.tabhub-container {
  padding-top: var(--space-16);
  padding-bottom: var(--space-20);
  min-height: 80vh;
  text-align: center;
}

.tabhub-heading {
  width: min(920px, 100%);
  margin: 0 auto var(--space-4);
}

.tabhub-title {
  font-size: var(--text-5xl);
  margin-bottom: var(--space-2);
}

.tabhub-subtitle {
  font-size: var(--text-xl);
  margin-bottom: var(--space-2);
}

.tabhub-hint {
  font-size: var(--text-sm);
  margin-bottom: 0;
}

.sort-mode-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 auto var(--space-8);
  min-height: 42px;
  padding: 0 var(--space-4);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  background: var(--color-input-bg);
  color: var(--color-text);
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.sort-mode-button:hover,
.sort-mode-button.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--accent-bg-subtle);
}

.sort-mode-button:disabled {
  opacity: .55;
  cursor: wait;
}

/* Grid de post-its */
.postit-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-12);
  justify-content: center;
  align-items: center;
}

.postit-grid.is-sorting {
  user-select: none;
}

.house-sort-item {
  position: relative;
  min-width: 220px;
  flex: 1 1 220px;
  max-width: 360px;
  touch-action: manipulation;
  transition: transform .18s ease, opacity .18s ease;
  will-change: transform;
}

.postit-grid.is-sorting .house-sort-item {
  touch-action: none;
  cursor: grab;
  animation: tabhub-wiggle 1.1s ease-in-out infinite;
}

.postit-grid.is-sorting .house-sort-item:nth-child(2n) {
  animation-delay: -.45s;
}

.postit-grid.is-sorting .house-sort-item:nth-child(3n) {
  animation-delay: -.75s;
}

.house-sort-item.dragging {
  opacity: .92;
  z-index: 50;
  cursor: grabbing;
  animation: none;
  transition: none;
  filter: drop-shadow(0 18px 22px rgba(0, 0, 0, .28));
}

.postit-grid.is-sorting :deep(.post-it-visual) {
  cursor: grab;
}

.house-sort-item.dragging :deep(.post-it-visual) {
  cursor: grabbing;
  transform: rotate(0deg) scale(1.03) !important;
}

@keyframes tabhub-wiggle {
  0%, 100% { rotate: -0.7deg; }
  50% { rotate: 0.8deg; }
}

/* Tarjetas de acción (crear/unirse) */
.card-dashed {
  opacity: 0.65;
}

:deep(.card-dashed .post-it-visual) {
  border-style: dashed !important;
}

/* Modales */
.modal-body {
  padding-top: var(--space-3);
  color: var(--color-text);
}

.modal-label {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-muted);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-4);
  margin-top: var(--space-8);
}

.btn-modal-cancel  { color: var(--color-text-muted) !important; }
.btn-modal-confirm {
  background-color: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
  color: white !important;
}

.icon-picker {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-2);
}

.icon-choice {
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-input-bg);
  color: var(--color-text-muted);
}

.icon-choice.selected {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--accent-bg-subtle);
}

.house-preview {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.house-preview img {
  width: 110px;
  height: 76px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  border: 2px solid var(--color-accent);
}

/* Responsive */
@media (max-width: 768px) {
  .tabhub-container {
    padding-top: var(--space-10);
  }

  .tabhub-heading {
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .postit-grid { gap: var(--space-6); }
  .tabhub-title { font-size: var(--text-4xl); }

  .house-sort-item {
    flex-basis: min(100%, 340px);
  }
}
</style>

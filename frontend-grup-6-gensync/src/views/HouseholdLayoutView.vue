<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import http from '@/services/http'
import { useHouseState } from '@/composables/useHouseState'
import { useNavigation } from '@/composables/useNavigation'

const props = defineProps(['config'])
const route = useRoute()
const { go } = useNavigation()
const { setHouseData, clearHouseData, currentHouseName } = useHouseState()
const { t, locale } = useI18n()

const homeId = route.params.id
const currentHouse = ref(null)

const buildTabs = () => [
  { id: 'dashboard', label: t('house.dashboard'), icon: 'pi pi-th-large', path: `/households/${homeId}/dashboard` },
  { id: 'expenses', label: t('house.expenses'), icon: 'pi pi-wallet', path: `/households/${homeId}/expenses` },
  { id: 'tasks', label: t('house.tasks'), icon: 'pi pi-list-check', path: `/households/${homeId}/tasks` },
  { id: 'calendar', label: t('house.calendar'), icon: 'pi pi-calendar', path: `/households/${homeId}/calendar` },
  { id: 'multimedia', label: t('house.multimedia'), icon: 'pi pi-youtube', path: `/households/${homeId}/multimedia` },
]

const tabs = ref(buildTabs())

const updateTabs = async () => {
  try {
    const response = await http.get('/households')
    currentHouse.value = response.data.find(h => h.id == homeId) || null
    if (currentHouse.value && (currentHouse.value.role === 'owner' || currentHouse.value.role === 'SUPER_ADMIN')) {
      const existeSettings = tabs.value.find(t => t.id === 'settings')
      if (!existeSettings) {
        tabs.value.push({ id: 'settings', label: t('house.settings'), icon: 'pi pi-cog', path: `/households/${homeId}/settings` })
      }
    }
    setHouseData(homeId, tabs.value, currentHouse.value?.name || '')
  } catch (error) {
    console.error('Error verificando permisos:', error)
    setHouseData(homeId, tabs.value, '') // Set default tabs even on error
  }
}

onMounted(() => {
  updateTabs()
})

watch(locale, () => {
  tabs.value = buildTabs()
  updateTabs()
})

onUnmounted(() => {
  clearHouseData()
})
</script>

<template>
  <div class="household-layout">
    <section class="house-context-bar" aria-label="Navegacion de la casa">
      <button class="back-chip" @click="go('/tabhub')">
        <i class="pi pi-arrow-left"></i>
        <span>Mis Tabs</span>
      </button>
      <div class="house-title-block">
        <span class="house-eyebrow">Casa</span>
        <h2 style="margin:0; font-size: 1.2rem; color: var(--color-accent);">{{ currentHouse?.name || currentHouseName }}</h2>
      </div>
    </section>

    <div class="content-box" role="tabpanel">
      <router-view :config="config" :homeId="homeId" />
    </div>

  </div>
</template>

<style scoped>
:deep(.pi), :deep(i.pi) {
  font-family: 'primeicons' !important;
}

.household-layout {
  width: 100%;
  max-width: var(--container-full);
  margin: var(--space-3) auto var(--space-12) auto;
  padding: 0 clamp(var(--space-3), 2vw, var(--space-6));
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.house-context-bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-surface) 82%, transparent);
  backdrop-filter: blur(10px);
}

.back-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-input-bg);
  color: var(--color-text);
  font-weight: 700;
}

.house-title-block {
  min-width: 0;
}

.house-eyebrow {
  display: block;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.house-title-block h2 {
  margin: 0;
  color: var(--color-accent);
  font-size: clamp(var(--text-xl), 2vw, var(--text-3xl));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-box {
  width: 100%;
  min-height: calc(100vh - 190px);
  padding: clamp(var(--space-4), 2vw, var(--space-6));
  border-radius: var(--radius-md);
  border: 1px solid var(--accent-border);
  background-color: var(--accent-bg-subtle);
  backdrop-filter: blur(4px);
  box-shadow: var(--shadow-sm);
}

@media (max-width: 768px) {
  .household-layout { padding: 0 var(--space-2); gap: var(--space-3); }

  .house-context-bar {
    position: sticky;
    top: 0;
    z-index: 40;
    grid-template-columns: 1fr;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  .back-chip {
    width: max-content;
  }

  .content-box {
    min-height: auto;
    padding: var(--space-3);
  }
}
</style>

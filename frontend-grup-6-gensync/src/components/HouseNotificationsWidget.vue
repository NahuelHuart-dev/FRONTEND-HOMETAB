<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotifications } from '@/composables/useNotifications'
import { assetUrl } from '@/services/http'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])
const router = useRouter()
const { t } = useI18n()
const { households, totalUnread, loading, markRead, markAllRead } = useNotifications()
const filter = ref('all')

const filters = computed(() => [
  { id: 'all', label: t('notifications.all'), icon: 'pi pi-bell' },
  { id: 'task', label: t('notifications.tasks'), icon: 'pi pi-check-square' },
  { id: 'expense', label: t('notifications.expenses'), icon: 'pi pi-wallet' },
  { id: 'event', label: t('notifications.events'), icon: 'pi pi-calendar' },
])

const visibleHouseholds = computed(() => households.value
  .map((household) => ({
    ...household,
    items: (household.items || []).filter((item) => filter.value === 'all' || item.type === filter.value),
  }))
  .filter((household) => household.items.length))

const iconFor = (type) => ({
  task: 'pi pi-check-square',
  expense: 'pi pi-wallet',
  event: 'pi pi-calendar',
}[type] || 'pi pi-bell')

const dateText = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const openItem = async (item) => {
  if (!item.read) await markRead(item.id)
  emit('close')
  if (item.route) router.push(item.route)
}
</script>

<template>
  <Transition name="notifications-fade">
    <aside v-if="open" class="notifications-panel" aria-label="Notificaciones">
      <header class="notifications-header">
        <div>
          <span class="eyebrow">{{ t('notifications.eyebrow') }}</span>
          <h2>{{ t('notifications.title') }}</h2>
        </div>
        <button class="icon-close" type="button" @click="emit('close')" :aria-label="t('common.close')">
          <i class="pi pi-times"></i>
        </button>
      </header>

      <div class="notifications-actions">
        <span>{{ totalUnread }} {{ t('notifications.unread') }}</span>
        <button type="button" :disabled="!totalUnread" @click="markAllRead">{{ t('notifications.markAll') }}</button>
      </div>

      <div class="notification-filters">
        <button
          v-for="item in filters"
          :key="item.id"
          type="button"
          :class="{ active: filter === item.id }"
          @click="filter = item.id"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div v-if="loading" class="notifications-empty">
        <i class="pi pi-spin pi-spinner"></i>
        <p>{{ t('common.loading') }}</p>
      </div>

      <div v-else-if="!visibleHouseholds.length" class="notifications-empty">
        <i class="pi pi-check-circle"></i>
        <p>{{ t('notifications.empty') }}</p>
      </div>

      <div v-else class="notifications-list">
        <section v-for="household in visibleHouseholds" :key="household.id" class="house-group">
          <div class="house-title">
            <div class="house-avatar">
              <img v-if="household.avatar" :src="assetUrl(household.avatar)" alt="">
              <i v-else :class="['pi', household.avatarIcon || 'pi-home']"></i>
            </div>
            <div>
              <h3>{{ household.name }}</h3>
              <span>{{ household.unreadCount }} {{ t('notifications.unread') }}</span>
            </div>
          </div>

          <button
            v-for="item in household.items"
            :key="item.id"
            type="button"
            class="notification-card"
            :class="[item.type, item.priority, { unread: !item.read }]"
            @click="openItem(item)"
          >
            <span class="notification-icon"><i :class="iconFor(item.type)"></i></span>
            <span class="notification-body">
              <strong>{{ item.title }}</strong>
              <small>{{ item.message }}</small>
              <em>{{ dateText(item.targetAt) }}</em>
            </span>
            <i v-if="!item.read" class="pi pi-circle-fill unread-dot"></i>
          </button>
        </section>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.notifications-panel {
  position: fixed;
  top: 84px;
  right: 24px;
  width: min(420px, calc(100vw - 32px));
  max-height: calc(100vh - 112px);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);
  z-index: 360;
}

.notifications-header,
.notifications-actions,
.house-title,
.notification-card {
  display: flex;
  align-items: center;
}

.notifications-header {
  justify-content: space-between;
  gap: var(--space-4);
}

.eyebrow {
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.notifications-header h2,
.house-title h3 {
  margin: 0;
}

.icon-close {
  width: 38px;
  height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-input-bg);
  color: var(--color-text);
}

.notifications-actions {
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 700;
}

.notifications-actions button {
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font-weight: 700;
}

.notifications-actions button:disabled {
  opacity: .35;
}

.notification-filters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
}

.notification-filters button {
  min-width: 0;
  display: grid;
  place-items: center;
  gap: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-input-bg);
  color: var(--color-text-muted);
  padding: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 700;
}

.notification-filters button.active {
  border-color: var(--color-accent);
  background: var(--accent-bg-subtle);
  color: var(--color-accent);
}

.notifications-list {
  overflow-y: auto;
  display: grid;
  gap: var(--space-4);
  padding-right: 2px;
}

.house-group {
  display: grid;
  gap: var(--space-2);
}

.house-title {
  gap: var(--space-3);
}

.house-title span {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

.house-avatar,
.notification-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.house-avatar {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--accent-bg-icon);
  color: var(--color-accent);
}

.house-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.notification-card {
  width: 100%;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-card-bg);
  color: var(--color-text);
  text-align: left;
}

.notification-card.unread {
  border-color: var(--color-accent);
  background: var(--accent-bg-subtle);
}

.notification-card.high {
  border-color: rgba(239, 68, 68, .5);
}

.notification-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--accent-bg-icon);
  color: var(--color-accent);
}

.notification-body {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;
}

.notification-body strong,
.notification-body small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-body small,
.notification-body em {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-style: normal;
}

.unread-dot {
  color: var(--color-accent);
  font-size: .55rem;
}

.notifications-empty {
  min-height: 180px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--color-text-muted);
  font-weight: 700;
}

.notifications-empty i {
  font-size: 2rem;
  color: var(--color-accent);
}

.notifications-fade-enter-active,
.notifications-fade-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}

.notifications-fade-enter-from,
.notifications-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 768px) {
  .notifications-panel {
    top: auto;
    right: 0;
    left: 0;
    bottom: var(--bottom-nav-height);
    width: 100%;
    max-height: calc(100vh - var(--bottom-nav-height) - 64px);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
}
</style>

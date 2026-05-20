<script setup>
import { useI18n } from 'vue-i18n'
import { useNavigation } from '@/composables/useNavigation'

const { t } = useI18n()
const { go } = useNavigation()
</script>

<template>
  <main class="not-found-view">
    <section class="not-found-card">
      <i class="pi pi-compass" aria-hidden="true"></i>
      <h1>{{ t('notFound.title') }}</h1>
      <p>{{ t('notFound.text') }}</p>
      <div class="not-found-actions">
        <Button :label="t('nav.tabs')" icon="pi pi-home" class="primary-action" @click="go('/tabhub')" />
        <Button :label="t('common.back')" text @click="go('/')" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.not-found-view {
  width: min(100%, 920px);
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: var(--space-8);
}

.not-found-card {
  width: 100%;
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  padding: var(--space-10);
  border: 1px dashed var(--accent-border-strong);
  border-radius: var(--radius-md);
  background: var(--accent-bg-subtle);
  text-align: center;
}

.not-found-card i {
  color: var(--color-accent);
  font-size: var(--icon-3xl);
}

.not-found-card h1 {
  margin: 0;
  color: var(--color-accent);
}

.not-found-card p {
  margin: 0;
  color: var(--color-text-muted);
  font-weight: 700;
}

.not-found-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
}

.primary-action {
  background: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
  color: white !important;
}
</style>

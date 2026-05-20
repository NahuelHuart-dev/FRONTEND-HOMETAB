<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <main class="legal-page ht-container ht-fade-in">
    <article class="legal-panel">
      <div class="ht-mini-tag">HomeTab</div>
      <h1>{{ t('legal.legalTitle') }}</h1>
      <p>{{ t('legal.academic') }}</p>
      <p>{{ t('legal.responsible') }}</p>
      <p>
        El uso de la aplicacion queda limitado al contexto de presentacion, pruebas academicas
        y demostracion tecnica. El codigo y los despliegues se mantienen en los repositorios
        oficiales del equipo.
      </p>
    </article>
  </main>
</template>

<style scoped>
.legal-page {
  width: 100%;
  padding-top: var(--space-16);
  padding-bottom: var(--space-20);
}

.legal-panel {
  max-width: 820px;
  margin: 0 auto;
  padding: var(--space-8);
  border: 2px dashed var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent-bg-subtle);
}

.legal-panel h1 {
  margin: var(--space-2) 0 var(--space-6);
}

.legal-panel p {
  color: var(--color-text-muted);
  line-height: 1.7;
}
</style>

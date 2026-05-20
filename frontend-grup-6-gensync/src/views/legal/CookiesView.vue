<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <main class="legal-page ht-container ht-fade-in">
    <article class="legal-panel">
      <div class="ht-mini-tag">HomeTab</div>
      <h1>{{ t('legal.cookiesTitle') }}</h1>
      <p>{{ t('legal.cookiesBody') }}</p>
      <ul>
        <li><strong>token</strong>: mantiene la sesion API mientras el usuario esta identificado.</li>
        <li><strong>hometab_config</strong>: guarda tema, papel, color y cursor si aceptas cookies.</li>
        <li><strong>hometab_locale</strong>: recuerda el idioma seleccionado.</li>
        <li><strong>hometab_cookies</strong>: recuerda si aceptaste o rechazaste el banner.</li>
      </ul>
      <p>
        Rechazar cookies elimina solo preferencias opcionales de personalizacion, no borra tu
        cuenta ni impide iniciar sesion.
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

.legal-panel p,
.legal-panel li {
  color: var(--color-text-muted);
  line-height: 1.7;
}
</style>

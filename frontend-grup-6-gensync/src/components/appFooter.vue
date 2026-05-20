<script setup>
/**
 * appFooter.vue
 *
 * Footer principal de HomeTab.
 *
 * CAMBIOS:
 *   - `go()` de useNavigation composable
 *   - Sin ternarios de color (usan CSS vars)
 */
import SvgLogo from './svgLogo.vue'
import { useNavigation } from '@/composables/useNavigation'
import { useI18n } from 'vue-i18n'

const props = defineProps(['config'])
const emit  = defineEmits(['openCookies'])
const { go } = useNavigation()
const { t } = useI18n()
</script>

<template>
  <footer class="main-footer" aria-label="Pie de página">
    <div class="footer-grid ht-container">

      <!-- Columna 1: Marca -->
      <div class="col-brand">
        <div class="brand-row">
          <button class="logo-footer-btn" @click="go('/')" aria-label="Ir al inicio">
            <SvgLogo class="svg-logo" />
          </button>
          <span class="brand-name" @click="go('/')">HomeTab</span>
        </div>
        <p class="tagline">
          {{ t('footer.madeBy') }}
          <a href="#" @click.prevent="go('/')" class="tagline-link"><strong>GenSync</strong></a>.
        </p>
      </div>

      <!-- Columna 2: Legal -->
      <nav class="col-legal" aria-label="Links legales">
        <a href="#" @click.prevent="go('/legal')">{{ t('footer.legal') }}</a>
        <a href="#" @click.prevent="go('/privacy')">{{ t('footer.privacy') }}</a>
        <a href="#" @click.prevent="go('/about')">{{ t('footer.about') }}</a>
        <a href="#" @click.prevent="go('/cookies')">{{ t('footer.cookies') }}</a>
      </nav>

      <!-- Columna 3: Social -->
      <div class="col-social">
        <Button icon="pi pi-twitter"   text rounded class="social-btn" aria-label="Twitter" />
        <Button icon="pi pi-instagram" text rounded class="social-btn" aria-label="Instagram" />
        <Button icon="pi pi-github"    text rounded class="social-btn" aria-label="GitHub" />
      </div>

    </div>

    <div class="footer-bottom">
      <p>&copy; 2026 HomeTab. {{ t('footer.rights') }}</p>
    </div>
  </footer>
</template>

<style scoped>
.main-footer {
  width: 100%;
  margin-top: var(--space-24);
  padding-top: var(--space-12);
  padding-bottom: var(--space-8);
  border-top: 2px dashed var(--color-border-strong);
}

/* Grid de 3 columnas */
.footer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-12);
  align-items: start;
  margin-bottom: var(--space-8);
}

/* Col 1: Marca */
.col-brand {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.logo-footer-btn {
  height: 40px;
  width: auto;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  color: var(--color-accent);
  cursor: pointer;
}

.svg-logo { height: 100%; width: auto; overflow: visible; }

.brand-name {
  font-family: var(--font-ui);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
  cursor: pointer;
}

.tagline {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  opacity: 0.8;
  margin: 0;
}

.tagline-link {
  color: inherit;
  text-decoration: underline;
}

/* Col 2: Legal */
.col-legal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
}

.col-legal a {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  opacity: 0.7;
  transition: opacity var(--duration-base) var(--ease-standard);
}

.col-legal a:hover { opacity: 1; text-decoration: underline; }

/* Col 3: Social */
.col-social {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.social-btn {
  color: var(--color-accent) !important;
  font-size: 1.3rem !important;
  width: 3rem !important;
  height: 3rem !important;
  transition: transform var(--duration-fast) var(--ease-bounce) !important;
}

.social-btn:hover { transform: scale(1.15) !important; }

/* Footer bottom */
.footer-bottom {
  margin-top: var(--space-8);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-subtle);
}

.footer-bottom p { margin: 0; }

/* Responsive */
@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr;
    text-align: center;
    gap: var(--space-8);
  }
  .col-brand { align-items: center; }
  .col-social { justify-content: center; }
}
</style>

<script setup>
/**
 * AboutView.vue
 *
 * Vista "Sobre Nosotros" del equipo GenSync.
 *
 * CAMBIOS vs versión anterior:
 *   - CRÍTICO: Eliminada la reimplementación manual de PostItCard.
 *     Ahora usa el componente <PostItCard> como el resto de vistas.
 *   - Eliminados .post-it-visual, .tape, .rotate-*, .info-block,
 *     .mini-tag, .resaltado — todos duplicados de LandingView.
 *     Ahora usan las clases globales de components.css y typography.css.
 *   - `go()` de useNavigation composable
 *   - Sin ternarios de color en el template
 */
import PostItCard from '@/components/PostItCard.vue'
import { useNavigation } from '@/composables/useNavigation'
import { useI18n } from 'vue-i18n'

const props = defineProps(['config'])
const { go } = useNavigation()
const { t } = useI18n()
</script>

<template>
  <div class="about-container ht-container ht-fade-in">

    <h1 class="about-title ht-text-center">
      <span class="ht-resaltado">{{ t('about.title') }}</span>
    </h1>

    <!-- Info block usando las clases globales de components.css -->
    <section class="ht-info-block info-block">

      <!-- Texto -->
      <div class="ht-info-text">
        <div class="ht-mini-tag">{{ t('about.tag') }}</div>
        <h2>{{ t('about.heading') }}</h2>
        <p style="text-align: justify;">
          {{ t('about.body') }}
        </p>
        <br>
        <Button
          :label="t('about.backHome')"
          @click="go('/')"
          size="small"
          variant="text"
          class="btn-back"
        />
      </div>

      <!-- Imagen en un PostItCard (AHORA usa el componente real) -->
      <div class="ht-visual-wrapper about-visual">
        <!--
          PostItCard ya no recibe :config.
          Los colores vienen de CSS variables gestionadas por useTheme.
        -->
        <div class="about-photo-card rotate-right">
          <div class="tape" aria-hidden="true"></div>
          <img
            src="../assets/partners.png"
            alt="El equipo GenSync: String y Jamon"
            class="about-photo"
          />
          <span class="about-photo-caption">{{ t('about.caption') }}</span>
        </div>
      </div>

    </section>

  </div>
</template>

<style scoped>
/**
 * Solo estilos específicos de AboutView.
 * Los estilos .ht-info-block, .ht-mini-tag, .ht-resaltado,
 * etc. están en components.css y typography.css.
 */

.about-container {
  padding-top: var(--space-8);
  padding-bottom: var(--space-20);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-12);
}

.about-title {
  font-size: var(--text-5xl);
  margin-bottom: var(--space-4);
}

/* Botón de volver */
.btn-back {
  color: var(--color-accent) !important;
  font-weight: 700;
}

/* ──────────────────────────────────────────────
   FOTO DEL EQUIPO (estilo post-it personalizado)
   No usamos PostItCard aquí porque tiene imagen
   en lugar de icono. Sí usamos las mismas vars CSS.
   ────────────────────────────────────────────── */
.about-visual {
  flex: 1;
  min-width: 280px;
}

.about-photo-card {
  position: relative;
  background-color: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  padding: var(--space-8) var(--space-6) var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  box-shadow: var(--shadow-md);
  transition: transform var(--duration-base) var(--ease-bounce),
              box-shadow var(--duration-base) var(--ease-standard);
  width: 100%;
  max-width: 400px;
}

.about-photo-card:hover {
  transform: rotate(0deg) scale(1.02) !important;
  box-shadow: var(--shadow-lg);
}

/* Cinta de celo (de components.css, pero necesitamos override scoped) */
.about-photo-card .tape {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 32px;
  background-color: var(--color-tape-bg);
  border-left: 1px dashed rgba(0, 0, 0, 0.1);
  border-right: 1px dashed rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  opacity: 0.7;
  z-index: 2;
}

.rotate-right { transform: rotate(2deg); }

.about-photo {
  width: 90%;
  height: auto;
  border-radius: var(--radius-sm);
  filter: grayscale(20%);
}

.about-photo-caption {
  font-family: var(--font-accent);
  font-size: var(--text-sm);
  color: var(--color-accent);
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  .about-photo-card {
    max-width: 100%;
    transform: rotate(0deg);
  }
}
</style>

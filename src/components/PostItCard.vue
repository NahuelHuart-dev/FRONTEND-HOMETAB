<script setup>
/**
 * PostItCard.vue
 *
 * Tarjeta tipo post-it reutilizable.
 *
 * CAMBIOS vs versión anterior:
 *   - Eliminada la prop `config` (ya no es necesaria).
 *     Los colores ahora vienen de las variables CSS globales:
 *     --color-accent, --accent-bg, --accent-border.
 *   - Los estilos inline `:style="{ color: config.colorAcento }"``
 *     han sido reemplazados por clases CSS.
 *
 * PROPS:
 *   titulo    {String}  — Texto del label del post-it
 *   icono     {String}  — Clase de PrimeIcon (ej: 'pi pi-home')
 *   avatar    {String}  — URL opcional para mostrar imagen en vez de icono
 *   rotacion  {String}  — 'left' | 'right' (rotación suave, default: 'left')
 */
import { ref, watch } from 'vue'

const props = defineProps({
  titulo:   { type: String, required: true },
  icono:    { type: String, required: true },
  avatar:   { type: String, default: '' },
  rotacion: { type: String, default: 'left' },
  variant:  { type: String, default: 'default' }
})

const imageFailed = ref(false)

watch(() => props.avatar, () => {
  imageFailed.value = false
})
</script>

<template>
  <div
    class="post-it-visual"
    :class="[rotacion === 'left' ? 'rotate-left' : 'rotate-right', `variant-${variant}`]"
  >
    <!-- Cinta de celo decorativa -->
    <div class="tape" aria-hidden="true"></div>

    <!-- Icono o foto central -->
    <img v-if="avatar && !imageFailed" :src="avatar" class="post-it-avatar" alt="" @error="imageFailed = true" />
    <i v-else :class="icono" class="post-it-icon" aria-hidden="true"></i>

    <!-- Label -->
    <span class="post-it-label">{{ titulo }}</span>
  </div>
</template>

<style scoped>
/**
 * El color de acento y sus variantes vienen de CSS variables
 * globales gestionadas por useTheme.js. NO hardcodear colores.
 */

.post-it-visual {
  flex: 1;
  height: 320px;
  min-width: 220px;
  position: relative;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  /* Colores via CSS vars (gestionadas por useTheme) */
  background-color: var(--accent-bg);
  border: 1px solid var(--accent-border);
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--duration-base) var(--ease-bounce),
    box-shadow var(--duration-base) var(--ease-standard);
  backdrop-filter: blur(2px);
  cursor: pointer;
}

.post-it-visual:hover {
  transform: scale(1.06) rotate(0deg) !important;
  box-shadow: var(--shadow-lg);
  z-index: 10;
}

/* Cinta adhesiva */
.tape {
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

/* Icono */
.post-it-icon {
  font-size: var(--icon-3xl);
  color: var(--color-accent);
}

.post-it-avatar {
  width: 118px;
  height: 118px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 3px solid var(--color-accent);
  box-shadow: var(--shadow-sm);
}

.variant-house .post-it-avatar {
  width: min(72%, 210px);
  height: 138px;
  border-radius: var(--radius-sm);
  transform: rotate(-1deg);
  border-width: 2px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
}

.variant-house .post-it-icon {
  font-size: 100px;
}

/* Label */
.post-it-label {
  font-family: var(--font-accent);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--color-accent);
  text-align: center;
  padding: 0 var(--space-4);
}

/* Rotaciones suaves */
.rotate-left  { transform: rotate(-2deg); }
.rotate-right { transform: rotate(2deg); }

/* En móvil: reducir tamaño */
@media (max-width: 768px) {
  .post-it-visual {
    height: 240px;
    min-width: 160px;
  }
}
</style>

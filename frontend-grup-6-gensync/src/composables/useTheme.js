/**
 * ============================================================
 * COMPOSABLE: useTheme
 * src/composables/useTheme.js
 *
 * Gestiona el sistema de temas de HomeTab mediante el
 * atributo `data-theme` en el elemento raíz (<html>) y
 * variables CSS inyectadas dinámicamente.
 *
 * SISTEMA:
 *   - data-theme="light" | "dark"  →  controla los colores
 *     base (bg, text, borders...) definidos en tokens.css
 *
 *   - --color-accent y sus derivadas →  inyectadas por JS
 *     porque son dinámicas (el usuario elige el color).
 *
 * USO en App.vue:
 *   import { useTheme } from '@/composables/useTheme'
 *   useTheme(config)   // <- config es un ref reactivo
 *
 * Después de llamar a useTheme(), los componentes ya NO
 * necesitan ternarios :style="{ color: config.darkMode ? ... }"
 * Solo usan clases CSS y variables var(--color-text) etc.
 * ============================================================
 */
import { watch } from 'vue'

/**
 * Paletas de color de acento predefinidas.
 * Añadir o modificar aquí cuando se quieran más temas.
 * El id debe coincidir con el valor de config.colorAcento.
 */
export const ACCENT_THEMES = [
  { id: '#ea580c', nombre: 'Arcilla',  emoji: '🏺' },
  { id: '#16a34a', nombre: 'Matcha',   emoji: '🍃' },
  { id: '#2563eb', nombre: 'Océano',   emoji: '🌊' },
  { id: '#9333ea', nombre: 'Lavanda',  emoji: '💜' },
  { id: '#44403c', nombre: 'Carbón',   emoji: '🪨' },
  { id: '#f43f5e', nombre: 'Coral',    emoji: '🌸' },
]

/**
 * Convierte un color hex (#rrggbb) + opacidad en hex (0-255)
 * a un string de color hex de 8 dígitos (#rrggbbaa).
 * @param {string} hex   - Color base, ej: '#ea580c'
 * @param {number} alpha - Opacidad 0-255 como entero
 * @returns {string}     - Ej: '#ea580c40'
 */
const hexAlpha = (hex, alpha) => {
  return hex + Math.round(alpha).toString(16).padStart(2, '0').toUpperCase()
}

/**
 * Inyecta el color de acento y todas sus variantes
 * como variables CSS en el elemento :root.
 * @param {string} color - Color hex, ej: '#ea580c'
 */
const applyAccent = (color) => {
  const root = document.documentElement
  // Color completo (opaco)
  root.style.setProperty('--color-accent', color)

  // Variantes con transparencia (sustituyen los + 'hex' del código anterior)
  root.style.setProperty('--accent-bg-subtle',     hexAlpha(color, 13))   // ~5%
  root.style.setProperty('--accent-bg',            hexAlpha(color, 21))   // ~8%
  root.style.setProperty('--accent-bg-icon',       hexAlpha(color, 32))   // ~12%
  root.style.setProperty('--accent-bg-btn',        hexAlpha(color, 48))   // ~19%
  root.style.setProperty('--accent-border',        hexAlpha(color, 64))   // ~25%
  root.style.setProperty('--accent-border-strong', hexAlpha(color, 96))   // ~38%
  root.style.setProperty('--accent-bg-medium',     hexAlpha(color, 153))  // ~60%
  root.style.setProperty('--accent-bg-high',       hexAlpha(color, 204))  // ~80%
}

/**
 * Aplica el tema (light/dark) como atributo data-theme
 * en el elemento <html>. Los valores CSS de tokens.css
 * cambian automáticamente con el selector [data-theme="dark"].
 * @param {boolean} darkMode
 */
const applyTheme = (darkMode) => {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
}

/**
 * Composable principal.
 * @param {import('vue').Ref} config - config ref de App.vue
 */
export function useTheme(config) {
  // Aplicamos inmediatamente al montar (immediate: true)
  watch(() => config.value.darkMode,   applyTheme,  { immediate: true })
  watch(() => config.value.colorAcento, applyAccent, { immediate: true })
}

/**
 * ============================================================
 * COMPOSABLE: useNavigation
 * src/composables/useNavigation.js
 *
 * Centraliza la función de navegación programática.
 * Elimina la necesidad de definir `const go = (ruta) => ...`
 * en cada componente.
 *
 * ANTES (en cada archivo):
 *   const router = useRouter()
 *   const go = (ruta) => router.push(ruta)
 *
 * AHORA (en cualquier componente):
 *   import { useNavigation } from '@/composables/useNavigation'
 *   const { go } = useNavigation()
 * ============================================================
 */
import { useRouter, useRoute } from 'vue-router'

export function useNavigation() {
  const router = useRouter()
  const route  = useRoute()

  /**
   * Navega a una ruta.
   * @param {string} ruta - Path destino (ej: '/login', '/tabhub')
   */
  const go = (ruta) => router.push(ruta)

  /**
   * Navega hacia atrás en el historial del navegador.
   */
  const goBack = () => router.back()

  /**
   * Comprueba si la ruta actual coincide con un path dado.
   * Útil para marcar elementos de navegación como activos.
   * @param {string} path - Path a comparar
   * @returns {boolean}
   */
  const isActive = (path) => route.path === path

  /**
   * Comprueba si la ruta actual empieza con un path dado.
   * Útil para secciones que tienen sub-rutas.
   * @param {string} path - Prefijo a comparar
   * @returns {boolean}
   */
  const isActiveParent = (path) => route.path.startsWith(path)

  return { go, goBack, isActive, isActiveParent, route, router }
}

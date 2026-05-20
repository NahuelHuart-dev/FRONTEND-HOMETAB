<script setup>
// ===========================================
// 1. IMPORTACIONES
// ===========================================
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import appNavbar from './components/appNavbar.vue'
import appFooter from './components/appFooter.vue'
import SvgLogo from './components/svgLogo.vue'
import HouseChatWidget from './components/HouseChatWidget.vue'
import HouseNotificationsWidget from './components/HouseNotificationsWidget.vue'
import AppConfirmDialog from './components/AppConfirmDialog.vue'
import { useTheme, ACCENT_THEMES } from '@/composables/useTheme'
import { useNotifications } from '@/composables/useNotifications'

const router = useRouter()
const { t } = useI18n()

// ==========================================
// 2. ESTADO GENERAL
// ==========================================
const mostrarPanelConfig = ref(false)
const mostrarCookies = ref(false)
const transicionActiva = ref(false)
const usuarioLogueado = ref(false)
const usuarioActual = ref(null)
const mostrarNotificaciones = ref(false)
const { totalUnread, startPolling, stopPolling } = useNotifications()

// ==========================================
// 3. CONFIGURACION DEL USUARIO
// ==========================================
const config = ref({
  darkMode: true,
  tipoPapel: 'cuadricula',
  colorAcento: '#ea580c',
  cursor: 'pencil'
})

//
// SISTEMA DE TEMAS (data-theme + CSS vars)
// useTheme observa config y aplica el atributo
// data-theme + variables --color-accent en :root
//
useTheme(config)

// ==========================================
// 4. PROPIEDADES COMPUTADAS
// ==========================================

/**
 * Genera el estilo dinámico del wrapper principal.
 * SOLO contiene lo que no puede venir de CSS puro:
 *   - backgroundImage (patrón cuadrícula/líneas, usa var() de CSS)
 *   - backgroundSize
 *   - Variables de cursor personalizadas
 *
 * El backgroundColor, color y minHeight ahora vienen
 * de las variables CSS de tokens.css + animations.css.
 */
const estiloFondo = computed(() => {
  // El color de línea viene de la variable CSS (cambia con data-theme)
  const linea = 'var(--color-grid-line)'

  let backgroundImage = 'none'
  if (config.value.tipoPapel === 'cuadricula') {
    backgroundImage = `linear-gradient(${linea} 1px, transparent 1px), linear-gradient(90deg, ${linea} 1px, transparent 1px)`
  } else if (config.value.tipoPapel === 'lineas') {
    backgroundImage = `linear-gradient(${linea} 1px, transparent 1px)`
  }

  // Cursores personalizados (Wii, LoL, etc.)
  const cursorNormal = config.value.cursor === 'default'
    ? 'auto'
    : `url('/cursores/${config.value.cursor}.cur') 0 0, auto`

  const cursorLink = config.value.cursor === 'default'
    ? 'pointer'
    : `url('/cursores/${config.value.cursor}-link.cur') 0 0, pointer`

  return {
    backgroundImage,
    backgroundSize: '24px 24px',
    '--mi-cursor-normal': cursorNormal,
    '--mi-cursor-pointer': cursorLink,
    cursor: 'var(--mi-cursor-normal, auto)'
  }
})

// ==========================================
// 5. AUTENTICACION
// ==========================================
const verificarAuth = () => {
  usuarioLogueado.value = !!localStorage.getItem('token')
  try {
    usuarioActual.value = JSON.parse(localStorage.getItem('hometab_user') || 'null')
  } catch {
    usuarioActual.value = null
  }
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('hometab_user')
  stopPolling()
  mostrarNotificaciones.value = false
  verificarAuth()
  router.push('/')
}

// ==========================================
// 6. PERSISTENCIA DE CONFIGURACION
// ==========================================
const guardarConfig = () => {
  localStorage.setItem('hometab_config', JSON.stringify(config.value))
}

const aceptarCookies = () => {
  localStorage.setItem('hometab_cookies', 'true')
  mostrarCookies.value = false
  guardarConfig()
}

const rechazarCookies = () => {
  localStorage.setItem('hometab_cookies', 'rejected')
  localStorage.removeItem('hometab_config')
  mostrarCookies.value = false
}

// ==========================================
// 7. CICLO DE VIDA Y WATCHERS
// ==========================================
onMounted(() => {
  verificarAuth()
  if (usuarioLogueado.value) startPolling()
  const cookiesAceptadas = localStorage.getItem('hometab_cookies')
  if (!cookiesAceptadas) {
    mostrarCookies.value = true
  } else {
    const configGuardada = localStorage.getItem('hometab_config')
    if (configGuardada) {
      config.value = JSON.parse(configGuardada)
    }
  }
})

// Guardado automático al cambiar cualquier valor de config
watch(config, () => {
  if (localStorage.getItem('hometab_cookies')) {
    guardarConfig()
  }
}, { deep: true })

watch(usuarioLogueado, (isLogged) => {
  if (isLogged) {
    startPolling()
  } else {
    stopPolling()
    mostrarNotificaciones.value = false
  }
})

// ==========================================
// 8. ROUTER  TRANSICIONES Y TÍTULOS
// ==========================================
router.beforeEach((to, from, next) => {
  // No animar cuando cambiamos de pestaña dentro de la misma casa
  const isSameHousehold = to.path.startsWith('/households/') &&
    from.path.startsWith('/households/') &&
    to.params.id === from.params.id

  if (to.path !== from.path && from.name !== undefined && !isSameHousehold) {
    transicionActiva.value = true
    setTimeout(() => next(), 200)
  } else {
    next()
  }
})

router.afterEach((to) => {
  window.scrollTo(0, 0)
  document.title = to.meta.title || 'HomeTab'
  setTimeout(() => { transicionActiva.value = false }, 100)
})
</script>

<template>
  <div class="hometab-wrapper" :style="estiloFondo">

    <appNavbar
      :config="config"
      :isLoggedIn="usuarioLogueado"
      :user="usuarioActual"
      :notification-count="totalUnread"
      @cambiar-modo="config.darkMode = !config.darkMode"
      @logout="logout"
      @open-config="mostrarPanelConfig = !mostrarPanelConfig"
      @toggle-notifications="mostrarNotificaciones = !mostrarNotificaciones"
    />

    <router-view
      :config="config"
      :isLoggedIn="usuarioLogueado"
      @update-auth="verificarAuth"
    />

    <appFooter
      :config="config"
      @openCookies="mostrarCookies = true"
    />

    <HouseChatWidget
      v-if="usuarioLogueado"
      :user="usuarioActual"
    />

    <HouseNotificationsWidget
      v-if="usuarioLogueado"
      :open="mostrarNotificaciones"
      @close="mostrarNotificaciones = false"
    />

    <Toast position="top-right" />
    <AppConfirmDialog />

    <!--  TELON DE TRANSICIN  -->
    <div class="screen-loader" :class="{ 'activo': transicionActiva }">
      <div class="loader-logo-wrapper">
        <SvgLogo class="svg-logo" />
      </div>
    </div>

    <!--  BOTON DE CONFIGURACION (desktop)  -->
    <button
      class="config-trigger"
      @click="mostrarPanelConfig = !mostrarPanelConfig"
      aria-label="Abrir panel de personalización"
    >
      <i class="pi pi-palette" aria-hidden="true"></i>
    </button>

    <!--  DRAWER DE CONFIGURACION  -->
    <div class="bottom-drawer" :class="{ open: mostrarPanelConfig }">
      <div class="drawer-content-linear">

        <!-- PAPEL -->
        <div class="config-section">
          <span class="config-label">Papel</span>
          <div class="opciones-horizontal">
            <div @click="config.tipoPapel = 'cuadricula'" class="selector-papel cuadricula" :class="{ selected: config.tipoPapel === 'cuadricula' }" title="Cuadrícula"></div>
            <div @click="config.tipoPapel = 'lineas'"     class="selector-papel lineas"     :class="{ selected: config.tipoPapel === 'lineas' }"     title="Líneas"></div>
            <div @click="config.tipoPapel = 'liso'"       class="selector-papel liso"        :class="{ selected: config.tipoPapel === 'liso' }"        title="Liso"></div>
          </div>
        </div>

        <div class="drawer-divider"></div>

        <!-- TEMAS DE COLOR PREDEFINIDOS -->
        <div class="config-section">
          <span class="config-label">Tema</span>
          <div class="opciones-horizontal">
            <!--
              ACCENT_THEMES viene de useTheme.js.
              Añadir nuevos temas ahí, no aquí.
            -->
            <button
              v-for="tema in ACCENT_THEMES"
              :key="tema.id"
              @click="config.colorAcento = tema.id"
              class="circle-btn"
              :class="{ selected: config.colorAcento === tema.id }"
              :style="{ background: tema.id }"
              :title="tema.nombre"
              :aria-label="'Tema ' + tema.nombre"
            ></button>
          </div>
        </div>

        <div class="drawer-divider"></div>

        <!-- COLOR PERSONALIZADO -->
        <div class="config-section">
          <span class="config-label">Tu Color</span>
          <div class="manual-input-wrapper">
            <input type="color" v-model="config.colorAcento" title="Elige tu color" aria-label="Color personalizado" />
            <i class="pi pi-pencil overlay-icon" aria-hidden="true"></i>
          </div>
        </div>

        <div class="drawer-divider" id="cursores-divider"></div>

        <!-- CURSORES -->
        <div class="config-section" id="cursores">
          <span class="config-label">Cursor</span>
          <div class="opciones-horizontal">
            <button @click="config.cursor = 'default'" class="cursor-btn" :class="{ selected: config.cursor === 'default' }" title="Por defecto" aria-label="Cursor por defecto">
              <span aria-hidden="true" style="font-size: 0.75rem; font-weight: 700;">NO</span>
            </button>
            <button @click="config.cursor = 'pencil'" class="cursor-btn" :class="{ selected: config.cursor === 'pencil' }" title="Lápiz" aria-label="Cursor Lápiz">
              <img src="/cursores/pencil.svg" style="width: 22px; height: 22px;" alt="Lápiz">
            </button>
            <button @click="config.cursor = 'wii'" class="cursor-btn" :class="{ selected: config.cursor === 'wii' }" title="Wii" aria-label="Cursor Wii">
              <img src="/cursores/wii.cur" style="width: 22px; height: 22px;" alt="Wii">
            </button>
            <button @click="config.cursor = 'lol'" class="cursor-btn" :class="{ selected: config.cursor === 'lol' }" title="LoL" aria-label="Cursor League of Legends">
              <img src="/cursores/lol.cur" style="width: 22px; height: 22px;" alt="LoL">
            </button>
          </div>
        </div>

      </div>
    </div>

    <!--  BANNER DE COOKIES  -->
    <Transition name="ht-slide-up">
      <div v-if="mostrarCookies" class="cookie-banner">
        <div class="cookie-text">
          <strong>{{ t('cookies.title') }}</strong>
          <p>{{ t('cookies.text') }}</p>
        </div>
        <div class="cookie-actions">
          <Button
            :label="t('cookies.policy')"
            size="small"
            variant="text"
            @click="router.push('/cookies')"
            class="cookie-btn-reject"
          />
          <Button
            :label="t('cookies.accept')"
            size="small"
            @click="aceptarCookies"
            class="cookie-btn-accept"
          />
          <Button
            :label="t('cookies.reject')"
            size="small"
            variant="text"
            @click="rechazarCookies"
            class="cookie-btn-reject"
          />
        </div>
      </div>
    </Transition>

  </div>
</template>

<style>
/*  ESTILOS GLOBALES (no scoped)  */

/* Cursores para elementos interactivos */
a, button,
.cursor-btn, .config-trigger,
input[type="color"], i[class^="pi"] {
  cursor: var(--mi-cursor-pointer, pointer) !important;
}

.p-button, .p-inputtext, .p-password-input {
  cursor: var(--mi-cursor-pointer, pointer) !important;
}

input:focus, textarea:focus, .comfy-input:focus, .p-inputtext:focus {
  cursor: var(--mi-cursor-focus, text) !important;
}
</style>

<style scoped>
/*
   1. WRAPPER PRINCIPAL
    */
.hometab-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  min-height: 100vh;
  color: var(--color-text);
  background-color: var(--color-bg);
  transition:
    background-color var(--duration-slow) var(--ease-standard),
    color var(--duration-base) var(--ease-standard);
}

/* Espacio inferior en móvil para el bottom nav */
@media (max-width: 768px) {
  .hometab-wrapper {
    padding-bottom: var(--bottom-nav-height);
  }
}

/*
   2. BOTON DE CONFIGURACION FLOTANTE (desktop)
    */
.config-trigger {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 12px 20px;
  border-radius: var(--radius-pill);
  border: none;
  background-color: var(--color-surface);
  color: var(--color-accent);
  box-shadow: var(--shadow-md);
  z-index: 200;
  display: flex;
  align-items: center;
  transition: transform var(--duration-base) var(--ease-bounce);
}

.config-trigger i {
  font-size: var(--icon-lg);
}

.config-trigger:hover {
  transform: scale(1.08) rotate(15deg);
}

/* Ocultar botón flotante en móvil (el bottom nav lo tiene integrado) */
@media (max-width: 768px) {
  .config-trigger { display: none; }
}

/*
   3. DRAWER DE CONFIGURACION
    */
.bottom-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: var(--color-drawer-bg);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  border-top: 1px solid var(--color-border-strong);
  padding: var(--space-6) var(--space-8);
  z-index: 150;
  transform: translateY(110%);
  transition: transform var(--duration-slow) var(--ease-in-out);
}

.bottom-drawer.open {
  transform: translateY(0);
}

.drawer-content-linear {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
  gap: var(--space-8);
}

.config-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-3);
}

.config-label {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.5;
  white-space: nowrap;
}

.drawer-divider {
  width: 1px;
  height: 40px;
  background: var(--color-divider);
  flex-shrink: 0;
}

.opciones-horizontal {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-3);
}

/* Selectores de papel */
.selector-papel {
  width: 42px;
  height: 42px;
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--duration-base) var(--ease-standard),
              transform var(--duration-fast) var(--ease-bounce);
}

.selector-papel:hover { transform: scale(1.08); }

.selector-papel.selected {
  border-color: var(--color-accent);
  transform: scale(1.08);
}

.cuadricula {
  background-image: linear-gradient(var(--color-border-strong) 1px, transparent 1px),
                    linear-gradient(90deg, var(--color-border-strong) 1px, transparent 1px);
  background-size: 10px 10px;
}

.lineas {
  background-image: linear-gradient(var(--color-border-strong) 1px, transparent 1px);
  background-size: 100% 10px;
}

.liso {
  background: var(--color-input-bg);
}

/* Botones de tema de color */
.circle-btn {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  border: 3px solid transparent;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-bounce),
              border-color var(--duration-base) var(--ease-standard);
  min-height: 38px; /* touch target */
}

.circle-btn:hover { transform: scale(1.15); }

.circle-btn.selected {
  border-color: var(--color-text);
  transform: scale(1.15);
}

/* Picker de color personalizado */
.manual-input-wrapper {
  position: relative;
  width: 52px;
  height: 42px;
  overflow: hidden;
  border-radius: var(--radius-full);
  border: 3px solid var(--color-accent);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-bounce);
}

.manual-input-wrapper:hover { transform: scale(1.08); }

.manual-input-wrapper input[type="color"] {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  padding: 0;
  margin: 0;
  border: none;
  cursor: pointer;
}

.overlay-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

/* Botones de cursor */
.cursor-btn {
  width: 42px;
  height: 42px;
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-input-bg);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: border-color var(--duration-base) var(--ease-standard),
              transform var(--duration-fast) var(--ease-bounce);
  color: var(--color-text);
}

.cursor-btn:hover { transform: scale(1.08); }

.cursor-btn.selected {
  border-color: var(--color-accent);
  transform: scale(1.08);
}

/*
   4. BANNER DE COOKIES
    */
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: var(--color-drawer-bg);
  padding: var(--space-4) var(--space-8);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 300;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 3px solid var(--accent-border);
  gap: var(--space-4);
}

.cookie-text strong {
  font-size: var(--text-base);
  color: var(--color-text);
}

.cookie-text p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.cookie-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.cookie-btn-accept {
  background-color: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
  color: white !important;
}

.cookie-btn-reject {
  color: var(--color-text-muted) !important;
}

/*
   5. RESPONSIVE  DRAWER EN MOVIL
    */
@media (max-width: 768px) {
  /* En móvil el drawer ocupa más espacio vertical
     y se muestra en columna */
  .drawer-content-linear {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
    padding-bottom: var(--bottom-nav-height); /* espacio para bottom nav */
    max-height: 70vh;
    overflow-y: auto;
  }

  .drawer-divider {
    width: 100%;
    height: 1px;
  }

  /* Ocultar cursores en móvil (no aplican en touch) */
  #cursores,
  #cursores-divider {
    display: none;
  }

  .cookie-banner {
    flex-direction: column;
    text-align: center;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  .cookie-actions { justify-content: center; }
}
</style>

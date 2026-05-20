<script setup>
/**
 * appNavbar.vue
 *
 * Navbar principal de HomeTab.
 *
 * ESTRUCTURA:
 *   - Desktop (> 768px): barra horizontal clásica
 *     [Logo] [HomeTab] [dark toggle | nav buttons]
 *
 *   - Móvil (<= 768px): top bar simplificado
 *     [Logo | HomeTab title] [dark toggle]
 *     + Bottom Navigation Bar fijo en la parte inferior.
 *
 * El bottom nav emite @open-config para abrir el drawer
 * de personalización, igual que el botón flotante en desktop.
 *
 * EVENTOS EMITIDOS:
 *   @cambiar-modo  -> toggle dark/light mode
 *   @logout        -> cerrar sesión
 *   @open-config   -> abrir panel de configuración
 */
import SvgLogo from './svgLogo.vue'
import { useNavigation } from '@/composables/useNavigation'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useHouseState } from '@/composables/useHouseState'
import { SUPPORTED_LOCALES, setLocale } from '@/i18n'
import { assetUrl } from '@/services/http'

const route = useRoute()
const { isInsideHouse, currentHouseName, houseTabs, toggleChat } = useHouseState()

const props = defineProps({
  config: { type: Object, required: true },
  isLoggedIn: { type: Boolean, default: false },
  user: { type: Object, default: null },
  notificationCount: { type: Number, default: 0 }
})

const emit = defineEmits(['cambiarModo', 'logout', 'openConfig', 'toggleNotifications'])
const { go, isActive } = useNavigation()
const { t, locale } = useI18n()

const avatarSrc = computed(() => {
  return assetUrl(props.user?.avatar)
})
const avatarFailed = ref(false)

watch(() => props.user?.avatar, () => {
  avatarFailed.value = false
})

const isAppZone = computed(() => {
  return route.path.startsWith('/tab') || route.path.startsWith('/profile') || route.path.startsWith('/households')
})

const handleLogoClick = () => {
  go('/')
}

const userMenuOpen = ref(false)
const languageMenuOpen = ref(false)
const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value
  languageMenuOpen.value = false
}

const mobileHouseMenuOpen = ref(false)
const toggleMobileHouseMenu = () => {
  mobileHouseMenuOpen.value = !mobileHouseMenuOpen.value
}

const changeLocale = (nextLocale) => {
  setLocale(nextLocale)
  languageMenuOpen.value = false
}

const activeLocale = computed(() => SUPPORTED_LOCALES.find((item) => item.code === locale.value) || SUPPORTED_LOCALES[0])
</script>

<template>
  <!--  TOP NAVIGATION BAR  -->
  <nav class="navbar" aria-label="Navegación principal">
    <div class="nav-left">
      <button class="logo-container-nav" @click="handleLogoClick" aria-label="Ir al inicio">
        <SvgLogo class="svg-logo" />
        <span v-if="isAppZone" class="nav-title">HomeTab</span>
      </button>
    </div>

    <div class="nav-center">
      <template v-if="!isAppZone">
        <a href="#" @click.prevent="go('/about')" class="nav-center-link">{{ t('nav.about') }}</a>
      </template>
      <template v-else-if="isInsideHouse">
        <!-- Desktop: Tabs horizontales -->
        <div class="desktop-house-tabs desktop-only">
          <button
            v-for="tab in houseTabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: isActive(tab.path) }"
            @click="go(tab.path)"
          >
            <i :class="tab.icon" aria-hidden="true"></i>
            <span>{{ tab.label }}</span>
            <span v-if="isActive(tab.path)" class="tab-underline" aria-hidden="true"></span>
          </button>
        </div>

        <!-- Móvil: Menú Hamburguesa -->
        <div class="mobile-house-menu mobile-only">
          <button class="hamburger-btn" @click="toggleMobileHouseMenu" aria-label="Menú de casa">
            <i class="pi pi-bars"></i>
          </button>
          <div v-if="mobileHouseMenuOpen" class="mobile-dropdown-menu">
            <a
              v-for="tab in houseTabs"
              :key="tab.id"
              href="#"
              @click.prevent="go(tab.path); mobileHouseMenuOpen = false"
              :class="{ active: isActive(tab.path) }"
            >
              <i :class="tab.icon"></i> {{ tab.label }}
            </a>
          </div>
        </div>
      </template>
    </div>

    <div class="nav-right">
      <div class="language-menu desktop-only">
        <button class="language-trigger" type="button" :title="t('settings.language')" @click="languageMenuOpen = !languageMenuOpen">
          <i class="pi pi-language" aria-hidden="true"></i>
          <span>{{ activeLocale.label }}</span>
          <i class="pi pi-chevron-down" aria-hidden="true"></i>
        </button>
        <div v-if="languageMenuOpen" class="language-popover">
          <button
            v-for="item in SUPPORTED_LOCALES"
            :key="item.code"
            type="button"
            class="language-option"
            :class="{ active: locale === item.code }"
            @click="changeLocale(item.code)"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.name }}</small>
          </button>
        </div>
      </div>

      <!-- Toggle dark/light mode -->
      <Button
        :icon="config.darkMode ? 'pi pi-sun' : 'pi pi-moon'"
        rounded
        text
        class="nav-icon-btn"
        :aria-label="config.darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        @click="emit('cambiarModo')"
      />

      <!-- Desktop: botones de navegación -->
      <template v-if="isLoggedIn">
        <button class="notification-trigger desktop-only" type="button" @click="emit('toggleNotifications')" :aria-label="t('notifications.title')">
          <i class="pi pi-bell"></i>
          <span v-if="notificationCount" class="notification-badge">{{ notificationCount > 9 ? '9+' : notificationCount }}</span>
        </button>

        <div class="user-dropdown-container">
          <button class="user-dropdown-trigger" @click="toggleUserMenu" aria-haspopup="true" :aria-expanded="userMenuOpen">
            <div class="nav-user-avatar" :title="user?.fullName || user?.firstName || 'Perfil'">
              <img v-if="avatarSrc && !avatarFailed" :src="avatarSrc" alt="" @error="avatarFailed = true">
              <i v-else :class="['pi', user?.avatarIcon || 'pi-user']" aria-hidden="true"></i>
            </div>
            <span class="user-dropdown-name desktop-only">{{ user?.firstName || 'Usuario' }}</span>
            <i class="pi pi-chevron-down desktop-only" style="font-size: 0.8rem;"></i>
          </button>

          <div v-if="userMenuOpen" class="user-dropdown-menu">
            <div class="dropdown-language mobile-only">
              <span><i class="pi pi-language"></i> {{ t('settings.language') }}</span>
              <div class="dropdown-language-options">
                <button
                  v-for="item in SUPPORTED_LOCALES"
                  :key="item.code"
                  type="button"
                  :class="{ active: locale === item.code }"
                  @click="changeLocale(item.code)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
            <a href="#" @click.prevent="go('/tabhub'); userMenuOpen = false"><i class="pi pi-th-large"></i> {{ t('nav.tabs') }}</a>
            <a href="#" @click.prevent="go('/profile'); userMenuOpen = false"><i class="pi pi-user-edit"></i> {{ t('nav.profile') }}</a>
            <div class="dropdown-divider"></div>
            <a href="#" class="danger" @click.prevent="emit('logout'); userMenuOpen = false"><i class="pi pi-sign-out"></i> {{ t('nav.logout') }}</a>
          </div>
        </div>
      </template>

      <template v-else>
        <Button
          :label="t('nav.login')"
          icon="pi pi-user"
          rounded
          outlined
          class="nav-accent-btn"
          @click="go('/login')"
        />
      </template>
    </div>
  </nav>

  <!--  BOTTOM NAVIGATION BAR (solo móvil)  -->
  <nav class="bottom-nav" aria-label="Navegación inferior">

    <!-- LOGGED OUT -->
    <template v-if="!isLoggedIn">
      <button class="bottom-nav-item" :class="{ active: isActive('/') }" @click="go('/')" aria-label="Inicio">
        <i class="pi pi-home" aria-hidden="true"></i><span>{{ t('nav.home') }}</span>
      </button>
      <button class="bottom-nav-item" :class="{ active: isActive('/about') }" @click="go('/about')" aria-label="Sobre nosotros">
        <i class="pi pi-info-circle" aria-hidden="true"></i><span>{{ t('nav.about') }}</span>
      </button>
      <button class="bottom-nav-item" :class="{ active: isActive('/login') }" @click="go('/login')" aria-label="Acceder">
        <i class="pi pi-user" aria-hidden="true"></i><span>{{ t('nav.login') }}</span>
      </button>
    </template>

    <!-- LOGGED IN -->
    <template v-else>
      <button class="bottom-nav-item" :class="{ active: isActive('/tabhub') }" @click="go('/tabhub')" aria-label="Mis Tabs">
        <i class="pi pi-th-large" aria-hidden="true"></i><span>{{ t('nav.tabs') }}</span>
      </button>
      <button class="bottom-nav-item" @click="toggleChat" aria-label="Chat">
        <i class="pi pi-comments" aria-hidden="true"></i><span>Chat</span>
      </button>
      <button class="bottom-nav-item has-badge" @click="emit('toggleNotifications')" :aria-label="t('notifications.title')">
        <i class="pi pi-bell" aria-hidden="true"></i>
        <span>{{ t('notifications.short') }}</span>
        <em v-if="notificationCount">{{ notificationCount > 9 ? '9+' : notificationCount }}</em>
      </button>
      <button class="bottom-nav-item" @click="emit('openConfig')" aria-label="Tema">
        <i class="pi pi-palette" aria-hidden="true"></i><span>{{ t('nav.theme') }}</span>
      </button>
    </template>

  </nav>
</template>

<style scoped>
/*
   1. TOP NAVBAR
    */
.navbar {
  width: 100%;
  max-width: 100vw;
  padding: 0.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px dashed var(--color-border-strong);
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background-color var(--duration-slow) var(--ease-standard);
}

.nav-left,
.nav-center,
.nav-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.nav-left  { justify-content: flex-start; }
.nav-center { justify-content: center; }
.nav-right { justify-content: flex-end; gap: 0.5rem; }

/* Logo como botón accesible */
.logo-container-nav {
  height: 56px;
  width: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  padding: 0;
  color: var(--color-accent);
  transition: transform var(--duration-base) var(--ease-bounce);
  cursor: pointer;
}

.logo-container-nav:hover {
  transform: scale(1.02);
}

.svg-logo {
  height: 100%;
  width: auto;
  overflow: visible;
}

/* Título agrupado con el logo */
.nav-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

/* Enlace centro (Landing/About) */
.nav-center-link {
  font-family: var(--font-ui);
  font-weight: 700;
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 1.1rem;
  transition: color var(--duration-fast) ease;
}
.nav-center-link:hover {
  color: var(--color-accent);
}

/* Tabs en Desktop */
.navbar-house-info {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.back-chip-nav {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-input-bg);
  color: var(--color-text);
  font-weight: 700;
  cursor: pointer;
  transition: background var(--duration-fast), border-color var(--duration-fast);
}
.back-chip-nav:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-accent);
}
.navbar-house-name {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.desktop-house-tabs {
  display: flex;
  gap: var(--space-4);
  height: 100%;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: var(--text-md);
  color: var(--color-text-muted);
  cursor: pointer;
  padding: var(--space-2) var(--space-3);
  position: relative;
  white-space: nowrap;
  transition: color var(--duration-base) var(--ease-standard), opacity var(--duration-base) var(--ease-standard);
  opacity: 0.7;
}

.tab-btn:hover {
  opacity: 1;
}

.tab-btn.active {
  color: var(--color-accent);
  opacity: 1;
}

.tab-underline {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: var(--color-accent);
  border-radius: var(--radius-sm);
}

.mobile-only {
  display: none;
}

/* Botones del nav */
.nav-icon-btn {
  color: var(--color-text-muted) !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.nav-icon-btn:hover,
.nav-icon-btn:focus,
.nav-icon-btn:focus-visible {
  color: var(--color-accent) !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.nav-text-btn { color: var(--color-text) !important; }

.language-menu {
  position: relative;
}

.language-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 700;
  box-shadow: none;
  transition: border-color var(--duration-fast), background var(--duration-fast), transform var(--duration-fast);
}

.language-trigger:hover {
  border-color: var(--color-accent);
  background: var(--accent-bg-subtle);
  transform: translateY(-1px);
}

.language-trigger .pi {
  color: var(--color-accent);
  font-size: 0.9rem;
}

.language-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 168px;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  display: grid;
  gap: 2px;
  z-index: 330;
}

.language-option {
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  border: 0;
  border-radius: var(--radius-md);
  padding: var(--space-2);
  background: transparent;
  color: var(--color-text);
  text-align: left;
}

.language-option span {
  color: var(--color-accent);
  font-weight: 700;
}

.language-option small {
  color: var(--color-text-muted);
  font-weight: 700;
}

.language-option:hover,
.language-option.active {
  background: var(--accent-bg-subtle);
}

.dropdown-language {
  display: none;
  padding: var(--space-2) var(--space-3);
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.dropdown-language span {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
}

.dropdown-language-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.dropdown-language-options button {
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-input-bg);
  color: var(--color-text-muted);
  font-weight: 700;
}

.dropdown-language-options button.active {
  border-color: var(--color-accent);
  background: var(--accent-bg-subtle);
  color: var(--color-accent);
}

.nav-user-avatar {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--accent-bg-icon);
  color: var(--color-accent);
  box-shadow: 0 10px 22px rgba(var(--color-accent-rgb), 0.2);
}

.nav-user-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.nav-user-avatar i {
  font-size: 1.1rem;
}

.nav-accent-btn {
  color: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
}

.nav-danger-btn {
  color: var(--color-error) !important;
  border-color: var(--color-error) !important;
}

.notification-trigger {
  position: relative;
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-muted);
  transition: color var(--duration-fast), border-color var(--duration-fast), background var(--duration-fast);
}

.notification-trigger:hover {
  border-color: var(--color-accent);
  background: var(--accent-bg-subtle);
  color: var(--color-accent);
}

.notification-badge,
.bottom-nav-item em {
  position: absolute;
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #fff;
  font-size: .65rem;
  font-style: normal;
  font-weight: 700;
  box-shadow: 0 0 0 2px var(--color-bg);
}

.notification-badge {
  top: -4px;
  right: -4px;
}

/* User Dropdown */
.user-dropdown-container {
  position: relative;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--accent-border);
  padding: 4px 12px 4px 4px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  color: var(--color-text);
  font-family: var(--font-ui);
  font-weight: 600;
  transition: background var(--duration-fast) ease, border-color var(--duration-fast) ease;
}

.user-dropdown-trigger:hover,
.user-dropdown-trigger[aria-expanded="true"] {
  background: var(--color-surface-hover);
  border-color: var(--color-accent);
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 300;
  animation: dropdownFade 0.2s ease-out;
}

@keyframes dropdownFade {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.user-dropdown-menu a {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.95rem;
  transition: background var(--duration-fast) ease, color var(--duration-fast) ease;
}

.user-dropdown-menu a:hover {
  background: var(--color-bg-alt);
  color: var(--color-accent);
}

.user-dropdown-menu a.danger {
  color: var(--color-error);
}

.user-dropdown-menu a.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--space-1) 0;
}

/*
   2. BOTTOM NAVIGATION BAR (solo móvil)
    */

/* Oculto en desktop */
.bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  /* En móvil: ocultar nombre de usuario en el dropdown trigger */
  .desktop-only {
    display: none;
  }

  .dropdown-language.mobile-only {
    display: grid;
  }

  .user-dropdown-trigger {
    padding: 2px;
    border: none;
    background: transparent;
  }

  .user-dropdown-trigger:hover,
  .user-dropdown-trigger[aria-expanded="true"] {
    background: transparent;
    border-color: transparent;
  }

  /* Ocultar el título del centro en móvil muy pequeño */
  .nav-title {
    font-size: 1.2rem;
  }

  /* Mostrar bottom nav */
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: var(--bottom-nav-height);
    z-index: 200;
    background-color: var(--color-drawer-bg);
    border-top: 1px solid var(--color-border-strong);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
    /* Soporte para notch de iOS */
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .bottom-nav-item {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.5rem 0.25rem;
    cursor: pointer;
    min-height: 44px; /* touch target */
    transition:
      color var(--duration-base) var(--ease-standard),
      transform var(--duration-fast) var(--ease-bounce);
    letter-spacing: 0.02em;
  }

  .bottom-nav-item i {
    font-size: 1.3rem;
    transition: transform var(--duration-fast) var(--ease-bounce);
  }

  .bottom-nav-item:active {
    transform: scale(0.9);
  }

  .bottom-nav-item.active {
    color: var(--color-accent);
  }

  .bottom-nav-item.active i {
    transform: translateY(-2px);
  }

  .bottom-nav-item em {
    top: 8px;
    right: calc(50% - 24px);
    box-shadow: 0 0 0 2px var(--color-drawer-bg);
  }

  .navbar-house-name {
    font-size: var(--text-lg);
    max-width: 120px;
  }
  .back-chip-nav {
    padding: 0 var(--space-2);
    min-height: 32px;
  }
  .back-chip-nav i {
    font-size: 0.9rem;
  }
  .desktop-house-tabs.desktop-only {
    display: none;
  }

  .mobile-house-menu.mobile-only {
    display: block;
    position: relative;
  }

  .hamburger-btn {
    background: none;
    border: none;
    color: var(--color-text);
    font-size: 1.4rem;
    padding: var(--space-2);
    cursor: pointer;
  }

  .mobile-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 180px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-2);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 300;
    animation: dropdownFade 0.2s ease-out;
  }

  .mobile-dropdown-menu a {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 1rem;
  }

  .mobile-dropdown-menu a.active {
    background: var(--accent-bg-subtle);
    color: var(--color-accent);
  }
}
</style>

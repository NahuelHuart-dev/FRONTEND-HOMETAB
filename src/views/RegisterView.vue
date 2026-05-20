<script setup>
/**
 * RegisterView.vue
 *
 * Vista de registro de cuenta nueva.
 *
 * CAMBIOS vs versión anterior:
 *   - CSS duplicado eliminado (comparte clases con LoginView via components.css)
 *   - Sin ternarios de color en el template
 *   - `go()` de useNavigation
 *   - Los campos Nombre/Apellido van en columna en móvil (Mobile-first)
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import http from '@/services/http'
import { useNavigation } from '@/composables/useNavigation'

const props = defineProps(['config'])
const { go } = useNavigation()
const { t } = useI18n()

const formFirstName      = ref('')
const formLastName       = ref('')
const formEmail          = ref('')
const formPassword       = ref('')
const formConfirmPassword = ref('')
const errorMessage  = ref('')
const successMessage = ref('')
const showTwoFactorQuestion = ref(false)
const isShaking = ref(false)

const isPasswordSecure = (pw) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw)

const handleRegister = async () => {
  errorMessage.value  = ''
  successMessage.value = ''

  if (!formFirstName.value || !formLastName.value || !formEmail.value || !formPassword.value) {
    errorMessage.value = 'Por favor, rellena todos los campos.'
    triggerShake(); return
  }
  if (formPassword.value !== formConfirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    triggerShake(); return
  }
  if (!isPasswordSecure(formPassword.value)) {
    errorMessage.value = 'Mínimo 8 caracteres, 1 mayúscula y 1 número.'
    triggerShake(); return
  }

  try {
    const response = await http.post('/register', {
      email:     formEmail.value,
      password:  formPassword.value,
      firstName: formFirstName.value,
      lastName:  formLastName.value
    })
    if (response.data.showTwoFactorPrompt) {
      successMessage.value = '¡Cuenta creada! Puedes activar la verificación en dos pasos al iniciar sesión.'
      showTwoFactorQuestion.value = true
      return
    }
    successMessage.value = '¡Cuenta creada! Redirigiendo...'
    setTimeout(() => go('/login'), 1500)
  } catch (error) {
    console.error(error)
    errorMessage.value = error.response?.status === 409
      ? 'Este email ya está registrado.'
      : 'Error al conectar con el servidor.'
    triggerShake()
  }
}

const triggerShake = () => {
  isShaking.value = true
  setTimeout(() => { isShaking.value = false }, 500)
}

const goLoginWithTwoFactorIntent = () => {
  localStorage.setItem('hometab_enable_2fa_after_login', 'true')
  go('/login')
}
</script>

<template>
  <div class="login-view-container">

    <div
      class="ht-paper-card register-card"
      :class="{ 'ht-shake': isShaking }"
    >
      <div class="ht-paper-tape" aria-hidden="true"></div>

      <h2 class="login-title">{{ t('auth.registerTitle') }}</h2>
      <p class="ht-text-muted ht-mb-3">{{ t('auth.join') }}</p>

      <p v-if="errorMessage"  class="ht-text-error   ht-mb-3" role="alert">{{ errorMessage }}</p>
      <p v-if="successMessage" class="ht-text-success ht-mb-3" role="status">{{ successMessage }}</p>

      <!-- Nombre + Apellido (fila en desktop, columna en móvil) -->
      <div class="name-row ht-mb-3">
        <div class="ht-text-left">
          <label class="ht-block ht-mb-1 form-label" for="reg-name">{{ t('profile.firstName') }}</label>
          <InputText id="reg-name" v-model="formFirstName" class="ht-input" />
        </div>
        <div class="ht-text-left">
          <label class="ht-block ht-mb-1 form-label" for="reg-lastname">{{ t('auth.surname') }}</label>
          <InputText id="reg-lastname" v-model="formLastName" class="ht-input" />
        </div>
      </div>

      <!-- Email -->
      <div class="ht-mb-3 ht-text-left">
        <label class="ht-block ht-mb-1 form-label" for="reg-email">Email</label>
        <InputText id="reg-email" v-model="formEmail" class="ht-input" type="email" autocomplete="email" />
      </div>

      <!-- Contraseña -->
      <div class="ht-mb-3 ht-text-left">
        <label class="ht-block ht-mb-1 form-label" for="reg-pass">{{ t('auth.password') }}</label>
        <Password
          inputId="reg-pass"
          v-model="formPassword"
          :feedback="true"
          toggleMask
          class="ht-pass-wrapper"
          inputClass="ht-pass-input"
          promptLabel="Mín. 8 caracteres, 1 mayúscula y 1 número"
          weakLabel="Débil" mediumLabel="Normal" strongLabel="Segura"
        />
      </div>

      <!-- Confirmar contraseña -->
      <div class="ht-mb-4 ht-text-left">
        <label class="ht-block ht-mb-1 form-label" for="reg-confirm">{{ t('auth.confirmPassword') }}</label>
        <Password
          inputId="reg-confirm"
          v-model="formConfirmPassword"
          :feedback="false"
          toggleMask
          class="ht-pass-wrapper"
          inputClass="ht-pass-input"
          @keyup.enter="handleRegister"
        />
      </div>

      <template v-if="showTwoFactorQuestion">
        <div class="two-factor-offer ht-mb-4">
          <i class="pi pi-shield" aria-hidden="true"></i>
          <p>{{ t('auth.enable2faQuestion') }}</p>
        </div>
        <Button :label="t('auth.yesLogin')" class="ht-w-full ht-mb-3 btn-login" @click="goLoginWithTwoFactorIntent" />
        <Button :label="t('auth.notNow')" class="ht-w-full btn-secondary-login" variant="outlined" @click="go('/login')" />
      </template>
      <template v-else>
        <Button :label="t('auth.register')"    class="ht-w-full ht-mb-3 btn-login" @click="handleRegister" />
        <Button :label="t('auth.backLogin')" class="ht-w-full btn-secondary-login" variant="outlined" @click="go('/login')" />
      </template>
    </div>

  </div>
</template>

<style scoped>
/**
 * SOLO estilos específicos de RegisterView.
 * Compartidos con LoginView via components.css.
 */

.login-view-container {
  min-height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-8) var(--space-4);
  width: 100%;
}

.register-card {
  max-width: 560px;
  padding-inline: clamp(var(--space-6), 7vw, var(--space-12));
  transform: rotate(-1deg);
  --p-inputtext-background: var(--color-input-bg);
  --p-inputtext-color: var(--color-text);
  --p-inputtext-border-color: var(--color-border-strong);
  --p-inputtext-hover-border-color: var(--accent-border-strong);
  --p-inputtext-focus-border-color: var(--color-accent);
  --p-inputtext-focus-ring-color: var(--accent-border);
  --p-inputtext-focus-ring-shadow: 0 0 0 4px var(--accent-border);
  --p-password-icon-color: var(--color-text-muted);
}

.login-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--color-accent);
  margin-bottom: var(--space-2);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

/* Fila nombre + apellido */
.name-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.name-row > * { min-width: 0; }

.register-card :deep(.p-inputtext),
.register-card :deep(.p-password),
.register-card :deep(.p-password-input) {
  width: 100% !important;
  max-width: 100%;
}

.register-card :deep(.p-inputtext),
.register-card :deep(.p-password-input) {
  background: var(--color-input-bg) !important;
  color: var(--color-text) !important;
  border: 2px solid var(--color-border-strong) !important;
  box-shadow: none !important;
}

.register-card :deep(.p-inputtext:hover),
.register-card :deep(.p-password-input:hover) {
  border-color: var(--accent-border-strong) !important;
}

.register-card :deep(.p-inputtext:enabled:focus),
.register-card :deep(.p-password-input:enabled:focus),
.register-card :deep(input:focus) {
  border-color: var(--color-accent) !important;
  box-shadow: 0 0 0 4px var(--accent-border) !important;
}

.register-card :deep(input:-webkit-autofill),
.register-card :deep(input:-webkit-autofill:hover),
.register-card :deep(input:-webkit-autofill:focus) {
  -webkit-text-fill-color: var(--color-text) !important;
  caret-color: var(--color-text) !important;
  box-shadow: 0 0 0 1000px var(--color-input-bg) inset, 0 0 0 4px var(--accent-border) !important;
  border-color: var(--color-accent) !important;
  transition: background-color 9999s ease-out 0s !important;
}

/* Botones */
.btn-login {
  background-color: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
  color: white !important;
  font-weight: 700;
}

.btn-secondary-login {
  color: var(--color-text) !important;
  border-color: var(--color-accent) !important;
}

.two-factor-offer {
  display: grid;
  gap: var(--space-3);
  justify-items: center;
  padding: var(--space-4);
  border: 1px dashed var(--accent-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
}

.two-factor-offer .pi {
  color: var(--color-accent);
  font-size: var(--icon-xl);
}

.two-factor-offer p {
  margin: 0;
  font-weight: 700;
  text-align: center;
}

/* En móvil: nombre/apellido en columna */
@media (max-width: 480px) {
  .name-row { grid-template-columns: 1fr; }
  .register-card {
    padding: var(--space-10) var(--space-6) var(--space-6);
    transform: rotate(0deg);
  }
  .login-title { font-size: var(--text-3xl); }
}
</style>

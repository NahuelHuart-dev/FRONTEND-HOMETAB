<script setup>
/**
 * LoginView.vue
 *
 * Vista de inicio de sesión.
 *
 * CAMBIOS vs versión anterior:
 *   - Estilos duplicados movidos a components.css (.ht-paper-card, .ht-input, etc.)
 *   - Eliminados ternarios de color del template (usan var(--color-*))
 *   - `go()` viene de useNavigation composable
 *   - CSS scoped reducido a solo lo específico de esta vista
 */
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import http from '@/services/http'
import { useNavigation } from '@/composables/useNavigation'

const props = defineProps(['config', 'isLoggedIn'])
const emit  = defineEmits(['update-auth'])
const { go } = useNavigation()
const { t } = useI18n()
const toast = useToast()

const formEmail    = ref('')
const formPassword = ref('')
const loginCode = ref('')
const enableCode = ref('')
const errorMessage = ref('')
const infoMessage = ref('')
const isShaking    = ref(false)
const isLoading = ref(false)
const step = ref('login')
const loginChallengeId = ref('')
const enableChallengeId = ref('')
const showResetDialog = ref(false)
const resetStep = ref('email')
const resetEmail = ref('')
const resetCode = ref('')
const resetChallengeId = ref('')
const resetToken = ref('')
const resetPassword = ref('')
const resetError = ref('')
const resetLoading = ref(false)

/** Redirige si ya está logueado */
onMounted(() => {
  if (localStorage.getItem('token')) go('/tabhub')
})

const handleLogin = async () => {
  errorMessage.value = ''
  infoMessage.value = ''
  isLoading.value = true
  try {
    const response = await http.post('/login_check', {
      username: formEmail.value,
      password: formPassword.value
    })
    if (response.data.requiresTwoFactor) {
      loginChallengeId.value = response.data.challengeId
      step.value = 'verify-login'
      infoMessage.value = response.data.message || 'Te hemos enviado un código por correo.'
      return
    }

    completeLogin(response.data)
  } catch (error) {
    console.error(error)
    errorMessage.value = '¡Ops! Email o contraseña incorrectos.'
    // Animar la tarjeta con shake
    isShaking.value = true
    setTimeout(() => { isShaking.value = false }, 500)
  } finally {
    isLoading.value = false
  }
}

const verifyLoginCode = async () => {
  errorMessage.value = ''
  infoMessage.value = ''
  isLoading.value = true
  try {
    const response = await http.post('/login/verify', {
      challengeId: loginChallengeId.value,
      code: loginCode.value
    })
    completeLogin(response.data)
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Código incorrecto o caducado.'
    isShaking.value = true
    setTimeout(() => { isShaking.value = false }, 500)
  } finally {
    isLoading.value = false
  }
}

const completeLogin = (data) => {
  localStorage.setItem('token', data.token)
  if (data.user) {
    localStorage.setItem('hometab_user', JSON.stringify(data.user))
  }
  emit('update-auth')

  if (data.showTwoFactorPrompt) {
    step.value = 'offer-2fa'
    infoMessage.value = 'Tu cuenta aún no tiene verificación en dos pasos.'
    if (localStorage.getItem('hometab_enable_2fa_after_login') === 'true') {
      localStorage.removeItem('hometab_enable_2fa_after_login')
      setTimeout(() => startEnableTwoFactor(), 0)
    }
    return
  }

  go('/tabhub')
}

const startEnableTwoFactor = async () => {
  errorMessage.value = ''
  infoMessage.value = ''
  isLoading.value = true
  try {
    const response = await http.post('/2fa/enable/start')
    enableChallengeId.value = response.data.challengeId
    step.value = 'enable-2fa'
    infoMessage.value = response.data.message || 'Te hemos enviado un código para activar 2FA.'
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo enviar el código de activación.'
  } finally {
    isLoading.value = false
  }
}

const verifyEnableCode = async () => {
  errorMessage.value = ''
  infoMessage.value = ''
  isLoading.value = true
  try {
    await http.post('/2fa/enable/verify', {
      challengeId: enableChallengeId.value,
      code: enableCode.value
    })
    go('/tabhub')
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Código incorrecto o caducado.'
  } finally {
    isLoading.value = false
  }
}

const skipTwoFactor = () => {
  go('/tabhub')
}

const backToLogin = () => {
  step.value = 'login'
  loginChallengeId.value = ''
  loginCode.value = ''
  errorMessage.value = ''
  infoMessage.value = ''
}

const openResetDialog = () => {
  resetStep.value = 'email'
  resetEmail.value = formEmail.value
  resetCode.value = ''
  resetChallengeId.value = ''
  resetToken.value = ''
  resetPassword.value = ''
  resetError.value = ''
  showResetDialog.value = true
}

const startPasswordReset = async () => {
  resetError.value = ''
  resetLoading.value = true
  try {
    const response = await http.post('/password-reset/start', { email: resetEmail.value })
    resetChallengeId.value = response.data.challengeId || ''
    resetStep.value = 'code'
    toast.add({ severity: 'info', summary: response.data.message || t('auth.resetSent'), life: 3000 })
  } catch (error) {
    resetError.value = error.response?.data?.error || t('auth.resetError')
  } finally {
    resetLoading.value = false
  }
}

const verifyPasswordReset = async () => {
  resetError.value = ''
  resetLoading.value = true
  try {
    const response = await http.post('/password-reset/verify', {
      challengeId: resetChallengeId.value,
      code: resetCode.value
    })
    resetToken.value = response.data.resetToken
    resetStep.value = 'password'
  } catch (error) {
    resetError.value = error.response?.data?.error || t('auth.resetInvalid')
  } finally {
    resetLoading.value = false
  }
}

const finishPasswordReset = async () => {
  resetError.value = ''
  resetLoading.value = true
  try {
    await http.post('/password-reset/finish', {
      resetToken: resetToken.value,
      password: resetPassword.value
    })
    toast.add({ severity: 'success', summary: t('auth.resetDone'), life: 2600 })
    showResetDialog.value = false
  } catch (error) {
    resetError.value = error.response?.data?.error || t('auth.resetError')
  } finally {
    resetLoading.value = false
  }
}
</script>

<template>
  <div class="login-view-container">

    <!--
      .ht-paper-card    -> definido en components.css (fondo glassmorphism, bordes, shadow)
      .ht-pop-in        -> animación definida en animations.css
      .ht-shake         -> se activa en error de validación
    -->
    <div
      class="ht-paper-card login-card"
      :class="{
        'ht-pop-in': true,
        'ht-shake':  isShaking
      }"
    >
      <!-- Cinta de celo (definida en components.css como .ht-paper-tape) -->
      <div class="ht-paper-tape" aria-hidden="true"></div>

      <h2 class="login-title">{{ t('auth.welcome') }}</h2>
      <p class="ht-text-muted ht-mb-3">{{ t('auth.access') }}</p>

      <!-- Mensaje de error -->
      <p v-if="errorMessage" class="ht-text-error ht-mb-3" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="infoMessage" class="ht-text-muted ht-mb-3" role="status">
        {{ infoMessage }}
      </p>

      <template v-if="step === 'login'">
        <!-- Email -->
        <div class="ht-mb-3 ht-text-left">
          <label class="ht-block ht-mb-1 form-label" for="login-email">Email</label>
          <InputText
            id="login-email"
            v-model="formEmail"
            class="ht-input"
            type="email"
            autocomplete="email"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Contraseña -->
        <div class="ht-mb-4 ht-text-left">
          <label class="ht-block ht-mb-1 form-label" for="login-password">{{ t('auth.password') }}</label>
          <Password
            inputId="login-password"
            v-model="formPassword"
            :feedback="false"
            toggleMask
            class="ht-pass-wrapper"
            inputClass="ht-pass-input"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Botones -->
        <Button
          :label="isLoading ? t('auth.entering') : t('auth.enter')"
          class="ht-w-full ht-mb-3 btn-login"
          :disabled="isLoading"
          @click="handleLogin"
        />
        <button type="button" class="forgot-link" @click="openResetDialog">
          {{ t('auth.forgotPassword') }}
        </button>
        <Button
          :label="t('auth.createAccount')"
          class="ht-w-full ht-mb-3 btn-secondary-login"
          variant="outlined"
          @click="go('/register')"
        />
        <Button
          :label="t('common.cancel')"
          class="ht-w-full btn-ghost-login"
          variant="text"
          @click="go('/')"
        />
      </template>

      <template v-else-if="step === 'verify-login'">
        <div class="ht-mb-4 ht-text-left">
          <label class="ht-block ht-mb-1 form-label" for="login-code">{{ t('auth.code') }}</label>
          <InputText
            id="login-code"
            v-model="loginCode"
            class="ht-input code-input"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            @keyup.enter="verifyLoginCode"
          />
        </div>
        <Button
          :label="isLoading ? t('auth.verifying') : t('auth.verifyCode')"
          class="ht-w-full ht-mb-3 btn-login"
          :disabled="isLoading"
          @click="verifyLoginCode"
        />
        <Button :label="t('common.back')" class="ht-w-full btn-ghost-login" variant="text" @click="backToLogin" />
      </template>

      <template v-else-if="step === 'offer-2fa'">
        <div class="two-factor-offer ht-mb-4">
          <i class="pi pi-shield" aria-hidden="true"></i>
          <p>{{ t('auth.enable2faQuestion') }}</p>
        </div>
        <Button
          :label="isLoading ? t('common.loading') : t('auth.enable2fa')"
          class="ht-w-full ht-mb-3 btn-login"
          :disabled="isLoading"
          @click="startEnableTwoFactor"
        />
        <Button :label="t('auth.notNow')" class="ht-w-full btn-secondary-login" variant="outlined" @click="skipTwoFactor" />
      </template>

      <template v-else-if="step === 'enable-2fa'">
        <div class="ht-mb-4 ht-text-left">
          <label class="ht-block ht-mb-1 form-label" for="enable-code">{{ t('auth.activationCode') }}</label>
          <InputText
            id="enable-code"
            v-model="enableCode"
            class="ht-input code-input"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            @keyup.enter="verifyEnableCode"
          />
        </div>
        <Button
          :label="isLoading ? t('common.loading') : t('auth.activateVerification')"
          class="ht-w-full ht-mb-3 btn-login"
          :disabled="isLoading"
          @click="verifyEnableCode"
        />
        <Button :label="t('auth.notNow')" class="ht-w-full btn-secondary-login" variant="outlined" @click="skipTwoFactor" />
      </template>
    </div>

    <Dialog v-model:visible="showResetDialog" modal :header="t('auth.resetTitle')" :style="{ width: '90%', maxWidth: '460px' }">
      <div class="reset-dialog">
        <p class="ht-text-muted">{{ t('auth.resetSubtitle') }}</p>
        <p v-if="resetError" class="ht-text-error" role="alert">{{ resetError }}</p>

        <template v-if="resetStep === 'email'">
          <label class="form-label" for="reset-email">Email</label>
          <InputText id="reset-email" v-model="resetEmail" class="ht-input" type="email" autocomplete="email" @keyup.enter="startPasswordReset" />
          <Button :label="resetLoading ? t('common.loading') : t('auth.sendCode')" class="btn-login" :loading="resetLoading" @click="startPasswordReset" />
        </template>

        <template v-else-if="resetStep === 'code'">
          <label class="form-label" for="reset-code">{{ t('auth.code') }}</label>
          <InputText id="reset-code" v-model="resetCode" class="ht-input code-input" maxlength="6" inputmode="numeric" autocomplete="one-time-code" @keyup.enter="verifyPasswordReset" />
          <Button :label="resetLoading ? t('auth.verifying') : t('auth.verifyCode')" class="btn-login" :loading="resetLoading" @click="verifyPasswordReset" />
        </template>

        <template v-else>
          <label class="form-label" for="reset-password">{{ t('auth.newPassword') }}</label>
          <Password inputId="reset-password" v-model="resetPassword" :feedback="false" toggleMask class="ht-pass-wrapper" inputClass="ht-pass-input" @keyup.enter="finishPasswordReset" />
          <Button :label="resetLoading ? t('common.loading') : t('auth.changePassword')" class="btn-login" :loading="resetLoading" @click="finishPasswordReset" />
        </template>
      </div>
    </Dialog>

  </div>
</template>

<style scoped>
/**
 * SOLO estilos específicos de LoginView.
 * Los estilos compartidos (.ht-paper-card, .ht-paper-tape,
 * .ht-input, .ht-text-error, etc.) viven en components.css.
 */

.login-view-container {
  min-height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-8) var(--space-4);
  width: 100%;
}

/* La tarjeta tiene rotación inicial (sobrescribe la de ht-paper-card) */
.login-card {
  max-width: 560px;
  padding-inline: clamp(var(--space-6), 7vw, var(--space-12));
  transform: rotate(1deg); /* rotación inicial, hover la resetea */
  --p-inputtext-background: var(--color-input-bg);
  --p-inputtext-color: var(--color-text);
  --p-inputtext-border-color: var(--color-border-strong);
  --p-inputtext-hover-border-color: var(--accent-border-strong);
  --p-inputtext-focus-border-color: var(--color-accent);
  --p-inputtext-focus-ring-color: var(--accent-border);
  --p-inputtext-focus-ring-shadow: 0 0 0 4px var(--accent-border);
  --p-password-icon-color: var(--color-text-muted);
}

/* Título con color de acento */
.login-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--color-accent);
  margin-bottom: var(--space-2);
}

/* Labels de formulario */
.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.login-card :deep(.p-inputtext),
.login-card :deep(.p-password),
.login-card :deep(.p-password-input) {
  width: 100% !important;
  max-width: 100%;
}

.login-card :deep(.p-inputtext),
.login-card :deep(.p-password-input) {
  background: var(--color-input-bg) !important;
  color: var(--color-text) !important;
  border: 2px solid var(--color-border-strong) !important;
  box-shadow: none !important;
}

.login-card :deep(.p-inputtext:hover),
.login-card :deep(.p-password-input:hover) {
  border-color: var(--accent-border-strong) !important;
}

.login-card :deep(.p-inputtext:enabled:focus),
.login-card :deep(.p-password-input:enabled:focus),
.login-card :deep(input:focus) {
  border-color: var(--color-accent) !important;
  box-shadow: 0 0 0 4px var(--accent-border) !important;
}

.login-card :deep(input:-webkit-autofill),
.login-card :deep(input:-webkit-autofill:hover),
.login-card :deep(input:-webkit-autofill:focus) {
  -webkit-text-fill-color: var(--color-text) !important;
  caret-color: var(--color-text) !important;
  box-shadow: 0 0 0 1000px var(--color-input-bg) inset, 0 0 0 4px var(--accent-border) !important;
  border-color: var(--color-accent) !important;
  transition: background-color 9999s ease-out 0s !important;
}

/* Colores de botones via CSS vars */
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

.btn-ghost-login {
  color: var(--color-text-muted) !important;
}

.forgot-link {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font-weight: 700;
  margin: calc(var(--space-2) * -1) 0 var(--space-3);
  padding: var(--space-2);
}

.reset-dialog {
  display: grid;
  gap: var(--space-4);
}

.reset-dialog .btn-login {
  justify-self: end;
  min-width: 150px;
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
}

.code-input {
  text-align: center;
  letter-spacing: 0.18em;
  font-weight: 700;
}

/* Reducir padding en pantallas muy pequeñas */
@media (max-width: 480px) {
  .login-card {
    padding: var(--space-10) var(--space-6) var(--space-6);
  }
  .login-title { font-size: var(--text-3xl); }
}
</style>

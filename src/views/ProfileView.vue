<script setup>
import { ref, onMounted } from 'vue'
import http, { assetUrl } from '@/services/http'
import { useNavigation } from '@/composables/useNavigation'
import { useI18n } from 'vue-i18n'

const { go } = useNavigation()
const { t } = useI18n()

const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const avatarIcons = ['pi-user', 'pi-home', 'pi-star', 'pi-heart', 'pi-sparkles', 'pi-briefcase', 'pi-crown', 'pi-face-smile', 'pi-bolt', 'pi-sun']

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  bio: '',
  avatarIcon: 'pi-user',
  avatarCropData: '',
  removeAvatar: false,
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const currentAvatar = ref(null)
const currentAvatarFailed = ref(false)

onMounted(async () => {
  try {
    const response = await http.get('/profile')
    const user = response.data
    formData.value.firstName = user.firstName || ''
    formData.value.lastName = user.lastName || ''
    formData.value.email = user.email || ''
    formData.value.phoneNumber = user.phoneNumber || ''
    formData.value.bio = user.bio || ''
    formData.value.avatarIcon = user.avatarIcon || 'pi-user'
    
    currentAvatar.value = assetUrl(user.avatar)
    currentAvatarFailed.value = false
  } catch (error) {
    console.error('Error fetching profile:', error)
    errorMessage.value = 'No se pudo cargar el perfil.'
  } finally {
    isLoading.value = false
  }
})

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    errorMessage.value = t('profile.avatarInvalid')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    formData.value.avatarCropData = e.target.result
    currentAvatar.value = e.target.result
    currentAvatarFailed.value = false
    formData.value.removeAvatar = false
  }
  reader.readAsDataURL(file)
}

const handleRemoveAvatar = () => {
  formData.value.removeAvatar = true
  formData.value.avatarCropData = ''
  currentAvatar.value = null
}

const handleSave = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isSaving.value = true

  try {
    const payload = { ...formData.value }
    const response = await http.post('/profile', payload)
    
    successMessage.value = 'Perfil actualizado correctamente.'
    
    // Reset password fields
    formData.value.currentPassword = ''
    formData.value.newPassword = ''
    formData.value.confirmPassword = ''
    formData.value.avatarCropData = ''
    
    // Actualizar usuario en localStorage para el Navbar
    if (response.data.user) {
      localStorage.setItem('hometab_user', JSON.stringify(response.data.user))
      // Refrescar página para que el Navbar agarre los nuevos datos (o emitir un evento)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }

  } catch (error) {
    console.error('Error saving profile:', error)
    errorMessage.value = error.response?.data?.error || 'Error al guardar el perfil.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="profile-view-container">
    <div class="ht-paper-card profile-card ht-pop-in">
      <div class="ht-paper-tape" aria-hidden="true"></div>
      
      <div class="profile-header ht-mb-4">
        <Button icon="pi pi-arrow-left" text rounded @click="go('/tabhub')" aria-label="Volver" />
        <h2 class="profile-title">{{ t('profile.title') }}</h2>
        <div style="width: 40px"></div> <!-- Spacer -->
      </div>

      <div v-if="isLoading" class="ht-text-center ht-my-4">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--color-accent)"></i>
      </div>

      <div v-else>
        <!-- Mensajes -->
        <p v-if="errorMessage" class="ht-text-error ht-mb-3" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="ht-text-success ht-mb-3" role="status">{{ successMessage }}</p>

        <!-- Avatar Section -->
        <div class="avatar-section ht-mb-4">
          <div class="avatar-preview">
            <img v-if="currentAvatar && !currentAvatarFailed" :src="currentAvatar" alt="Avatar" @error="currentAvatarFailed = true">
            <i v-else :class="['pi', formData.avatarIcon]"></i>
          </div>
          
          <div class="avatar-actions">
            <label class="btn-upload ht-btn ht-btn-sm">
              <i class="pi pi-upload ht-mr-2"></i> {{ t('profile.uploadPhoto') }}
              <input type="file" accept="image/png,image/jpeg,image/webp" class="ht-hidden" @change="handleFileSelect">
            </label>
            <button v-if="currentAvatar" type="button" class="avatar-delete-btn" @click="handleRemoveAvatar" aria-label="Eliminar foto">
              <i class="pi pi-trash"></i>
            </button>
          </div>

          <div v-if="!currentAvatar" class="icon-selector ht-mt-3">
            <p class="ht-text-sm ht-text-muted ht-mb-2">{{ t('profile.chooseIcon') }}</p>
            <div class="icon-grid">
              <button 
                v-for="icon in avatarIcons" :key="icon"
                type="button"
                class="icon-btn"
                :class="{ active: formData.avatarIcon === icon }"
                @click="formData.avatarIcon = icon"
              >
                <i :class="['pi', icon]"></i>
              </button>
            </div>
          </div>
        </div>

        <hr class="ht-divider ht-mb-4" />

        <!-- Datos Personales -->
        <h3 class="ht-text-lg ht-mb-3">{{ t('profile.personalData') }}</h3>
        <div class="profile-form-grid ht-mb-4">
          <div class="form-field">
            <label class="form-label">{{ t('profile.firstName') }}</label>
            <InputText v-model="formData.firstName" class="ht-input" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('profile.lastName') }}</label>
            <InputText v-model="formData.lastName" class="ht-input" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('profile.email') }}</label>
            <InputText v-model="formData.email" type="email" class="ht-input" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('profile.phone') }}</label>
            <InputText v-model="formData.phoneNumber" class="ht-input" />
          </div>
          <div class="form-field full-width">
            <label class="form-label">{{ t('profile.bio') }}</label>
            <InputText v-model="formData.bio" class="ht-input" />
          </div>
        </div>

        <hr class="ht-divider ht-mb-4" />

        <!-- Cambiar Contraseña -->
        <h3 class="ht-text-lg ht-mb-3">{{ t('profile.changePassword') }}</h3>
        <p class="ht-text-sm ht-text-muted ht-mb-3">{{ t('profile.passwordHint') }}</p>
        <div class="profile-form-grid ht-mb-4">
          <div class="form-field full-width">
            <label class="form-label">{{ t('profile.currentPassword') }}</label>
            <Password v-model="formData.currentPassword" toggleMask :feedback="false" inputClass="ht-pass-input" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('profile.newPassword') }}</label>
            <Password v-model="formData.newPassword" toggleMask :feedback="false" inputClass="ht-pass-input" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('profile.repeatPassword') }}</label>
            <Password v-model="formData.confirmPassword" toggleMask :feedback="false" inputClass="ht-pass-input" />
          </div>
        </div>

        <!-- Acciones -->
        <div class="form-actions ht-mt-4">
          <Button :label="t('common.cancel')" variant="text" class="btn-ghost-login ht-mr-2" @click="go('/tabhub')" />
          <Button :label="isSaving ? t('common.saving') : t('profile.saveChanges')" class="btn-login" :disabled="isSaving" @click="handleSave" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view-container {
  min-height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-4);
  width: 100%;
}

.profile-card {
  width: 100%;
  max-width: 600px;
  padding: var(--space-6);
  --p-inputtext-background: var(--color-input-bg);
  --p-inputtext-color: var(--color-text);
  --p-inputtext-border-color: var(--color-border-strong);
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--color-accent);
  margin: 0;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--accent-bg-icon);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  box-shadow: var(--shadow-md);
  border: 4px solid var(--color-surface);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.btn-upload {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-upload:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-accent);
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.icon-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-accent);
}

.icon-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--accent-bg-icon);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
}

.profile-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.profile-card :deep(.p-inputtext),
.profile-card :deep(.p-password),
.profile-card :deep(.p-password-input) {
  width: 100% !important;
  max-width: 100%;
  background: var(--color-input-bg) !important;
  color: var(--color-text) !important;
  border: 2px solid var(--color-border-strong) !important;
  box-shadow: none !important;
}

.profile-card :deep(.p-inputtext:focus),
.profile-card :deep(.p-password-input:focus) {
  border-color: var(--color-accent) !important;
}

.btn-login {
  background-color: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
  color: white !important;
  font-weight: 700;
}

.btn-ghost-login {
  color: var(--color-text-muted) !important;
}

.ht-divider {
  border: 0;
  height: 1px;
  background: var(--color-border);
}

.ht-text-success { color: var(--color-accent); }

.avatar-delete-btn {
  width: 42px;
  height: 42px;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-error);
}

.avatar-delete-btn:hover {
  background: rgba(239, 68, 68, 0.12);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 600px) {
  .profile-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

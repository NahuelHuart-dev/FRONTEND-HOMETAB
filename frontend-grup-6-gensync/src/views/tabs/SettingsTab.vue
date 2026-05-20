<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import http, { assetUrl } from '@/services/http';
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const props = defineProps(['config', 'homeId']);
const { t } = useI18n();
const toast = useToast();
const { confirm } = useConfirmDialog();
const miembros = ref([]);
const inviteCode = ref("");
const household = ref(null);
const cargando = ref(true);
const accionMensaje = ref({ texto: "", tipo: "" });

// Variables para editar el código
const editandoCodigo = ref(false);
const nuevoCodigo = ref("");
const guardandoCodigo = ref(false);
const guardandoCasa = ref(false);
const householdIcons = ['pi-home', 'pi-building', 'pi-users', 'pi-heart', 'pi-star', 'pi-briefcase', 'pi-sparkles', 'pi-crown', 'pi-map-marker', 'pi-key'];
const houseForm = ref({
  name: '',
  avatarIcon: 'pi-home',
  avatarCropData: '',
  removeAvatar: false
});

const cargarDatos = async () => {
  try {
    const response = await http.get(`/households/${props.homeId}/members`);
    miembros.value = response.data.members;
    inviteCode.value = response.data.inviteCode;
    household.value = response.data.household;
    houseForm.value.name = response.data.household?.name || '';
    houseForm.value.avatarIcon = response.data.household?.avatarIcon || 'pi-home';
  } catch (error) {
    console.error("Error cargando configuración:", error);
  } finally {
    cargando.value = false;
  }
};

const primeIcon = (icon) => {
  if (!icon) return 'pi pi-home';
  return icon.startsWith('pi ') ? icon : `pi ${icon}`;
};

const uploadUrl = (path) => assetUrl(path);

const handleHouseAvatarFile = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    accionMensaje.value = { texto: "La imagen debe ser PNG, JPG o WEBP y pesar menos de 2MB.", tipo: "error" };
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    houseForm.value.avatarCropData = String(reader.result || '');
    houseForm.value.removeAvatar = false;
  };
  reader.readAsDataURL(file);
};

const guardarCasa = async () => {
  if (!houseForm.value.name.trim()) {
    accionMensaje.value = { texto: "El nombre de la casa no puede estar vacío.", tipo: "error" };
    return;
  }

  guardandoCasa.value = true;
  try {
    const response = await http.put(`/households/${props.homeId}`, {
      name: houseForm.value.name,
      avatarIcon: houseForm.value.avatarIcon,
      avatarCropData: houseForm.value.avatarCropData || null,
      removeAvatar: houseForm.value.removeAvatar
    });

    household.value = response.data.household;
    houseForm.value.avatarCropData = '';
    houseForm.value.removeAvatar = false;
    accionMensaje.value = { texto: "Casa actualizada correctamente.", tipo: "success" };
  } catch (error) {
    console.error("Error guardando casa:", error);
    accionMensaje.value = { texto: error.response?.data?.error || "Error guardando la casa.", tipo: "error" };
  } finally {
    guardandoCasa.value = false;
    setTimeout(() => accionMensaje.value = { texto: "", tipo: "" }, 4000);
  }
};

onMounted(() => {
  cargarDatos();
});

const copiarCodigo = () => {
  if (inviteCode.value) {
    navigator.clipboard.writeText(inviteCode.value);
    toast.add({ severity: 'success', summary: t('settings.copied'), life: 1800 });
    accionMensaje.value = { texto: t('settings.copied'), tipo: "success" };
    setTimeout(() => accionMensaje.value = { texto: "", tipo: "" }, 3000);
  }
};

const iniciarEdicionCodigo = () => {
  nuevoCodigo.value = inviteCode.value;
  editandoCodigo.value = true;
};

const guardarNuevoCodigo = async () => {
  if (!nuevoCodigo.value.trim()) return;

  guardandoCodigo.value = true;
  try {
    const response = await http.put(`/households/${props.homeId}/invite-code`, {
      code: nuevoCodigo.value
    });

    inviteCode.value = response.data.inviteCode;
    editandoCodigo.value = false;
    accionMensaje.value = { texto: t('settings.codeSaved'), tipo: "success" };
  } catch (error) {
    console.error("Error al cambiar código:", error);
    accionMensaje.value = { texto: error.response?.data?.error || "Error al cambiar el código.", tipo: "error" };
  } finally {
    guardandoCodigo.value = false;
    setTimeout(() => accionMensaje.value = { texto: "", tipo: "" }, 4000);
  }
};

const expulsarMiembro = async (userId, nombre) => {
  const ok = await confirm({
    title: 'Expulsar miembro',
    message: `Quieres expulsar a ${nombre} de la casa?`,
    confirmLabel: 'Expulsar',
  });
  if (!ok) return;

  try {
    await http.delete(`/households/${props.homeId}/members/${userId}`);
    miembros.value = miembros.value.filter(m => m.id !== userId);
    accionMensaje.value = { texto: `${nombre} ha sido expulsado.`, tipo: "success" };
    setTimeout(() => accionMensaje.value = { texto: "", tipo: "" }, 3000);
  } catch (error) {
    console.error("Error al expulsar:", error);
    accionMensaje.value = { texto: error.response?.data?.error || "Error al expulsar.", tipo: "error" };
    setTimeout(() => accionMensaje.value = { texto: "", tipo: "" }, 3000);
  }
};
</script>

<template>
  <div class="tab-wrapper">

    <div class="tab-header">
      <div class="header-title">
        <i class="pi pi-cog icon-header" :style="{ color: config.colorAcento, backgroundColor: config.colorAcento + '20' }"></i>
        <h2 :style="{ color: config.darkMode ? '#fff' : '#333' }">{{ t('settings.title') }}</h2>
      </div>
    </div>

    <div v-if="cargando" class="text-center loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem" :style="{ color: config.colorAcento }"></i>
    </div>

    <div v-else class="settings-content">

      <div v-if="accionMensaje.texto" class="feedback-msg" :class="accionMensaje.tipo">
        <i :class="accionMensaje.tipo === 'success' ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'"></i>
        {{ accionMensaje.texto }}
      </div>

      <div class="settings-card" :style="{ borderColor: config.colorAcento + '50', backgroundColor: config.darkMode ? '#ffffff05' : '#00000005' }">
        <h3 class="section-title">{{ t('settings.identity') }}</h3>
        <p class="section-desc">{{ t('settings.identityDesc') }}</p>

        <div class="house-identity-grid">
          <div class="house-preview">
            <img v-if="houseForm.avatarCropData || (!houseForm.removeAvatar && household?.avatar)" :src="houseForm.avatarCropData || uploadUrl(household?.avatar)" alt="" />
            <i v-else :class="primeIcon(houseForm.avatarIcon)"></i>
          </div>

          <div class="house-fields">
            <label class="field-label">
              Nombre
              <InputText v-model="houseForm.name" class="ht-input ht-w-full" />
            </label>

            <label class="field-label">
              Icono
              <div class="icon-picker">
                <button
                  v-for="icon in householdIcons"
                  :key="icon"
                  type="button"
                  class="icon-choice"
                  :class="{ selected: houseForm.avatarIcon === icon }"
                  @click="houseForm.avatarIcon = icon"
                >
                  <i :class="primeIcon(icon)"></i>
                </button>
              </div>
            </label>

            <label class="field-label">
              Foto
              <input type="file" accept="image/png,image/jpeg,image/webp" @change="handleHouseAvatarFile" />
            </label>

            <div class="house-actions">
              <Button
                :label="t('settings.removePhoto')"
                text
                size="small"
                @click="houseForm.avatarCropData = ''; houseForm.removeAvatar = true"
              />
              <Button
                :label="t('settings.saveHouse')"
                icon="pi pi-save"
                :loading="guardandoCasa"
                @click="guardarCasa"
                class="save-house-btn"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="settings-card" :style="{ borderColor: config.colorAcento + '50', backgroundColor: config.darkMode ? '#ffffff05' : '#00000005' }">
        <h3 class="section-title">{{ t('settings.inviteCode') }}</h3>
        <p class="section-desc">{{ t('settings.inviteDesc') }}</p>

        <div class="invite-code-box" :style="{ borderColor: config.colorAcento }">

          <template v-if="!editandoCodigo">
            <span class="code" :style="{ color: config.colorAcento }">{{ inviteCode || 'No generado' }}</span>
            <div style="display: flex; gap: 0.5rem;">
              <button class="action-btn" @click="iniciarEdicionCodigo" title="Personalizar Código" :style="{ backgroundColor: 'transparent', border: '1px solid ' + config.colorAcento, color: config.colorAcento }">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="action-btn" @click="copiarCodigo" :style="{ backgroundColor: config.colorAcento, color: 'white', border: 'none' }">
                <i class="pi pi-copy"></i> {{ t('common.copy') }}
              </button>
            </div>
          </template>

          <template v-else>
            <InputText v-model="nuevoCodigo" style="text-transform: uppercase; font-size: 1.5rem; font-weight: 700; width: 60%;" placeholder="NUEVO-CODIGO" />
            <div style="display: flex; gap: 0.5rem;">
              <button class="action-btn" @click="editandoCodigo = false" :style="{ backgroundColor: '#ef4444', color: 'white', border: 'none' }">
                <i class="pi pi-times"></i>
              </button>
              <button class="action-btn" @click="guardarNuevoCodigo" :disabled="guardandoCodigo" :style="{ backgroundColor: config.colorAcento, color: 'white', border: 'none' }">
                <i :class="guardandoCodigo ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>
              </button>
            </div>
          </template>

        </div>
      </div>

      <div class="settings-card" :style="{ borderColor: config.colorAcento + '50', backgroundColor: config.darkMode ? '#ffffff05' : '#00000005' }">
        <h3 class="section-title" style="margin-bottom: 1rem;">{{ t('settings.members') }} ({{ miembros.length }})</h3>

        <div class="members-list">
          <div v-for="miembro in miembros" :key="miembro.id" class="member-item" :style="{ borderColor: config.colorAcento + '30' }">
            <div class="member-info">
              <div class="member-avatar" :style="{ backgroundColor: config.colorAcento + '20', color: config.colorAcento }">
                <img v-if="miembro.avatar" :src="uploadUrl(miembro.avatar)" alt="" />
                <i v-else-if="miembro.avatarIcon" :class="primeIcon(miembro.avatarIcon)"></i>
                <span v-else>{{ miembro.firstName.charAt(0).toUpperCase() }}</span>
              </div>
              <div>
                <p class="member-name" :style="{ color: config.darkMode ? '#fff' : '#333' }">{{ miembro.firstName }} {{ miembro.lastName }}</p>
                <p class="member-email">{{ miembro.email }}</p>
              </div>
            </div>

            <div class="member-actions">
              <span v-if="miembro.role === 'owner'" class="role-badge owner" :style="{ backgroundColor: config.colorAcento, color: 'white' }">{{ t('settings.owner') }}</span>
              <span v-else class="role-badge member" :style="{ backgroundColor: config.darkMode ? '#444' : '#eee', color: config.darkMode ? '#fff' : '#333' }">{{ t('settings.member') }}</span>

              <button v-if="miembro.role !== 'owner'" class="kick-btn" @click="expulsarMiembro(miembro.id, miembro.firstName)" title="Expulsar">
                <i class="pi pi-user-minus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.tab-wrapper { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.loading-state { padding: 3rem 0; }
.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-title { display: flex; align-items: center; gap: 1rem; }
.header-title h2 { margin: 0; font-size: 2rem; }
.icon-header { font-size: 1.5rem; padding: 0.8rem; border-radius: 12px; }

.feedback-msg { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 700; }
.feedback-msg.success { background-color: var(--accent-bg-subtle); color: var(--color-accent); border: 1px solid var(--color-accent); }
.feedback-msg.error { background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; }

.settings-content { display: flex; flex-direction: column; gap: 2rem; }
.settings-card { border: 2px dashed; border-radius: 12px; padding: 2rem; }
.section-title { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
.section-desc { margin: 0 0 1.5rem 0; opacity: 0.7; }

.house-identity-grid { display: grid; grid-template-columns: 140px 1fr; gap: 2rem; align-items: start; }
.house-preview { width: 128px; height: 128px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid var(--color-accent); background: var(--accent-bg-subtle); color: var(--color-accent); overflow: hidden; }
.house-preview i { font-size: 3rem; }
.house-preview img { width: 100%; height: 100%; object-fit: cover; }
.house-fields { display: grid; gap: 1rem; }
.field-label { display: grid; gap: 0.5rem; font-weight: 700; }
.icon-picker { display: grid; grid-template-columns: repeat(5, minmax(0, 48px)); gap: 0.5rem; }
.icon-choice { height: 42px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-input-bg); color: var(--color-text-muted); }
.icon-choice.selected { border-color: var(--color-accent); color: var(--color-accent); background: var(--accent-bg-subtle); }
.house-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
.save-house-btn { background-color: var(--color-accent) !important; border-color: var(--color-accent) !important; color: white !important; }

/* CODIGO DE INVITACIN */
.invite-code-box {
  display: flex; align-items: center; justify-content: space-between;
  border: 2px solid; border-radius: 8px; padding: 1rem 1.5rem;
  background-color: rgba(0,0,0,0.02); max-width: 600px;
}
.code { font-size: 2.2rem; font-weight: 700; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; }
.action-btn { padding: 0.8rem 1.2rem; border-radius: 6px; font-weight: 700; cursor: pointer; transition: transform 0.2s; display: flex; gap: 0.5rem; align-items: center; }
.action-btn:hover:not(:disabled) { transform: scale(1.05); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* LISTA DE MIEMBROS */
.members-list { display: flex; flex-direction: column; gap: 1rem; }
.member-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid; border-radius: 8px; background-color: rgba(0,0,0,0.02); }
.member-info { display: flex; align-items: center; gap: 1rem; }
.member-avatar { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; overflow: hidden; flex: 0 0 auto; }
.member-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.member-avatar i { font-size: 1.25rem; }
.member-name { margin: 0; font-weight: 700; font-size: 1.1rem; }
.member-email { margin: 0; font-size: 0.9rem; opacity: 0.6; }
.member-actions { display: flex; align-items: center; gap: 1rem; }
.role-badge { padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 700; }
.kick-btn { background: none; border: 1px solid #ef4444; color: #ef4444; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.kick-btn:hover { background-color: #ef4444; color: white; transform: scale(1.1); }

@media (max-width: 768px) {
  .house-identity-grid { grid-template-columns: 1fr; }
}
</style>

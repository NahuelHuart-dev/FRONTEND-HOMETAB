<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import http from '@/services/http';
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const props = defineProps(['config', 'homeId']);
const { t } = useI18n();
const toast = useToast();
const { confirm } = useConfirmDialog();
const tasks = ref([]);
const miembros = ref([]);
const cargando = ref(true);

// Fecha mínima (Hoy)
const minDate = new Date().toISOString().split('T')[0];

// Variables Modal y Edición
const mostrarModal = ref(false);
const mostrarDetalle = ref(false);
const guardando = ref(false);
const errorMensaje = ref("");
const modoEdicion = ref(false);
const tareaEditandoId = ref(null);
const tareaSeleccionada = ref(null);
const filtroEstado = ref('all');
const filtroPrioridad = ref('all');
const ordenTareas = ref('due');

const nuevaTarea = ref({
  title: "",
  description: "",
  category: "",
  priority: "Mitja",
  dueDate: "",
  periodicity: "",
  assignedTo: "ruleta" // Por defecto, que decida el destino
});

const cargarDatos = async () => {
  try {
    // Cargamos Tareas y Miembros a la vez
    const [tasksRes, membersRes] = await Promise.all([
      http.get(`/households/${props.homeId}/tasks`),
      http.get(`/households/${props.homeId}/members`)
    ]);
    tasks.value = tasksRes.data;
    miembros.value = membersRes.data.members;
  } catch (error) {
    console.error("Error cargando datos:", error);
  } finally {
    cargando.value = false;
  }
};

onMounted(() => {
  cargarDatos();
});

const isOverdue = (tarea) => tarea.dueDate && tarea.dueDate < minDate && !tarea.completed;
const isToday = (tarea) => tarea.dueDate === minDate;
const priorityWeight = (priority) => ({ Alta: 0, Mitja: 1, Media: 1, Baixa: 2, Baja: 2 }[priority] ?? 3);
const filteredTasks = computed(() => tasks.value
  .filter(tarea => filtroEstado.value === 'all' || (filtroEstado.value === 'pending' ? !tarea.completed : tarea.completed))
  .filter(tarea => filtroPrioridad.value === 'all' || String(tarea.priority || '').toLowerCase() === filtroPrioridad.value)
  .sort((a, b) => {
    if (ordenTareas.value === 'priority') return priorityWeight(a.priority) - priorityWeight(b.priority);
    if (ordenTareas.value === 'assignee') return nombreAsignado(a).localeCompare(nombreAsignado(b));
    return String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31'));
  }));
const pendientes = computed(() => filteredTasks.value.filter(t => !t.completed));
const completadas = computed(() => filteredTasks.value.filter(t => t.completed));

const abrirModalCrear = () => {
  modoEdicion.value = false;
  tareaEditandoId.value = null;
  nuevaTarea.value = { title: "", description: "", category: "", priority: "Mitja", dueDate: "", periodicity: "", assignedTo: "ruleta" };
  errorMensaje.value = "";
  mostrarModal.value = true;
};

const abrirModalEditar = (tarea) => {
  modoEdicion.value = true;
  tareaEditandoId.value = tarea.id;
  nuevaTarea.value = {
    title: tarea.title,
    description: tarea.description || "",
    category: tarea.category || "",
    priority: tarea.priority || "Mitja",
    dueDate: tarea.dueDate ? tarea.dueDate : "",
    periodicity: tarea.periodicity || "",
    assignedTo: tarea.assignedTo ? tarea.assignedTo.id : miembros.value[0]?.id
  };
  errorMensaje.value = "";
  mostrarModal.value = true;
};

const abrirDetalle = (tarea) => {
  tareaSeleccionada.value = tarea;
  mostrarDetalle.value = true;
};

const guardarTarea = async () => {
  if (!nuevaTarea.value.title.trim()) {
    errorMensaje.value = "El título es obligatorio.";
    return;
  }

  guardando.value = true;
  errorMensaje.value = "";

  // x} LA MAGIA DE LA RULETA RUSA x}
  let idAsignado = nuevaTarea.value.assignedTo;
  if (idAsignado === "ruleta") {
    const indiceAleatorio = Math.floor(Math.random() * miembros.value.length);
    idAsignado = miembros.value[indiceAleatorio].id;
  }

  try {
    const payload = {
      title: nuevaTarea.value.title,
      description: nuevaTarea.value.description,
      category: nuevaTarea.value.category || null,
      priority: nuevaTarea.value.priority,
      dueDate: nuevaTarea.value.dueDate || null,
      assignedTo: idAsignado,
      periodicity: idAsignado === "ruleta" ? "Rotativa" : (nuevaTarea.value.periodicity || null)
    };

    if (modoEdicion.value) {
      const response = await http.put(`/households/${props.homeId}/tasks/${tareaEditandoId.value}`, payload);
      const index = tasks.value.findIndex(t => t.id === tareaEditandoId.value);
      if (index !== -1) tasks.value[index] = response.data.task;
      toast.add({ severity: 'success', summary: 'Tarea actualizada', life: 2200 });
    } else {
      const response = await http.post(`/households/${props.homeId}/tasks`, payload);
      tasks.value.push(response.data.task);
      toast.add({ severity: 'success', summary: 'Tarea creada', life: 2200 });
    }

    mostrarModal.value = false;
  } catch (error) {
    console.error("Error al guardar:", error);
    errorMensaje.value = error.response?.data?.error || "Error al guardar en el servidor.";
  } finally {
    guardando.value = false;
  }
};

const toggleCompletada = async (tarea) => {
  const estadoOriginal = tarea.completed;
  tarea.completed = !tarea.completed; // Optimistic UI

  try {
    await http.put(`/households/${props.homeId}/tasks/${tarea.id}`, {
      completed: tarea.completed
    });
    toast.add({ severity: 'success', summary: tarea.completed ? 'Tarea completada' : 'Tarea reabierta', life: 1800 });
  } catch (error) {
    tarea.completed = estadoOriginal;
    toast.add({ severity: 'error', summary: 'Error al actualizar la tarea', life: 2600 });
  }
};

const borrarTarea = async (id) => {
  const ok = await confirm({
    title: 'Eliminar tarea',
    message: 'Esta tarea se borrara definitivamente.',
    confirmLabel: 'Eliminar',
  });
  if (!ok) return;
  try {
    await http.delete(`/households/${props.homeId}/tasks/${id}`);
    tasks.value = tasks.value.filter(t => t.id !== id);
    toast.add({ severity: 'success', summary: 'Tarea eliminada', life: 2200 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'No se ha podido borrar la tarea', life: 2600 });
  }
};

const formatearFecha = (fecha) => {
  if (!fecha) return "";
  return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const nombreAsignado = (tarea) => {
  if (!tarea.assignedTo) return 'Sin asignar';
  return `${tarea.assignedTo.firstName} ${tarea.assignedTo.lastName || ''}`.trim();
};
</script>

<template>
  <div class="tab-wrapper">

    <div class="tab-header">
      <div class="header-title">
        <i class="pi pi-check-square icon-header" :style="{ color: config.colorAcento, backgroundColor: config.colorAcento + '20' }"></i>
        <h2 :style="{ color: config.darkMode ? '#fff' : '#333' }">{{ t('tasks.board') }}</h2>
      </div>
      <Button :label="t('tasks.new')" icon="pi pi-plus" class="btn-nuevo"
              :style="{ backgroundColor: config.colorAcento, borderColor: config.colorAcento, color: 'white' }"
              @click="abrirModalCrear" />
    </div>

    <div class="task-toolbar">
      <select v-model="filtroEstado" aria-label="Filtrar por estado">
        <option value="all">{{ t('tasks.all') }}</option>
        <option value="pending">{{ t('tasks.todo') }}</option>
        <option value="done">{{ t('tasks.doneColumn') }}</option>
      </select>
      <select v-model="filtroPrioridad" aria-label="Filtrar por prioridad">
        <option value="all">{{ t('tasks.allPriorities') }}</option>
        <option value="alta">{{ t('tasks.high') }}</option>
        <option value="mitja">{{ t('tasks.medium') }}</option>
        <option value="baixa">{{ t('tasks.low') }}</option>
      </select>
      <select v-model="ordenTareas" aria-label="Ordenar tareas">
        <option value="due">{{ t('tasks.sortDue') }}</option>
        <option value="priority">{{ t('tasks.sortPriority') }}</option>
        <option value="assignee">{{ t('tasks.sortAssignee') }}</option>
      </select>
    </div>

    <div v-if="cargando" class="text-center loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2.5rem" :style="{ color: config.colorAcento }"></i>
    </div>

    <div v-else class="tasks-board">

      <div class="task-column">
        <h3 class="column-title">{{ t('tasks.todo') }} <span class="counter">{{ pendientes.length }}</span></h3>
        <div class="task-list">
          <div v-if="pendientes.length === 0" class="empty-state">{{ t('tasks.clean') }}</div>

          <div v-for="tarea in pendientes" :key="tarea.id" class="task-card" :style="{ borderColor: config.colorAcento + '40', backgroundColor: config.darkMode ? '#ffffff05' : '#00000005' }">
            <div class="task-header">
              <div class="badge-row">
                <span class="task-badge" :class="tarea.priority?.toLowerCase()">{{ tarea.priority }}</span>
                <span v-if="isOverdue(tarea)" class="life-badge danger">{{ t('tasks.overdue') }}</span>
                <span v-else-if="isToday(tarea)" class="life-badge">{{ t('tasks.today') }}</span>
              </div>
              <div class="task-actions">
                <button class="icon-btn" @click="abrirDetalle(tarea)" aria-label="Ver detalle"><i class="pi pi-eye"></i></button>
                <button class="icon-btn" @click="abrirModalEditar(tarea)" aria-label="Editar tarea"><i class="pi pi-pencil"></i></button>
                <button class="icon-btn delete" @click="borrarTarea(tarea.id)" aria-label="Eliminar tarea"><i class="pi pi-trash"></i></button>
              </div>
            </div>

            <h4 class="task-title" :style="{ color: config.darkMode ? '#fff' : '#333' }">{{ tarea.title }}</h4>
            <p v-if="tarea.description" class="task-desc">{{ tarea.description }}</p>
            <div class="task-tags">
              <span v-if="tarea.category"><i class="pi pi-tag"></i>{{ tarea.category }}</span>
              <span v-if="tarea.periodicity"><i class="pi pi-sync"></i>{{ tarea.periodicity }}</span>
            </div>

            <div class="task-footer">
              <div class="task-meta">
                <span v-if="tarea.dueDate" class="meta-item" :style="{ color: tarea.dueDate < minDate ? '#ef4444' : 'inherit' }">
                  <i class="pi pi-calendar"></i> {{ formatearFecha(tarea.dueDate) }}
                </span>
                <span v-if="tarea.assignedTo" class="meta-item assignee">
                  <i class="pi pi-user"></i> {{ nombreAsignado(tarea) }}
                </span>
              </div>
              <button class="complete-btn" :style="{ backgroundColor: config.colorAcento + '20', color: config.colorAcento }" @click="toggleCompletada(tarea)" aria-label="Marcar tarea como completada">
                <i class="pi pi-check"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="task-column">
        <h3 class="column-title">{{ t('tasks.doneColumn') }} <span class="counter">{{ completadas.length }}</span></h3>
        <div class="task-list">
          <div v-if="completadas.length === 0" class="empty-state">{{ t('tasks.noneDone') }}</div>

          <div v-for="tarea in completadas" :key="tarea.id" class="task-card completed-card" style="border-color: var(--accent-border); background-color: var(--accent-bg-subtle);">
            <div class="task-header">
              <span class="task-badge" style="background: var(--accent-bg-icon); color: var(--color-accent);">{{ t('tasks.done') }}</span>
              <div class="task-actions">
                <button class="icon-btn" @click="abrirDetalle(tarea)" aria-label="Ver detalle"><i class="pi pi-eye"></i></button>
                <button class="icon-btn" @click="abrirModalEditar(tarea)" aria-label="Editar tarea"><i class="pi pi-pencil"></i></button>
                <button class="icon-btn delete" @click="borrarTarea(tarea.id)" aria-label="Eliminar tarea"><i class="pi pi-trash"></i></button>
              </div>
            </div>

            <h4 class="task-title" style="text-decoration: line-through; opacity: 0.7;">{{ tarea.title }}</h4>

            <div class="task-footer">
              <div class="task-meta">
                <span v-if="tarea.assignedTo" class="meta-item assignee"><i class="pi pi-user"></i> {{ nombreAsignado(tarea) }}</span>
              </div>
              <button class="complete-btn" style="background-color: var(--color-accent); color: white;" @click="toggleCompletada(tarea)" aria-label="Reabrir tarea">
                <i class="pi pi-undo"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <Dialog v-model:visible="mostrarDetalle" modal header="Detalle de tarea" :style="{ width: 'min(94vw, 680px)' }">
      <div v-if="tareaSeleccionada" class="task-detail">
        <div class="detail-hero">
          <div>
            <span class="task-badge" :class="tareaSeleccionada.priority?.toLowerCase()">{{ tareaSeleccionada.priority }}</span>
            <h3>{{ tareaSeleccionada.title }}</h3>
            <p>{{ tareaSeleccionada.description || 'Sin descripción' }}</p>
          </div>
          <button class="complete-btn" :style="{ backgroundColor: tareaSeleccionada.completed ? 'var(--color-accent)' : config.colorAcento + '20', color: tareaSeleccionada.completed ? 'white' : config.colorAcento }" @click="toggleCompletada(tareaSeleccionada)">
            <i :class="tareaSeleccionada.completed ? 'pi pi-undo' : 'pi pi-check'"></i>
          </button>
        </div>
        <div class="detail-grid">
          <div><span>{{ t('tasks.assignedTo') }}</span><strong>{{ nombreAsignado(tareaSeleccionada) }}</strong></div>
          <div><span>{{ t('tasks.dueDate') }}</span><strong>{{ tareaSeleccionada.dueDate ? formatearFecha(tareaSeleccionada.dueDate) : '-' }}</strong></div>
          <div><span>{{ t('tasks.category') }}</span><strong>{{ tareaSeleccionada.category || '-' }}</strong></div>
          <div><span>{{ t('tasks.periodicity') }}</span><strong>{{ tareaSeleccionada.periodicity || '-' }}</strong></div>
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="mostrarModal" modal :header="modoEdicion ? 'Editar Tarea' : 'Nueva Tarea'" :style="{ width: '90%', maxWidth: '500px' }">
      <div class="pt-3" :style="{ color: config.darkMode ? '#fff' : '#333' }">

        <div class="form-group mb-3">
          <label class="block mb-2 ht-font-bold label-row">{{ t('tasks.what') }} <span class="required-mark">*</span></label>
          <InputText v-model="nuevaTarea.title" class="w-full comfy-input" :placeholder="t('tasks.what')"
                     :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none' }" />
        </div>

        <div class="form-group mb-3">
          <label class="block mb-2 ht-font-bold">{{ t('tasks.description') }}</label>
          <textarea v-model="nuevaTarea.description" class="w-full comfy-input native-textarea" rows="3" :placeholder="t('tasks.description')"
                    :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none' }"></textarea>
        </div>

        <div class="form-group mb-3">
          <label class="block mb-2 ht-font-bold label-row">{{ t('tasks.whoseTurn') }} <span class="required-mark">*</span></label>
          <select v-model="nuevaTarea.assignedTo" class="w-full comfy-input native-select"
                  :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none', colorScheme: config.darkMode ? 'dark' : 'light' }">
            <option value="ruleta" :style="{ backgroundColor: config.darkMode ? '#292524' : '#fff', color: config.darkMode ? '#fff' : '#333' }">{{ t('tasks.roulette') }}</option>
            <option disabled :style="{ backgroundColor: config.darkMode ? '#292524' : '#fff', color: config.darkMode ? '#aaa' : '#999' }"></option>
            <option v-for="miembro in miembros" :key="miembro.id" :value="miembro.id" :style="{ backgroundColor: config.darkMode ? '#292524' : '#fff', color: config.darkMode ? '#fff' : '#333' }">
              {{ miembro.firstName }} {{ miembro.lastName }}
            </option>
          </select>
        </div>

        <div class="form-grid mb-3">
          <div class="form-group">
            <label class="block mb-2 ht-font-bold">{{ t('tasks.category') }}</label>
            <InputText v-model="nuevaTarea.category" class="w-full comfy-input" :placeholder="t('tasks.category')"
                       :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none' }" />
          </div>

          <div class="form-group">
            <label class="block mb-2 ht-font-bold">{{ t('tasks.dueDate') }}</label>
            <input type="date" v-model="nuevaTarea.dueDate" :min="minDate" class="w-full comfy-input native-date"
                   :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none', colorScheme: config.darkMode ? 'dark' : 'light' }" />
          </div>

          <div class="form-group">
            <label class="block mb-2 ht-font-bold label-row">{{ t('tasks.priority') }} <span class="required-mark">*</span></label>
            <select v-model="nuevaTarea.priority" class="w-full comfy-input native-select"
                    :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none', colorScheme: config.darkMode ? 'dark' : 'light' }">
              <option value="Baixa" :style="{ backgroundColor: config.darkMode ? '#292524' : '#fff', color: config.darkMode ? '#fff' : '#333' }">{{ t('tasks.low') }}</option>
              <option value="Mitja" :style="{ backgroundColor: config.darkMode ? '#292524' : '#fff', color: config.darkMode ? '#fff' : '#333' }">{{ t('tasks.medium') }}</option>
              <option value="Alta" :style="{ backgroundColor: config.darkMode ? '#292524' : '#fff', color: config.darkMode ? '#fff' : '#333' }">{{ t('tasks.high') }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="block mb-2 ht-font-bold">{{ t('tasks.periodicity') }}</label>
            <InputText v-model="nuevaTarea.periodicity" class="w-full comfy-input" :placeholder="t('tasks.periodicity')"
                       :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none' }" />
          </div>
        </div>

        <small v-if="errorMensaje" style="color: #ef4444; display: block; margin-top: 1rem; font-weight: 700;">
          <i class="pi pi-exclamation-circle"></i> {{ errorMensaje }}
        </small>
        <p class="required-hint">{{ t('common.requiredHint') }}</p>

        <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
          <Button :label="t('common.cancel')" text @click="mostrarModal = false" :style="{ color: config.darkMode ? '#aaa' : '#666' }" />
          <Button :label="modoEdicion ? t('tasks.saveChanges') : t('tasks.assign')" :loading="guardando" @click="guardarTarea" :style="{ backgroundColor: config.colorAcento, border: 'none', color: 'white' }" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.tab-wrapper { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.loading-state { padding: 5rem 0; }

.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.header-title { display: flex; align-items: center; gap: 1rem; }
.header-title h2 { margin: 0; font-size: 2rem; }
.icon-header { font-size: 1.5rem; padding: 0.8rem; border-radius: 12px; }
.btn-nuevo { font-weight: 700; border-radius: 8px; padding: 0.6rem 1.2rem; transition: transform 0.2s; }
.btn-nuevo:hover { transform: translateY(-2px); }

.task-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: calc(var(--space-4) * -1) 0 var(--space-4);
}

.task-toolbar select {
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-input-bg);
  color: var(--color-text);
  padding: 0 var(--space-3);
  font-weight: 700;
}

/* TABLON KANBAN MEJORADO */
.tasks-board { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4); align-items: start; }

.task-column { display: flex; flex-direction: column; gap: .75rem; background: rgba(0,0,0,0.02); padding: var(--space-4); border-radius: 12px; border: 1px dashed rgba(150,150,150,0.2); }
.column-title { margin: 0 0 1rem 0; font-size: 1.2rem; display: flex; justify-content: space-between; align-items: center; opacity: 0.8; }
.counter { background: rgba(150,150,150,0.2); padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.9rem; }

.task-list { display: flex; flex-direction: column; gap: .75rem; min-height: 100px; }
.empty-state { padding: var(--space-8) var(--space-3); text-align: center; opacity: 0.65; font-style: italic; border: 1px dashed var(--color-border); border-radius: var(--radius-md); }

.task-card {
  display: flex; flex-direction: column; gap: 0.55rem;
  padding: .85rem; border: 1px dashed; border-radius: 10px;
  transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}
.task-card:hover { transform: translateY(-3px); border-style: solid; box-shadow: 0 8px 15px rgba(0,0,0,0.05); }

.task-header { display: flex; justify-content: space-between; align-items: center; }
.badge-row { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; }
.task-badge, .life-badge { font-size: 0.68rem; padding: 0.25rem 0.48rem; border-radius: 999px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;}
.task-badge.baja { background: var(--accent-bg-icon); color: var(--color-accent); }
.task-badge.media { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.task-badge.alta { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.life-badge { background: rgba(14, 165, 233, 0.14); color: #0ea5e9; }
.life-badge.danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.task-actions { display: flex; gap: 0.35rem; opacity: 0; transition: opacity 0.2s; }
.task-card:hover .task-actions { opacity: 1; }
.icon-btn { width: 30px; height: 30px; display: grid; place-items: center; background: var(--color-input-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; opacity: 0.72; transition: all 0.2s; color: inherit; }
.icon-btn:hover { opacity: 1; transform: scale(1.1); }
.icon-btn.delete:hover { color: #ef4444; }

.task-title { margin: 0; font-size: 1rem; font-weight: 700; line-height: 1.25; }
.task-desc { margin: 0; font-size: 0.82rem; opacity: 0.7; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.task-tags { display: flex; flex-wrap: wrap; gap: .45rem; }
.task-tags span { display: inline-flex; align-items: center; gap: .35rem; padding: .25rem .5rem; border-radius: 999px; background: rgba(150,150,150,.14); font-size: .78rem; font-weight: 700; opacity: .8; }

.task-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 0.25rem; }
.task-meta { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.76rem; font-weight: 700; opacity: 0.8; }
.meta-item { display: flex; align-items: center; gap: 0.4rem; }
.assignee { color: #8b5cf6; }

.complete-btn {
  width: 34px; height: 34px; border-radius: 10px; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 1rem;
}
.complete-btn:hover { transform: scale(1.1) rotate(5deg); }

/* FORMS */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.w-full { width: 100%; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.block { display: block; }
:deep(.comfy-input) { border-radius: 8px; padding: 0.8rem; outline: none; font-family: inherit; }
.native-select, .native-date { font-size: 1rem; cursor: pointer; height: 46px; }
.native-textarea { font-family: inherit; font-size: 1rem; border: none; outline: none; resize: vertical; box-sizing: border-box; }
.label-row { display: inline-flex; align-items: center; gap: .25rem; }
.required-mark, .required-hint { color: var(--color-error); }
.required-mark { font-weight: 700; line-height: 1; }
.required-hint { margin: 1rem 0 0; font-size: .78rem; font-weight: 700; text-align: left; }
.task-detail { display: grid; gap: 1rem; }
.detail-hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1rem; border: 1px dashed rgba(150,150,150,.3); border-radius: 10px; }
.detail-hero h3 { margin: .5rem 0 .3rem; font-size: 1.4rem; }
.detail-hero p { margin: 0; opacity: .75; }
.detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; }
.detail-grid div { padding: .85rem; border: 1px dashed rgba(150,150,150,.28); border-radius: 8px; }
.detail-grid span { display: block; color: v-bind('config.colorAcento'); font-size: .78rem; font-weight: 700; text-transform: uppercase; margin-bottom: .25rem; }
.detail-grid strong { font-size: .95rem; }

@media (max-width: 768px) {
  .tasks-board { grid-template-columns: 1fr; }
  .task-actions { opacity: 1; } /* En móvil siempre visibles */
  .tab-header { margin-bottom: var(--space-4); }
  .header-title h2 { font-size: var(--text-2xl); }
  .task-toolbar { margin-top: 0; }
  .task-toolbar select { flex: 1 1 150px; }
  .task-column { padding: var(--space-3); }
}
</style>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import http from '@/services/http';

const props = defineProps(['config', 'homeId']);
const { t, locale } = useI18n();
const items = ref([]);
const miembros = ref([]);
const cargando = ref(true);

const fechaActual = ref(new Date());
const selectorMesAbierto = ref(false);
const selectorAnioAbierto = ref(false);

const mostrarModal = ref(false);
const guardando = ref(false);
const errorMensaje = ref("");
const nuevoEvento = ref({ title: "", description: "", startDate: "", endDate: "", location: "", isAllDay: false, participants: [] });

const mostrarModalDetalle = ref(false);
const diaSeleccionado = ref(null);

const cargarTodo = async () => {
  try {
    const [eventsRes, tasksRes, expensesRes, membersRes] = await Promise.all([
      http.get(`/households/${props.homeId}/events`),
      http.get(`/households/${props.homeId}/tasks`),
      http.get(`/households/${props.homeId}/expenses`),
      http.get(`/households/${props.homeId}/members`)
    ]);
    miembros.value = membersRes.data.members || [];

    const todosLosItems = [];

    // Mantenemos los colores base de los items para diferenciarlos (hasta que hagas el selector en Settings)
    eventsRes.data.forEach(e => {
      if (e.startDate) {
        todosLosItems.push({
          id: `ev-${e.id}`, type: 'event', title: e.title,
          dateStr: new Date(e.startDate).toLocaleDateString('en-CA'),
          color: e.color || '#3b82f6', icon: 'pi-calendar', completed: false,
          raw: e,
          subtitle: e.participants?.length ? `${e.participants.length} participantes` : (e.createdBy?.name ? `Creado por ${e.createdBy.name}` : 'Evento')
        });
      }
    });

    tasksRes.data.forEach(t => {
      if (t.dueDate) {
        todosLosItems.push({
          id: `tk-${t.id}`, type: 'task', title: t.title,
          dateStr: new Date(t.dueDate).toLocaleDateString('en-CA'),
          color: props.config.colorAcento, icon: 'pi-check-square', completed: t.completed,
          raw: t,
          subtitle: t.assignedTo ? `Asignada a ${t.assignedTo.firstName} ${t.assignedTo.lastName || ''}` : 'Sin asignar'
        });
      }
    });

    expensesRes.data.forEach(ex => {
      const calendarDate = ex.dueDate || (ex.paidAt ? ex.paidAt.split(' ')[0] : null);
      if (calendarDate) {
        todosLosItems.push({
          id: `ex-${ex.id}`, type: 'expense', title: ex.title,
          dateStr: new Date(calendarDate).toLocaleDateString('en-CA'),
          color: '#ef4444', icon: 'pi-wallet', completed: ex.paymentType === 'shared' ? ex.allParticipantsPaid : ex.isPaid,
          raw: ex,
          subtitle: ex.paymentType === 'shared' ? `${ex.shares?.length || 0} participantes` : `Individual · ${ex.paidBy?.name || ''}`
        });
      }
    });

    items.value = todosLosItems;

  } catch (error) {
    console.error("Error cargando el calendario:", error);
  } finally {
    cargando.value = false;
  }
};

onMounted(() => {
  cargarTodo();
});

const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const mesActualTexto = computed(() => {
  return fechaActual.value.toLocaleDateString(locale.value, { month: 'long' }).toUpperCase();
});

const anioActualTexto = computed(() => fechaActual.value.getFullYear());
const mesesSelector = computed(() => Array.from({ length: 12 }, (_, index) => ({
  index,
  label: new Date(fechaActual.value.getFullYear(), index, 1).toLocaleDateString(locale.value, { month: 'short' }).replace('.', ''),
})));
const aniosSelector = computed(() => {
  const actual = fechaActual.value.getFullYear();
  const inicio = actual - 6;
  return Array.from({ length: 13 }, (_, index) => inicio + index);
});

const cambiarMes = (incremento) => {
  const nuevaFecha = new Date(fechaActual.value.getFullYear(), fechaActual.value.getMonth() + incremento, 1);
  fechaActual.value = nuevaFecha;
  diaSeleccionado.value = null;
};

const seleccionarMes = (mes) => {
  fechaActual.value = new Date(fechaActual.value.getFullYear(), mes, 1);
  selectorMesAbierto.value = false;
  diaSeleccionado.value = null;
};

const seleccionarAnio = (anio) => {
  fechaActual.value = new Date(anio, fechaActual.value.getMonth(), 1);
  selectorAnioAbierto.value = false;
  diaSeleccionado.value = null;
};

const moverRangoAnio = (incremento) => {
  fechaActual.value = new Date(fechaActual.value.getFullYear() + incremento, fechaActual.value.getMonth(), 1);
  diaSeleccionado.value = null;
};

const irHoy = () => {
  fechaActual.value = new Date();
  selectorMesAbierto.value = false;
  selectorAnioAbierto.value = false;
  diaSeleccionado.value = null;
};

const diasDelMes = computed(() => {
  const anio = fechaActual.value.getFullYear();
  const mes = fechaActual.value.getMonth();

  let primerDiaSemana = new Date(anio, mes, 1).getDay();
  primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

  const totalDiasMes = new Date(anio, mes + 1, 0).getDate();
  const dias = [];

  for (let i = 0; i < primerDiaSemana; i++) {
    dias.push({ empty: true });
  }

  for (let d = 1; d <= totalDiasMes; d++) {
    const dateStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const itemsDelDia = items.value.filter(item => item.dateStr === dateStr);
    const hoy = new Date().toLocaleDateString('en-CA');

    dias.push({ empty: false, number: d, dateStr: dateStr, items: itemsDelDia, isHoy: dateStr === hoy });
  }

  return dias;
});

const agendaMostrada = computed(() => {
  if (diaSeleccionado.value) return diaSeleccionado.value;
  return diasDelMes.value.find(d => d.isHoy) || { dateStr: '', items: [] };
});

const abrirDetalleDia = (dia) => {
  diaSeleccionado.value = dia;
  if (window.innerWidth > 768) {
    mostrarModalDetalle.value = true;
  }
};

const abrirModalNuevo = (fechaPredefinida = null) => {
  errorMensaje.value = "";
  let fechaFormat = "";

  if (fechaPredefinida) {
    fechaFormat = `${fechaPredefinida}T12:00`;
  }

  nuevoEvento.value = { title: "", description: "", startDate: fechaFormat, endDate: "", location: "", isAllDay: false, participants: [] };
  mostrarModal.value = true;
};

const formatearFechaDia = (dateStr) => {
  if (!dateStr) return '';
  const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', opciones);
};

const crearEvento = async () => {
  if (!nuevoEvento.value.title.trim() || !nuevoEvento.value.startDate) {
    errorMensaje.value = "El título y la fecha de inicio son obligatorios.";
    return;
  }

  guardando.value = true;
  errorMensaje.value = "";

  try {
    const payload = {
      title: nuevoEvento.value.title,
      startDate: nuevoEvento.value.startDate,
      endDate: nuevoEvento.value.endDate || null,
      location: nuevoEvento.value.location || null,
      isAllDay: nuevoEvento.value.isAllDay,
      description: nuevoEvento.value.description,
      participants: nuevoEvento.value.participants
    };

    await http.post(`/households/${props.homeId}/events`, payload);
    await cargarTodo();
    mostrarModal.value = false;

  } catch (error) {
    console.error("Error al crear evento:", error);
    errorMensaje.value = "Error al guardar el evento.";
  } finally {
    guardando.value = false;
  }
};

const toggleParticipant = (id) => {
  if (nuevoEvento.value.participants.includes(id)) {
    nuevoEvento.value.participants = nuevoEvento.value.participants.filter((item) => item !== id);
  } else {
    nuevoEvento.value.participants.push(id);
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const expensePaid = (expense) => expense.paymentType === 'shared' ? expense.allParticipantsPaid : expense.isPaid;
</script>

<template>
  <div class="tab-wrapper" :style="{ '--acento-hover': config.colorAcento + '15', '--acento-shadow': config.colorAcento + '60' }">

    <div class="tab-header">
      <div class="header-title">
        <i class="pi pi-calendar icon-header" :style="{ color: config.colorAcento, backgroundColor: config.colorAcento + '20' }"></i>
        <h2 :style="{ color: config.darkMode ? '#fff' : '#333' }">{{ t('calendar.title') }}</h2>
      </div>
      <Button :label="t('calendar.new')" icon="pi pi-plus" class="btn-nuevo"
              :style="{ backgroundColor: config.colorAcento, borderColor: config.colorAcento, color: 'white' }"
              @click="abrirModalNuevo()" />
    </div>

    <div v-if="cargando" class="text-center loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2.5rem" :style="{ color: config.colorAcento }"></i>
    </div>

    <div v-else class="calendar-container" :style="{ borderColor: config.darkMode ? '#444' : '#e5e5e5', backgroundColor: config.darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }">

      <div class="calendar-nav" :style="{ borderBottomColor: config.darkMode ? '#444' : '#e5e5e5' }">
        <button class="nav-btn" @click="cambiarMes(-1)" :style="{ color: config.darkMode ? '#fff' : '#333' }"><i class="pi pi-chevron-left"></i></button>
        <div class="calendar-title-picker">
          <div class="picker-part">
            <button class="month-title picker-trigger" @click="selectorMesAbierto = !selectorMesAbierto; selectorAnioAbierto = false" :style="{ color: config.darkMode ? '#fff' : '#333' }">{{ mesActualTexto }}</button>
            <div v-if="selectorMesAbierto" class="picker-popover months-popover">
              <button v-for="mes in mesesSelector" :key="mes.index" :class="{ active: mes.index === fechaActual.getMonth() }" @click="seleccionarMes(mes.index)">{{ mes.label }}</button>
            </div>
          </div>
          <div class="picker-part">
            <button class="month-title year-trigger" @click="selectorAnioAbierto = !selectorAnioAbierto; selectorMesAbierto = false" :style="{ color: config.darkMode ? '#fff' : '#333' }">{{ anioActualTexto }}</button>
            <div v-if="selectorAnioAbierto" class="picker-popover years-popover">
              <div class="year-range-actions">
                <button @click="moverRangoAnio(-12)"><i class="pi pi-angle-left"></i></button>
                <span>{{ aniosSelector[0] }} - {{ aniosSelector[aniosSelector.length - 1] }}</span>
                <button @click="moverRangoAnio(12)"><i class="pi pi-angle-right"></i></button>
              </div>
              <button v-for="anio in aniosSelector" :key="anio" :class="{ active: anio === fechaActual.getFullYear() }" @click="seleccionarAnio(anio)">{{ anio }}</button>
            </div>
          </div>
        </div>
        <div class="nav-actions">
          <button class="today-btn" type="button" @click="irHoy">{{ t('calendar.today') }}</button>
          <button class="nav-btn" @click="cambiarMes(1)" :style="{ color: config.darkMode ? '#fff' : '#333' }"><i class="pi pi-chevron-right"></i></button>
        </div>
      </div>

      <div class="calendar-weekdays" :style="{ borderBottomColor: config.darkMode ? '#444' : '#e5e5e5' }">
        <div v-for="dia in diasSemana" :key="dia" class="weekday-name">{{ dia }}</div>
      </div>

      <div class="calendar-grid">
        <div
            v-for="(dia, index) in diasDelMes"
            :key="index"
            class="calendar-cell"
            :class="{ 'is-empty': dia.empty, 'is-today': dia.isHoy }"
            :style="{ borderColor: config.darkMode ? '#444' : '#e5e5e5', backgroundColor: dia.empty ? (config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent' }"
            @click="!dia.empty ? abrirDetalleDia(dia) : null"
        >
          <template v-if="!dia.empty">
            <div class="cell-header">
              <span class="day-number" :style="{ color: dia.isHoy ? 'white' : 'inherit', backgroundColor: dia.isHoy ? config.colorAcento : 'transparent' }">{{ dia.number }}</span>
            </div>

            <div class="cell-items desktop-only">
              <div
                  v-for="item in dia.items.slice(0, 3)"
                  :key="item.id"
                  class="item-pill"
                  :class="{ 'is-completed': item.completed }"
                  :style="{ backgroundColor: item.color + '20', color: item.color, borderLeft: '3px solid ' + item.color }"
                  :title="item.title"
              >
                <i class="pi" :class="item.icon" style="font-size: 0.7rem;"></i>
                <span class="item-title">{{ item.title }}</span>
              </div>
              <div v-if="dia.items.length > 3" class="item-more" :style="{ color: config.darkMode ? '#aaa' : '#666' }">
                + {{ dia.items.length - 3 }} más
              </div>
            </div>

            <div class="mobile-dots mobile-only">
              <span v-for="item in dia.items.slice(0, 3)" :key="item.id" class="dot" :style="{ backgroundColor: item.color }"></span>
              <span v-if="dia.items.length > 3" class="dot-more">+</span>
            </div>
          </template>
        </div>
      </div>

      <div class="mobile-agenda mobile-only">
        <div class="mobile-agenda-header">
          <h3>{{ formatearFechaDia(agendaMostrada.dateStr) || 'Hoy' }}</h3>
        </div>
        <div class="mobile-agenda-list">
          <article v-for="item in agendaMostrada.items" :key="`agenda-${item.id}`" class="agenda-card" :class="{ today: agendaMostrada.isHoy }">
            <div class="agenda-icon" :style="{ backgroundColor: item.color + '20', color: item.color }">
              <i class="pi" :class="item.icon"></i>
            </div>
            <div class="agenda-info">
              <strong :style="{ textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1 }">{{ item.title }}</strong>
              <small>{{ item.subtitle }}</small>
            </div>
          </article>
          <div v-if="!agendaMostrada.items || !agendaMostrada.items.length" class="agenda-empty">
            <i class="pi pi-check-circle" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
            <span>No hay nada programado para este día.</span>
          </div>
        </div>
      </div>

    </div>

    <Dialog v-model:visible="mostrarModalDetalle" modal :style="{ width: '90%', maxWidth: '500px' }">
      <template #header>
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.2rem; font-weight: 700;">
          <i class="pi pi-calendar" :style="{ color: config.colorAcento }"></i>
          <span :style="{ color: config.darkMode ? '#fff' : '#333', textTransform: 'capitalize' }">
            {{ diaSeleccionado ? formatearFechaDia(diaSeleccionado.dateStr) : '' }}
          </span>
        </div>
      </template>

      <div class="pt-3" :style="{ color: config.darkMode ? '#fff' : '#333' }">

        <div v-if="diaSeleccionado && diaSeleccionado.items.length === 0" class="empty-state" style="padding: 2rem;">
          <i class="pi pi-face-smile" style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 1rem; display: block;"></i>
          No hay tareas, gastos ni eventos para este día. ¡Día libre!
        </div>

        <div v-else class="day-details-list">
          <div v-for="item in diaSeleccionado.items" :key="item.id" class="detail-card"
               :style="{ borderColor: item.color + '40', backgroundColor: config.darkMode ? item.color + '0A' : item.color + '05' }">
            <div class="detail-icon" :style="{ backgroundColor: item.color + '20', color: item.color }">
              <i class="pi" :class="item.icon"></i>
            </div>
            <div class="detail-info">
              <h4 :style="{ color: config.darkMode ? '#fff' : '#333', textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1 }">
                {{ item.title }}
              </h4>
              <span class="detail-type" :style="{ color: item.color, opacity: 0.8 }">
                {{ item.type === 'event' ? 'Evento' : (item.type === 'task' ? 'Tarea' : 'Gasto') }}
                <span v-if="item.completed"> - {{ t('calendar.completed') }} <i class="pi pi-check"></i></span>
              </span>
              <p class="detail-subtitle">{{ item.subtitle }}</p>
              <div v-if="item.type === 'expense'" class="inline-pills">
                <span :class="expensePaid(item.raw) ? 'ok-pill' : 'pending-pill'">{{ item.raw.paymentType === 'shared' ? 'Pago conjunto' : 'Pago individual' }}</span>
                <span>{{ Number(item.raw.amount).toFixed(2) }} €</span>
                <span>{{ item.raw.shares?.filter(s => s.isPaid).length || 0 }}/{{ item.raw.shares?.length || 0 }} pagados</span>
              </div>
              <div v-if="item.type === 'event' && item.raw.participants?.length" class="inline-pills">
                <span v-for="participant in item.raw.participants" :key="participant.id"><i class="pi pi-user"></i>{{ participant.name }}</span>
              </div>
              <div v-if="item.type === 'task'" class="inline-pills">
                <span><i class="pi pi-user"></i>{{ item.subtitle }}</span>
                <span v-if="item.raw.priority"><i class="pi pi-flag"></i>{{ item.raw.priority }}</span>
                <span v-if="item.raw.periodicity"><i class="pi pi-sync"></i>{{ item.raw.periodicity }}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
          <Button :label="t('common.close')" text @click="mostrarModalDetalle = false" :style="{ color: config.darkMode ? '#aaa' : '#666' }" />
          <Button :label="t('calendar.addEvent')" icon="pi pi-plus"
                  @click="mostrarModalDetalle = false; abrirModalNuevo(diaSeleccionado.dateStr)"
                  :style="{ backgroundColor: config.colorAcento, border: 'none', color: 'white' }" />
        </div>
      </div>
    </Dialog>


    <Dialog v-model:visible="mostrarModal" modal header="Programar evento" :style="{ width: '90%', maxWidth: '450px' }">
      <div class="pt-3" :style="{ color: config.darkMode ? '#fff' : '#333' }">

        <div class="form-group mb-3">
          <label class="block mb-2 ht-font-bold label-row" style="font-size: 0.9rem;">{{ t('calendar.what') }} <span class="required-mark">*</span></label>
          <InputText v-model="nuevoEvento.title" class="w-full comfy-input" :placeholder="t('calendar.example')"
                     :style="{ backgroundColor: config.colorAcento + '15', border: 'none', color: config.darkMode ? '#fff' : '#333' }" />
        </div>

        <div class="form-group mb-3">
          <label class="block mb-2 ht-font-bold" style="font-size: 0.9rem;">{{ t('calendar.description') }}</label>
          <textarea v-model="nuevoEvento.description" class="w-full comfy-input native-textarea" rows="3" :placeholder="t('calendar.details')"
                    :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none' }"></textarea>
        </div>

        <div class="form-group mb-3">
          <label class="block mb-2 ht-font-bold label-row" style="font-size: 0.9rem;">{{ t('calendar.start') }} <span class="required-mark">*</span></label>
          <input type="datetime-local" v-model="nuevoEvento.startDate" class="w-full comfy-input native-date"
                 :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none', colorScheme: config.darkMode ? 'dark' : 'light' }" />
        </div>

        <div class="form-grid mb-3">
          <div class="form-group">
            <label class="block mb-2 ht-font-bold" style="font-size: 0.9rem;">{{ t('calendar.end') }}</label>
            <input type="datetime-local" v-model="nuevoEvento.endDate" class="w-full comfy-input native-date"
                   :style="{ backgroundColor: config.colorAcento + '15', color: config.darkMode ? '#fff' : '#333', border: 'none', colorScheme: config.darkMode ? 'dark' : 'light' }" />
          </div>
          <label class="check-row">
            <input type="checkbox" v-model="nuevoEvento.isAllDay" />
            Todo el día
          </label>
        </div>

        <div class="form-group mb-4">
          <label class="block mb-2 ht-font-bold" style="font-size: 0.9rem;">{{ t('calendar.location') }}</label>
          <InputText v-model="nuevoEvento.location" class="w-full comfy-input" :placeholder="t('calendar.locationExample')"
                     :style="{ backgroundColor: config.colorAcento + '15', border: 'none', color: config.darkMode ? '#fff' : '#333' }" @keyup.enter="crearEvento" />
        </div>

        <div class="form-group mb-4">
          <label class="block mb-2 ht-font-bold" style="font-size: 0.9rem;">{{ t('calendar.participants') }}</label>
          <div class="participant-pills">
            <button v-for="miembro in miembros" :key="miembro.id" type="button" :class="{ selected: nuevoEvento.participants.includes(miembro.id) }" @click="toggleParticipant(miembro.id)">
              <i class="pi" :class="nuevoEvento.participants.includes(miembro.id) ? 'pi-check' : 'pi-user'"></i>
              {{ miembro.firstName }} {{ miembro.lastName }}
            </button>
          </div>
        </div>

        <small v-if="errorMensaje" style="color: #ef4444; display: block; margin-top: -0.5rem; margin-bottom: 1rem; font-weight: 700;">
          <i class="pi pi-exclamation-circle"></i> {{ errorMensaje }}
        </small>
        <p class="required-hint">{{ t('common.requiredHint') }}</p>

        <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
          <Button :label="t('common.cancel')" text @click="mostrarModal = false" :style="{ color: config.darkMode ? '#aaa' : '#666' }" />
          <Button :label="t('common.save')" :loading="guardando" @click="crearEvento" :style="{ backgroundColor: config.colorAcento, border: 'none', color: 'white' }" />
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

/* --- CALENDARIO ESTILO GRID --- */
.calendar-container {
  width: 100%;
  border: 1px solid;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.calendar-nav {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 2rem; border-bottom: 1px solid;
}
.nav-actions { display: flex; align-items: center; gap: .5rem; }
.today-btn {
  min-height: 38px;
  padding: 0 1rem;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-pill);
  background: var(--accent-bg-subtle);
  color: var(--color-accent);
  font-weight: 700;
}
.calendar-title-picker { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; position: relative; }
.picker-part { position: relative; }
.month-title { margin: 0; font-size: 1.35rem; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }
.picker-trigger, .year-trigger { border: 1px solid var(--color-border-strong); border-radius: 999px; background: var(--color-surface); padding: .45rem .85rem; font-family: inherit; cursor: pointer; }
.picker-trigger:hover, .year-trigger:hover { border-color: var(--color-accent); color: var(--color-accent) !important; }
.picker-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 260px;
  padding: .75rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .4rem;
  border: 1px solid var(--color-border-strong);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);
  z-index: 20;
}
.picker-popover button { border: 1px solid transparent; border-radius: 8px; background: var(--color-input-bg); color: var(--color-text); padding: .65rem .5rem; font-weight: 700; text-transform: uppercase; cursor: pointer; }
.picker-popover button:hover, .picker-popover button.active { border-color: var(--color-accent); background: var(--accent-bg-subtle); color: var(--color-accent); }
.year-range-actions { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .25rem; color: var(--color-text-muted); font-weight: 700; }
.year-range-actions button { width: 34px; height: 34px; padding: 0; border-radius: 999px; }
.nav-btn { background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 0.5rem; border-radius: 50%; transition: background 0.2s; opacity: 0.7;}
.nav-btn:hover { background-color: rgba(150,150,150,0.2); opacity: 1; }

.calendar-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid; background-color: rgba(150,150,150,0.05);
}
.weekday-name { text-align: center; padding: 0.8rem; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; opacity: 0.7; }

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
.mobile-agenda { display: none; }
.agenda-card {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card-bg);
}
.agenda-card.today { border-color: var(--color-accent); }
.agenda-day {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-sm);
  background: var(--accent-bg-subtle);
  color: var(--color-accent);
  font-weight: 700;
}
.agenda-card strong,
.agenda-card small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agenda-card small,
.agenda-empty {
  color: var(--color-text-muted);
  font-weight: 700;
}

.calendar-cell {
  min-height: 120px; border-right: 1px solid; border-bottom: 1px solid;
  padding: 0.5rem; transition: background-color 0.2s;
}
.calendar-cell:nth-child(7n) { border-right: none; }
.calendar-cell:not(.is-empty) { cursor: pointer; }
.calendar-cell:not(.is-empty):hover { background-color: var(--acento-hover) !important; }

.cell-header { display: flex; justify-content: flex-end; margin-bottom: 0.5rem; }
.day-number {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; font-size: 0.9rem; font-weight: 700; opacity: 0.8; transition: all 0.2s;
}
.is-today .day-number { opacity: 1; box-shadow: 0 3px 8px var(--acento-shadow); }

/* ITEMS DEL CALENDARIO (Píldoras) */
.cell-items { display: flex; flex-direction: column; gap: 0.3rem; }
.item-pill {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.item-title { overflow: hidden; text-overflow: ellipsis; }
.is-completed { opacity: 0.5; text-decoration: line-through; }
.item-more { font-size: 0.75rem; font-weight: 700; text-align: center; margin-top: 0.2rem; }

/* MODAL DE DETALLES DEL DÍA */
.day-details-list { display: flex; flex-direction: column; gap: 1rem; }
.detail-card {
  display: flex; align-items: center; gap: 1rem; padding: 1rem;
  border: 1px solid; border-radius: 8px; transition: transform 0.2s;
}
.detail-card:hover { transform: translateX(5px); }
.detail-icon {
  width: 45px; height: 45px; border-radius: 10px; display: flex;
  align-items: center; justify-content: center; font-size: 1.3rem;
}
.detail-info { display: flex; flex-direction: column; gap: 0.2rem; }
.detail-info h4 { margin: 0; font-size: 1.15rem; }
.detail-type { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-subtitle { margin: .2rem 0 0; opacity: .72; font-weight: 700; }
.inline-pills { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .6rem; }
.inline-pills span { display: inline-flex; align-items: center; gap: .3rem; padding: .25rem .5rem; border-radius: 999px; background: rgba(150,150,150,.14); font-size: .78rem; font-weight: 700; }
.ok-pill { color: var(--color-accent); background: var(--accent-bg-subtle) !important; }
.pending-pill { color: #ef4444; background: rgba(239,68,68,.12) !important; }

.empty-state { text-align: center; opacity: 0.5; font-style: italic; }

/* MODAL FORM GRID */
.w-full { width: 100%; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }
.block { display: block; }
:deep(.comfy-input) { border-radius: 8px; padding: 0.8rem; outline: none; font-family: inherit; }
.native-date { font-family: inherit; font-size: 1rem; border: none; outline: none; box-sizing: border-box; cursor: pointer; }
.native-textarea { font-family: inherit; font-size: 1rem; border: none; outline: none; box-sizing: border-box; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: end; }
.check-row { display: flex; align-items: center; gap: .5rem; font-weight: 700; }
.label-row { display: inline-flex; align-items: center; gap: .25rem; }
.required-mark, .required-hint { color: var(--color-error); }
.required-mark { font-weight: 700; line-height: 1; }
.required-hint { margin: 1rem 0 0; font-size: .78rem; font-weight: 700; text-align: left; }
.participant-pills { display: flex; flex-wrap: wrap; gap: .5rem; }
.participant-pills button { border: 0; border-radius: 999px; padding: .45rem .75rem; background: rgba(150,150,150,.14); color: inherit; cursor: pointer; font-weight: 700; }
.participant-pills button.selected { background: v-bind('config.colorAcento + "22"'); color: v-bind('config.colorAcento'); }

/* EXTRAS MOBILE AGENDA */
.mobile-dots { display: flex; justify-content: center; gap: 2px; margin-top: 2px; }
.mobile-dots .dot { width: 4px; height: 4px; border-radius: 50%; }
.mobile-dots .dot-more { font-size: 0.5rem; font-weight: 700; line-height: 4px; color: var(--color-text-muted); }

.desktop-only { display: flex; }
.mobile-only { display: none; }

.mobile-agenda-header h3 { margin: 0 0 1rem; font-size: 1.1rem; color: var(--color-text); text-transform: capitalize; }
.mobile-agenda-list { display: grid; gap: 0.75rem; }
.agenda-icon { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; font-size: 1.2rem; }
.agenda-info { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.agenda-empty { text-align: center; color: var(--color-text-muted); font-weight: 600; padding: 2rem 0; display: flex; flex-direction: column; align-items: center; }

/* RESPONSIVE */
@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block; }
  .mobile-dots.mobile-only { display: flex; }
  .calendar-container { background: transparent !important; border: none !important; box-shadow: none !important; }
  .calendar-nav { padding: var(--space-2) 0; border: none !important; }
  .calendar-weekdays { border: none !important; background: transparent !important; display: grid !important; }
  .calendar-weekdays .weekday-name { font-size: 0.7rem; padding: 0.5rem 0; }
  .calendar-grid { gap: 2px; display: grid !important; }
  .calendar-cell { min-height: 48px; padding: 0.2rem; border: none !important; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .calendar-cell.is-today { background-color: var(--color-surface) !important; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
  .day-number { font-size: 1rem; width: 32px; height: 32px; margin: 0; }
  .cell-header { justify-content: center; margin-bottom: 0; }
  .mobile-agenda { margin-top: 1.5rem; padding: 0 0.5rem; }
}
</style>

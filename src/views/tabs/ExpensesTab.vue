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

const expenses = ref([]);
const members = ref([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');
const showForm = ref(false);
const showDetail = ref(false);
const editingId = ref(null);
const selectedExpense = ref(null);
const statusFilter = ref('pending');
const sortFilter = ref('due');

const showHistory = ref(false);
const historyExpenses = ref([]);
const loadingHistory = ref(false);

const today = new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  title: '',
  description: '',
  amount: null,
  category: 'General',
  paymentType: 'shared',
  paidByUserId: '',
  isPaid: false,
  hasDueDate: false,
  dueDate: '',
  periodicity: '',
  paidAt: today,
  recurrenceDayOfMonth: '',
  recurrenceWeekday: '',
  recurrenceTime: '',
  splitBetween: [],
  paidShareIds: []
});

const form = ref(emptyForm());

const memberName = (id) => {
  const member = members.value.find((item) => item.id === Number(id));
  return member ? `${member.firstName} ${member.lastName}` : 'Miembro';
};

const loadData = async () => {
  try {
    const [expensesRes, membersRes] = await Promise.all([
      http.get(`/households/${props.homeId}/expenses`),
      http.get(`/households/${props.homeId}/members`)
    ]);
    expenses.value = expensesRes.data;
    members.value = membersRes.data.members || [];
  } catch (error) {
    console.error('Error cargando gastos:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const pendingAmount = computed(() => expenses.value
  .filter((expense) => !expense.allParticipantsPaid && !expense.isPaid)
  .reduce((total, expense) => total + Number(expense.amount || 0), 0)
  .toFixed(2));

const paidShares = (expense) => (expense.shares || []).filter((share) => share.isPaid);
const unpaidShares = (expense) => (expense.shares || []).filter((share) => !share.isPaid);
const isExpenseSettled = (expense) => expense.paymentType === 'shared' ? expense.allParticipantsPaid : expense.isPaid;
const isExpenseOverdue = (expense) => expense.dueDate && expense.dueDate < today && !isExpenseSettled(expense);
const filteredExpenses = computed(() => expenses.value
  .filter((expense) => {
    if (statusFilter.value === 'all') return true;
    return statusFilter.value === 'paid' ? isExpenseSettled(expense) : !isExpenseSettled(expense);
  })
  .sort((a, b) => {
    if (sortFilter.value === 'amount') return Number(b.amount || 0) - Number(a.amount || 0);
    if (sortFilter.value === 'status') return Number(isExpenseSettled(a)) - Number(isExpenseSettled(b));
    return String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31'));
  }));
const payerText = (expense) => expense.paymentType === 'individual'
  ? (expense.paidBy?.fullName || expense.paidBy?.name || 'Sin pagador')
  : `${(expense.splitBetween || expense.shares || []).length} participantes`;

const statusText = (expense) => {
  if (expense.paymentType === 'individual') return expense.isPaid ? 'Pagado' : 'Pendiente';
  return `${paidShares(expense).length}/${(expense.shares || []).length} pagados`;
};

const recurrenceText = (expense) => {
  if (!expense.periodicity) return expense.paidAt ? `Pago: ${formatDate(expense.paidAt)}` : 'Sin periodicidad';
  if (expense.periodicity === 'monthly') return `Mensual, día ${expense.recurrenceDayOfMonth || '-'}`;
  if (expense.periodicity === 'weekly') return `Semanal, ${weekdayLabel(expense.recurrenceWeekday)}`;
  if (expense.periodicity === 'daily') return `Diario, ${expense.recurrenceTime || '--:--'}`;
  return expense.periodicity;
};

const weekdayLabel = (value) => {
  const labels = { 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado', 7: 'domingo' };
  return labels[value] || '-';
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const openCreate = () => {
  editingId.value = null;
  form.value = emptyForm();
  errorMessage.value = '';
  showForm.value = true;
};

const openEdit = (expense) => {
  editingId.value = expense.id;
  form.value = {
    title: expense.title || '',
    description: expense.description || '',
    amount: Number(expense.amount || 0),
    category: expense.category || 'General',
    paymentType: expense.paymentType || 'shared',
    paidByUserId: expense.paidBy?.id || '',
    isPaid: Boolean(expense.isPaid),
    hasDueDate: Boolean(expense.dueDate),
    dueDate: expense.dueDate || '',
    periodicity: expense.periodicity || '',
    paidAt: expense.paidAt ? expense.paidAt.split(' ')[0] : today,
    recurrenceDayOfMonth: expense.recurrenceDayOfMonth || '',
    recurrenceWeekday: expense.recurrenceWeekday || '',
    recurrenceTime: expense.recurrenceTime || '',
    splitBetween: (expense.splitBetween || []).map((item) => item.id),
    paidShareIds: paidShares(expense).map((item) => item.userId)
  };
  errorMessage.value = '';
  showForm.value = true;
};

const openDetail = (expense) => {
  selectedExpense.value = expense;
  showDetail.value = true;
};

const moveToParticipants = (id) => {
  if (!form.value.splitBetween.includes(id)) form.value.splitBetween.push(id);
};

const removeParticipant = (id) => {
  form.value.splitBetween = form.value.splitBetween.filter((item) => item !== id);
  form.value.paidShareIds = form.value.paidShareIds.filter((item) => item !== id);
};

const markPaid = (id) => {
  if (form.value.splitBetween.includes(id) && !form.value.paidShareIds.includes(id)) {
    form.value.paidShareIds.push(id);
  }
};

const markUnpaid = (id) => {
  form.value.paidShareIds = form.value.paidShareIds.filter((item) => item !== id);
};

const availableParticipants = computed(() => members.value.filter((member) => !form.value.splitBetween.includes(member.id)));
const selectedParticipants = computed(() => members.value.filter((member) => form.value.splitBetween.includes(member.id)));
const unpaidSelectedMembers = computed(() => selectedParticipants.value.filter((member) => !form.value.paidShareIds.includes(member.id)));
const paidSelectedMembers = computed(() => selectedParticipants.value.filter((member) => form.value.paidShareIds.includes(member.id)));

const validateForm = () => {
  if (!form.value.title.trim() || !form.value.amount || Number(form.value.amount) <= 0) {
    return 'El concepto y el importe positivo son obligatorios.';
  }
  if (form.value.paymentType === 'individual' && !form.value.paidByUserId) {
    return 'Selecciona quién paga el gasto individual.';
  }
  if (form.value.paymentType === 'shared' && form.value.splitBetween.length === 0) {
    return 'Selecciona al menos un participante para el pago conjunto.';
  }
  if (!form.value.periodicity && !form.value.paidAt) return 'Indica la fecha de pago.';
  if (form.value.periodicity === 'monthly' && !form.value.recurrenceDayOfMonth) return 'Indica el día del mes.';
  if (form.value.periodicity === 'weekly' && !form.value.recurrenceWeekday) return 'Indica el día de la semana.';
  if (form.value.periodicity === 'daily' && !form.value.recurrenceTime) return 'Indica la hora.';
  return '';
};

const saveExpense = async () => {
  const validation = validateForm();
  if (validation) {
    errorMessage.value = validation;
    return;
  }

  saving.value = true;
  errorMessage.value = '';

  const payload = {
    title: form.value.title,
    description: form.value.description,
    amount: Number(form.value.amount),
    category: form.value.category,
    paymentType: form.value.paymentType,
    paidByUserId: form.value.paymentType === 'individual' ? form.value.paidByUserId : null,
    isPaid: form.value.paymentType === 'individual' ? form.value.isPaid : false,
    dueDate: form.value.hasDueDate ? form.value.dueDate || null : null,
    periodicity: form.value.periodicity || null,
    paidAt: !form.value.periodicity ? form.value.paidAt : null,
    recurrenceDayOfMonth: form.value.periodicity === 'monthly' ? form.value.recurrenceDayOfMonth : null,
    recurrenceWeekday: form.value.periodicity === 'weekly' ? form.value.recurrenceWeekday : null,
    recurrenceTime: form.value.periodicity === 'daily' ? form.value.recurrenceTime : null,
    splitBetween: form.value.paymentType === 'shared' ? form.value.splitBetween : [],
    sharePayments: form.value.splitBetween.map((id) => ({ userId: id, isPaid: form.value.paidShareIds.includes(id) }))
  };

  try {
    const response = editingId.value
      ? await http.put(`/households/${props.homeId}/expenses/${editingId.value}`, payload)
      : await http.post(`/households/${props.homeId}/expenses`, payload);

    if (editingId.value) {
      const index = expenses.value.findIndex((expense) => expense.id === editingId.value);
      if (index !== -1) expenses.value[index] = response.data.expense;
      toast.add({ severity: 'success', summary: 'Gasto actualizado', life: 2200 });
    } else {
      expenses.value.push(response.data.expense);
      toast.add({ severity: 'success', summary: 'Gasto creado', life: 2200 });
    }
    showForm.value = false;
  } catch (error) {
    console.error('Error al guardar gasto:', error);
    errorMessage.value = error.response?.data?.error || 'Error al guardar el gasto.';
  } finally {
    saving.value = false;
  }
};

const deleteExpense = async (id) => {
  const ok = await confirm({
    title: 'Eliminar gasto',
    message: 'Este gasto se borrara definitivamente.',
    confirmLabel: 'Eliminar',
  });
  if (!ok) return;
  try {
    await http.delete(`/households/${props.homeId}/expenses/${id}`);
    expenses.value = expenses.value.filter((expense) => expense.id !== id);
    toast.add({ severity: 'success', summary: 'Gasto eliminado', life: 2200 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'No se ha podido borrar el gasto', life: 2600 });
  }
};

const loadHistory = async () => {
  loadingHistory.value = true;
  try {
    const res = await http.get(`/households/${props.homeId}/expenses/history`);
    historyExpenses.value = res.data;
  } catch (error) {
    console.error('Error cargando historial:', error);
  } finally {
    loadingHistory.value = false;
  }
};

const toggleHistory = () => {
  showHistory.value = !showHistory.value;
  if (showHistory.value && historyExpenses.value.length === 0) {
    loadHistory();
  }
};

const restoreExpense = async (id) => {
  try {
    const res = await http.patch(`/households/${props.homeId}/expenses/${id}/restore`);
    historyExpenses.value = historyExpenses.value.filter(e => e.id !== id);
    expenses.value.push(res.data.expense);
    toast.add({ severity: 'success', summary: 'Gasto restaurado', life: 2200 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error al restaurar gasto', life: 2600 });
  }
};
</script>

<template>
  <div class="tab-wrapper" :style="{ '--accent': config.colorAcento, '--accent-soft': config.colorAcento + '18' }">
    <div class="tab-header">
      <div class="header-title">
        <i class="pi pi-wallet icon-header" :style="{ color: config.colorAcento, backgroundColor: config.colorAcento + '20' }"></i>
        <div>
          <h2 :style="{ color: config.darkMode ? '#fff' : '#333' }">{{ t('expenses.title') }}</h2>
          <small>{{ t('expenses.subtitle') }}</small>
        </div>
      </div>
      <div class="header-actions">
        <div class="total-badge">
          <span>{{ t('expenses.pending') }}</span>
          <strong>{{ pendingAmount }} €</strong>
        </div>
        <Button :label="t('expenses.new')" icon="pi pi-plus" class="btn-primary" @click="openCreate" />
      </div>
    </div>

    <div v-if="loading" class="loading-state"><i class="pi pi-spin pi-spinner"></i></div>

    <div v-else class="expenses-table-wrap">
      <div class="expense-toolbar">
        <Button 
          :icon="showHistory ? 'pi pi-folder-open' : 'pi pi-history'" 
          :label="showHistory ? 'Ver activos' : 'Ver historial'" 
          :class="showHistory ? 'btn-primary' : 'p-button-outlined p-button-secondary'" 
          @click="toggleHistory" 
        />
        <select v-if="!showHistory" v-model="statusFilter" aria-label="Filtrar gastos">
          <option value="pending">{{ t('expenses.pending') }}</option>
          <option value="paid">{{ t('expenses.paid') }}</option>
          <option value="all">{{ t('tasks.all') }}</option>
        </select>
        <select v-if="!showHistory" v-model="sortFilter" aria-label="Ordenar gastos">
          <option value="due">{{ t('tasks.sortDue') }}</option>
          <option value="status">{{ t('expenses.status') }}</option>
          <option value="amount">{{ t('expenses.amount') }}</option>
        </select>
      </div>

      <template v-if="!showHistory">

      <table v-if="filteredExpenses.length" class="expenses-table">
        <thead>
          <tr>
            <th>{{ t('expenses.concept') }}</th>
            <th>{{ t('expenses.type') }}</th>
            <th>{{ t('expenses.amount') }}</th>
            <th>{{ t('expenses.payerParticipants') }}</th>
            <th>{{ t('expenses.status') }}</th>
            <th>{{ t('expenses.periodicity') }}</th>
            <th>{{ t('expenses.dueDate') }}</th>
            <th class="actions-col">{{ t('expenses.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expense in filteredExpenses" :key="expense.id" :class="{ settled: isExpenseSettled(expense) }">
            <td>
              <strong>{{ expense.title }}</strong>
              <small>{{ expense.category || 'General' }} <template v-if="isExpenseOverdue(expense)">· {{ t('tasks.overdue') }}</template></small>
            </td>
            <td><span class="type-pill" :class="expense.paymentType">{{ expense.paymentType === 'individual' ? 'Individual' : 'Conjunto' }}</span></td>
            <td class="amount-cell">{{ Number(expense.amount).toFixed(2) }} €</td>
            <td>{{ payerText(expense) }}</td>
            <td>
              <button class="status-chip" :class="isExpenseSettled(expense) ? 'ok' : 'pending'" @click="openDetail(expense)">
                <i class="pi" :class="isExpenseSettled(expense) ? 'pi-check' : 'pi-clock'"></i>
                {{ statusText(expense) }}
              </button>
            </td>
            <td>{{ recurrenceText(expense) }}</td>
            <td>{{ formatDate(expense.dueDate) }}</td>
            <td>
              <div class="row-actions">
                <button class="icon-btn" title="Ver detalle" @click="openDetail(expense)"><i class="pi pi-eye"></i></button>
                <button class="icon-btn" title="Editar" @click="openEdit(expense)"><i class="pi pi-pencil"></i></button>
                <button class="icon-btn danger" title="Eliminar" @click="deleteExpense(expense.id)"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredExpenses.length" class="expenses-mobile-list">
        <article v-for="expense in filteredExpenses" :key="`m-${expense.id}`" class="expense-mobile-card" :class="{ settled: isExpenseSettled(expense) }">
          <div>
            <strong>{{ expense.title }}</strong>
            <small>{{ expense.category || 'General' }}</small>
          </div>
          <span class="amount-cell">{{ Number(expense.amount).toFixed(2) }} €</span>
          <div class="mobile-card-meta">
            <span class="type-pill" :class="expense.paymentType">{{ expense.paymentType === 'individual' ? 'Individual' : 'Conjunto' }}</span>
            <span class="status-chip" :class="isExpenseSettled(expense) ? 'ok' : 'pending'">{{ statusText(expense) }}</span>
            <span v-if="isExpenseOverdue(expense)" class="overdue-pill">{{ t('tasks.overdue') }}</span>
          </div>
          <small>{{ recurrenceText(expense) }} · {{ formatDate(expense.dueDate) || '-' }}</small>
          <div class="row-actions mobile-actions">
            <button class="icon-btn" aria-label="Ver detalle" @click="openDetail(expense)"><i class="pi pi-eye"></i></button>
            <button class="icon-btn" aria-label="Editar gasto" @click="openEdit(expense)"><i class="pi pi-pencil"></i></button>
            <button class="icon-btn danger" aria-label="Eliminar gasto" @click="deleteExpense(expense.id)"><i class="pi pi-trash"></i></button>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <i class="pi pi-wallet"></i>
        <span>{{ t('expenses.empty') }}</span>
        <Button :label="t('expenses.createExpense')" icon="pi pi-plus" class="btn-primary" @click="openCreate" />
      </div>
      </template>

      <template v-else>
        <div v-if="loadingHistory" class="loading-state"><i class="pi pi-spin pi-spinner"></i></div>
        <table v-else-if="historyExpenses.length" class="expenses-table">
          <thead>
            <tr>
              <th>{{ t('expenses.concept') }}</th>
              <th>{{ t('expenses.amount') }}</th>
              <th>{{ t('expenses.payerParticipants') }}</th>
              <th>Dado de baja</th>
              <th class="actions-col">{{ t('expenses.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="expense in historyExpenses" :key="expense.id" class="settled">
              <td>
                <strong>{{ expense.title }}</strong>
                <small>{{ expense.category || 'General' }}</small>
              </td>
              <td class="amount-cell">{{ Number(expense.amount).toFixed(2) }} €</td>
              <td>{{ payerText(expense) }}</td>
              <td>{{ formatDate(expense.disabledAt) }}</td>
              <td>
                <div class="row-actions">
                  <button class="icon-btn" title="Ver detalle" @click="openDetail(expense)"><i class="pi pi-eye"></i></button>
                  <button class="icon-btn ok" title="Restaurar gasto" @click="restoreExpense(expense.id)"><i class="pi pi-refresh"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="historyExpenses.length && !loadingHistory" class="expenses-mobile-list">
          <article v-for="expense in historyExpenses" :key="`m-hist-${expense.id}`" class="expense-mobile-card settled">
            <div>
              <strong>{{ expense.title }}</strong>
              <small>{{ expense.category || 'General' }}</small>
            </div>
            <span class="amount-cell">{{ Number(expense.amount).toFixed(2) }} €</span>
            <small>Baja: {{ formatDate(expense.disabledAt) }}</small>
            <div class="row-actions mobile-actions">
              <button class="icon-btn" aria-label="Ver detalle" @click="openDetail(expense)"><i class="pi pi-eye"></i></button>
              <button class="icon-btn ok" aria-label="Restaurar gasto" @click="restoreExpense(expense.id)"><i class="pi pi-refresh"></i></button>
            </div>
          </article>
        </div>

        <div v-if="!historyExpenses.length && !loadingHistory" class="empty-state">
          <i class="pi pi-history"></i>
          <span>No hay historial de gastos</span>
        </div>
      </template>
    </div>

    <Dialog v-model:visible="showDetail" modal header="Detalle del gasto" class="ht-dialog" :style="{ width: 'min(94vw, 760px)' }">
      <div v-if="selectedExpense" class="detail-view">
        <div class="detail-hero">
          <div>
            <span class="type-pill" :class="selectedExpense.paymentType">{{ selectedExpense.paymentType === 'individual' ? 'Individual' : 'Conjunto' }}</span>
            <h3>{{ selectedExpense.title }}</h3>
            <p>{{ selectedExpense.description || 'Sin descripción' }}</p>
          </div>
          <strong>{{ Number(selectedExpense.amount).toFixed(2) }} €</strong>
        </div>
        <div class="detail-grid">
          <div><span>{{ t('expenses.periodicity') }}</span><strong>{{ recurrenceText(selectedExpense) }}</strong></div>
          <div><span>{{ t('expenses.dueDate') }}</span><strong>{{ formatDate(selectedExpense.dueDate) }}</strong></div>
          <div><span>{{ t('expenses.perPerson') }}</span><strong>{{ Number(selectedExpense.amountPerPerson || 0).toFixed(2) }} €</strong></div>
        </div>
        <section class="split-detail">
          <h4>{{ t('expenses.personStatus') }}</h4>
          <div class="people-list">
            <span v-for="share in selectedExpense.shares" :key="share.userId" :class="share.isPaid ? 'paid-person' : 'pending-person'">
              <i class="pi" :class="share.isPaid ? 'pi-check' : 'pi-clock'"></i>{{ share.name }} · {{ Number(share.amountOwed).toFixed(2) }} €
            </span>
          </div>
        </section>
      </div>
    </Dialog>

    <Dialog v-model:visible="showForm" modal :header="editingId ? 'Editar gasto' : 'Nuevo gasto'" class="ht-dialog expense-dialog" :style="{ width: 'min(94vw, 980px)' }">
      <div class="expense-form">
        <section class="form-section">
          <h3>{{ t('expenses.basicData') }}</h3>
          <div class="form-grid">
            <label><span class="label-row">{{ t('expenses.concept') }} <span class="required-mark">*</span></span><input v-model="form.title" class="field" type="text" /></label>
            <label><span class="label-row">{{ t('expenses.amount') }} <span class="required-mark">*</span></span><input v-model.number="form.amount" class="field" type="number" min="0.01" step="0.01" /></label>
            <label><span class="label-row">{{ t('expenses.category') }}</span><input v-model="form.category" class="field" type="text" /></label>
            <label class="span-3"><span class="label-row">{{ t('expenses.description') }}</span><textarea v-model="form.description" class="field" rows="3"></textarea></label>
          </div>
        </section>

        <section class="form-section">
          <h3>{{ t('expenses.payment') }}</h3>
          <div class="form-grid">
            <label><span class="label-row">{{ t('expenses.paymentType') }} <span class="required-mark">*</span></span>
              <select v-model="form.paymentType" class="field native">
                <option value="shared">{{ t('expenses.shared') }}</option>
                <option value="individual">{{ t('expenses.individual') }}</option>
              </select>
            </label>
            <label v-if="form.paymentType === 'individual'"><span class="label-row">{{ t('expenses.paidBy') }} <span class="required-mark">*</span></span>
              <select v-model="form.paidByUserId" class="field native">
                <option value="">{{ t('expenses.chooseMember') }}</option>
                <option v-for="member in members" :key="member.id" :value="member.id">{{ member.firstName }} {{ member.lastName }}</option>
              </select>
            </label>
            <label v-if="form.paymentType === 'individual'" class="switch-row ios-toggle-row">
              <span>{{ t('expenses.paidComplete') }}</span>
              <div class="ios-toggle">
                <input v-model="form.isPaid" type="checkbox" />
                <span class="slider"></span>
              </div>
            </label>
          </div>

          <template v-if="form.paymentType === 'shared'">
            <h4>{{ t('expenses.participants') }}</h4>
            <div class="dual-list">
              <div><span>{{ t('expenses.nonParticipants') }}</span><button v-for="member in availableParticipants" :key="member.id" @click="moveToParticipants(member.id)">{{ member.firstName }} {{ member.lastName }} <i class="pi pi-angle-right"></i></button></div>
              <div><span>{{ t('expenses.participate') }}</span><button v-for="member in selectedParticipants" :key="member.id" @click="removeParticipant(member.id)"><i class="pi pi-angle-left"></i> {{ member.firstName }} {{ member.lastName }}</button></div>
            </div>

            <h4>{{ t('expenses.personStatus') }}</h4>
            <div class="dual-list">
              <div><span>{{ t('expenses.unpaid') }}</span><button v-for="member in unpaidSelectedMembers" :key="member.id" @click="markPaid(member.id)">{{ member.firstName }} {{ member.lastName }} <i class="pi pi-angle-right"></i></button></div>
              <div><span>{{ t('expenses.paid') }}</span><button v-for="member in paidSelectedMembers" :key="member.id" @click="markUnpaid(member.id)"><i class="pi pi-angle-left"></i> {{ member.firstName }} {{ member.lastName }}</button></div>
            </div>
          </template>
        </section>

        <section class="form-section">
          <h3>{{ t('expenses.recurrenceDue') }}</h3>
          <div class="form-grid">
            <label><span class="label-row">{{ t('expenses.repeat') }} <span class="required-mark">*</span></span>
              <select v-model="form.periodicity" class="field native">
                <option value="">{{ t('expenses.noRepeat') }}</option>
                <option value="monthly">{{ t('expenses.monthly') }}</option>
                <option value="weekly">{{ t('expenses.weekly') }}</option>
                <option value="daily">{{ t('expenses.daily') }}</option>
              </select>
            </label>
            <label v-if="!form.periodicity"><span class="label-row">{{ t('expenses.paymentDate') }} <span class="required-mark">*</span></span><input v-model="form.paidAt" class="field native" type="date" /></label>
            <label v-if="form.periodicity === 'monthly'"><span class="label-row">{{ t('expenses.monthDay') }} <span class="required-mark">*</span></span><input v-model="form.recurrenceDayOfMonth" class="field native" type="number" min="1" max="31" /></label>
            <label v-if="form.periodicity === 'weekly'"><span class="label-row">{{ t('expenses.weekDay') }} <span class="required-mark">*</span></span>
              <select v-model="form.recurrenceWeekday" class="field native">
                <option value="">{{ t('expenses.choose') }}</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option>
              </select>
            </label>
            <label v-if="form.periodicity === 'daily'"><span class="label-row">{{ t('expenses.time') }} <span class="required-mark">*</span></span><input v-model="form.recurrenceTime" class="field native" type="time" /></label>
            <label class="switch-row ios-toggle-row">
              <span>{{ t('expenses.addDueDate') }}</span>
              <div class="ios-toggle">
                <input v-model="form.hasDueDate" type="checkbox" />
                <span class="slider"></span>
              </div>
            </label>
            <label v-if="form.hasDueDate"><span class="label-row">{{ t('expenses.dueDate') }}</span><input v-model="form.dueDate" class="field native" type="date" /></label>
          </div>
        </section>

        <small v-if="errorMessage" class="form-error"><i class="pi pi-exclamation-circle"></i>{{ errorMessage }}</small>
        <p class="required-hint">{{ t('common.requiredHint') }}</p>
        <div class="form-actions">
          <Button :label="t('common.cancel')" text @click="showForm = false" />
          <Button :label="editingId ? t('expenses.saveChanges') : t('expenses.createExpense')" :loading="saving" class="btn-primary" @click="saveExpense" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.tab-wrapper { animation: fadeIn .25s ease-out; color: var(--color-text); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.tab-header, .header-actions, .header-title { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.tab-header { justify-content: space-between; margin-bottom: 1.5rem; }
.header-title h2 { margin: 0; font-size: 2rem; }
.header-title small { opacity: .65; font-weight: 700; }
.icon-header { font-size: 1.45rem; padding: .8rem; border-radius: 10px; }
.total-badge { display: grid; gap: .15rem; padding: .65rem 1rem; border: 1px dashed var(--accent); border-radius: 8px; text-align: right; }
.total-badge span { font-size: .75rem; opacity: .65; font-weight: 700; text-transform: uppercase; }
.total-badge strong { color: var(--accent); font-size: 1.35rem; }
.btn-primary { background: var(--accent) !important; border: 0 !important; color: white !important; border-radius: 8px; font-weight: 700; }
.loading-state, .empty-state { display: grid; place-items: center; min-height: 220px; opacity: .65; font-weight: 700; }
.empty-state { gap: var(--space-3); text-align: center; }
.empty-state i { color: var(--color-accent); font-size: var(--icon-xl); }
.expenses-table-wrap { width: 100%; overflow-x: auto; border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-card-bg); }
.expense-toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-3); border-bottom: 1px solid var(--color-border); }
.expense-toolbar select { min-height: 38px; border: 1px solid var(--color-border); border-radius: var(--radius-pill); background: var(--color-input-bg); color: var(--color-text); padding: 0 var(--space-3); font-weight: 700; }
.expenses-table { width: 100%; min-width: 1040px; border-collapse: collapse; color: var(--color-text); }
.expenses-table th, .expenses-table td { padding: .85rem 1rem; border-bottom: 1px solid var(--color-border); text-align: left; vertical-align: middle; }
.expenses-table th { color: var(--color-text-muted); font-size: .78rem; text-transform: uppercase; font-weight: 700; background: var(--color-input-bg); }
.expenses-table tbody tr { transition: background-color .15s ease; }
.expenses-table tbody tr:hover { background: var(--accent-bg-subtle); }
.expenses-table tbody tr.settled { opacity: .72; }
.expenses-table td strong, .expenses-table td small { display: block; }
.expenses-table td small { color: var(--color-text-muted); margin-top: .15rem; font-weight: 700; }
.amount-cell { color: var(--color-accent); font-weight: 700; white-space: nowrap; }
.actions-col { width: 132px; }
.row-actions { display: inline-flex; align-items: center; gap: .35rem; }
.icon-btn { width: 36px; height: 36px; display: inline-grid; place-items: center; border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-surface); color: var(--color-text); cursor: pointer; }
.icon-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
.icon-btn.danger { color: var(--color-error); }
.type-pill, .status-chip, .people-list span { display: inline-flex; align-items: center; gap: .35rem; padding: .3rem .55rem; border-radius: 999px; font-size: .8rem; font-weight: 700; white-space: nowrap; }
.type-pill.shared { color: #2563eb; background: rgba(37,99,235,.14); }
.type-pill.individual { color: #9333ea; background: rgba(147,51,234,.14); }
.status-chip { border: 0; cursor: pointer; font-family: inherit; }
.ok, .paid-person { color: var(--color-accent); background: var(--accent-bg-subtle); }
.pending, .pending-person { color: #ef4444; background: rgba(239,68,68,.12); }
.overdue-pill { color: #ef4444; background: rgba(239,68,68,.12); padding: .35rem .6rem; border-radius: 999px; font-size: .72rem; font-weight: 700; }
.expenses-mobile-list { display: none; }
.expense-mobile-card { display: grid; gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }
.expense-mobile-card.settled { opacity: .72; }
.expense-mobile-card strong { font-size: var(--text-lg); }
.expense-mobile-card small { color: var(--color-text-muted); font-weight: 700; }
.mobile-card-meta { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.mobile-actions { justify-content: flex-end; }
.detail-view, .expense-form { display: grid; gap: 1rem; }
.detail-hero { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem; border: 1px dashed rgba(150,150,150,.35); border-radius: 8px; }
.detail-hero h3 { margin: .45rem 0 .2rem; }
.detail-grid, .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; align-items: start; }
.detail-grid > div, .form-section, .split-detail { padding: 1rem; border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-card-bg); }
.detail-grid span, .expense-form h3, .expense-form h4 { color: var(--accent); font-size: .85rem; text-transform: uppercase; font-weight: 700; }
.people-list { display: flex; flex-wrap: wrap; gap: .5rem; }
.expense-form h3 { margin: 0 0 1rem; }
.expense-form h4 { margin: 1rem 0 .6rem; }
.expense-form label { display: grid; gap: .45rem; color: var(--color-text); font-weight: 700; }
.label-row { display: inline-flex; align-items: center; gap: .25rem; min-height: 1.1rem; }
.required-mark, .required-hint { color: var(--color-error); }
.required-mark { font-weight: 700; line-height: 1; }
.required-hint { margin: 0; font-size: .78rem; font-weight: 700; justify-self: start; }
.field { width: 100%; min-width: 0; border: 1px solid var(--color-border-strong); border-radius: 8px; padding: .75rem .8rem; background: var(--color-input-bg); color: var(--color-text); box-sizing: border-box; font: inherit; outline: none; color-scheme: light; }
[data-theme="dark"] .field { color-scheme: dark; }
.field:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--accent-border); }
textarea.field { min-height: 96px; resize: vertical; }
.native { font: inherit; outline: none; }
.span-3 { grid-column: 1 / -1; }
.switch-row { display: flex !important; align-items: center; gap: .65rem; min-height: 44px; padding-top: 1.55rem; }
.ios-toggle-row { justify-content: space-between; }
.ios-toggle { position: relative; width: 48px; height: 28px; display: inline-block; flex-shrink: 0; }
.ios-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.ios-toggle .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(150,150,150,0.3); transition: .3s; border-radius: 28px; }
.ios-toggle .slider:before { position: absolute; content: ""; height: 22px; width: 22px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.ios-toggle input:checked + .ios-toggle.active {
  background: var(--color-accent, #ea580c);
}
.ios-toggle input:checked + .slider { background-color: var(--color-accent, #ea580c); }
.ios-toggle input:checked + .slider:before { transform: translateX(20px); }
.dual-list { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.dual-list > div { display: grid; gap: .45rem; align-content: start; min-height: 126px; padding: .75rem; border: 1px solid var(--color-border-strong); border-radius: 8px; background: var(--color-surface); }
.dual-list span { font-size: .78rem; opacity: .7; font-weight: 700; text-transform: uppercase; }
.dual-list button { display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--color-border); border-radius: 7px; padding: .55rem .65rem; background: var(--color-input-bg); color: var(--color-text); cursor: pointer; font-weight: 700; text-align: left; }
.form-error { color: #ef4444; font-weight: 700; display: flex; gap: .4rem; }
.form-actions { display: flex; justify-content: flex-end; gap: .75rem; }
@media (max-width: 900px) { .form-grid, .detail-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 720px) {
  .dual-list, .form-grid, .detail-grid { grid-template-columns: 1fr; }
  .detail-hero { flex-direction: column; }
  .expenses-table { display: none; }
  .expenses-table-wrap { overflow-x: visible; border: 0; background: transparent; display: grid; gap: var(--space-3); }
  .expense-toolbar { border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: var(--color-card-bg); }
  .expense-toolbar select { flex: 1 1 140px; }
  .expenses-mobile-list { display: grid; gap: var(--space-3); }
}
</style>

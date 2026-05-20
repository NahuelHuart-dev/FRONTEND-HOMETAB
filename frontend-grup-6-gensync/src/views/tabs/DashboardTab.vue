<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import http from '@/services/http'
import { useNavigation } from '@/composables/useNavigation'

const props = defineProps(['config', 'homeId'])
const { router } = useNavigation()
const { t } = useI18n()

const dashboardData = ref(null)
const expenses = ref([])
const cargando = ref(true)
const totalExpensesMonth = ref(0)
const totalPendingAmount = ref(0)

const cargarDashboard = async () => {
  cargando.value = true
  try {
    const [dashRes, expRes] = await Promise.all([
      http.get(`/households/${props.homeId}/dashboard`),
      http.get(`/households/${props.homeId}/expenses`)
    ])
    dashboardData.value = dashRes.data
    expenses.value = expRes.data || []

    // Procesar gastos del mes
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let total = 0
    let pending = 0

    expenses.value.forEach(e => {
      // Total gastado este mes (gastos pagados en este mes)
      let dateToUse = e.paidAt ? new Date(e.paidAt) : (e.dueDate ? new Date(e.dueDate) : (e.createdAt ? new Date(e.createdAt) : null))
      if (dateToUse && dateToUse.getMonth() === currentMonth && dateToUse.getFullYear() === currentYear) {
        const amt = parseFloat(e.amount || 0)
        total += amt
      }
      // Importe pendiente
      if (!e.fullyPaidByAllParticipants) {
        pending += parseFloat(e.amount || 0)
      }
    })

    totalExpensesMonth.value = total
    // También usar el dato del dashboard si está disponible
    if (dashRes.data?.stats?.pendingAmount !== undefined) {
      totalPendingAmount.value = parseFloat(dashRes.data.stats.pendingAmount)
    } else {
      totalPendingAmount.value = pending
    }

  } catch (error) {
    console.error('Error cargando dashboard:', error)
  } finally {
    cargando.value = false
  }
}

onMounted(cargarDashboard)

const stats = computed(() => dashboardData.value?.stats || {})
const taskProgress = computed(() => {
  if (!stats.value.totalTasks) return 0
  return Math.round((stats.value.completedTasks / stats.value.totalTasks) * 100)
})

const timeline = computed(() => {
  if (!dashboardData.value?.timeline) return []
  return dashboardData.value.timeline.filter(item => item.type === 'task')
})

const upcomingEvents = computed(() => {
  if (!dashboardData.value?.timeline) return []
  return dashboardData.value.timeline.filter(item => item.type === 'event')
})

const alerts = computed(() => dashboardData.value?.alerts || [])

const goTo = (tab) => router.push(`/households/${props.homeId}/${tab}`)
const goRoute = (route) => route && router.push(route)

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

const iconFor = (type) => ({
  task: 'pi pi-check-square',
  expense: 'pi pi-wallet',
  event: 'pi pi-calendar',
}[type] || 'pi pi-circle')

</script>

<template>
  <div class="dashboard-wrapper">
    <div v-if="cargando" class="ht-loading-state">
      <i class="pi pi-spin pi-spinner" aria-label="Cargando..."></i>
      <p>{{ t('dashboard.loading') }}</p>
    </div>

    <div v-else-if="dashboardData" class="dashboard-content ht-fade-in">

      <!-- HEADER RESUMEN -->
      <div class="dashboard-header">
        <div class="greeting">
          <span class="house-name">{{ dashboardData.household.name }}</span>
          <h2>{{ t('dashboard.monthlySummary') }}</h2>
          <p>{{ t('dashboard.monthlyIntro', { name: dashboardData.user.firstName }) }}</p>
        </div>
      </div>

      <!-- BENTO GRID -->
      <div class="dashboard-bento-grid">

        <!-- CARD: GASTOS — 2 cards comparativas -->
        <article class="bento-card gastos-card">
          <div class="card-header">
            <div class="card-title">
              <div class="icon-box icon-expense"><i class="pi pi-wallet"></i></div>
              <h3>{{ t('dashboard.expenses') }}</h3>
            </div>
            <button class="card-open-button" type="button" :aria-label="t('dashboard.expenses')" @click="goTo('expenses')">
              <i class="pi pi-arrow-up-right arrow-icon"></i>
            </button>
          </div>

          <div class="expense-compare-grid">
            <!-- Card Gastado este mes -->
            <div class="expense-compare-card expense-compare-card--spent">
              <div class="expense-compare-icon">
                <i class="pi pi-chart-bar"></i>
              </div>
              <span class="expense-compare-amount">{{ totalExpensesMonth.toFixed(2) }} €</span>
              <span class="expense-compare-label">{{ t('dashboard.spentThisMonth') }}</span>
            </div>

            <!-- Card Pendiente de pago -->
            <div class="expense-compare-card expense-compare-card--pending">
              <div class="expense-compare-icon">
                <i class="pi pi-clock"></i>
              </div>
              <span class="expense-compare-amount">{{ totalPendingAmount.toFixed(2) }} €</span>
              <span class="expense-compare-label">{{ t('dashboard.pendingPayment') }}</span>
            </div>
          </div>
        </article>

        <!-- CARD: TAREAS (Progreso y pendientes) -->
        <button class="bento-card tareas-card" @click="goTo('tasks')">
          <div class="card-header">
            <div class="card-title">
              <div class="icon-box icon-tasks"><i class="pi pi-list-check"></i></div>
              <h3>{{ t('dashboard.tasks') }}</h3>
            </div>
            <i class="pi pi-arrow-up-right arrow-icon"></i>
          </div>

          <div class="card-body-tasks">
            <div class="tasks-progress-block">
              <div class="progress-info">
                <span class="progress-percentage">{{ taskProgress }}%</span>
                <span class="progress-label">{{ t('dashboard.completed') }}</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" :style="{ width: `${taskProgress}%` }"></div>
              </div>
            </div>

            <div class="quick-tasks-list">
              <div v-for="task in timeline.slice(0, 2)" :key="task.title" class="quick-task-item">
                <i class="pi pi-circle-off"></i>
                <span class="task-title">{{ task.title }}</span>
                <span class="task-date">{{ formatDate(task.date) }}</span>
              </div>
              <div v-if="!timeline.length" class="empty-quick-list">
                {{ t('dashboard.noPendingTasks') }}
              </div>
            </div>
          </div>
        </button>

        <!-- CARD: CALENDARIO (Próximos eventos) -->
        <button class="bento-card eventos-card" @click="goTo('calendar')">
          <div class="card-header">
            <div class="card-title">
              <div class="icon-box icon-events"><i class="pi pi-calendar"></i></div>
              <h3>{{ t('dashboard.upcomingEvents') }}</h3>
            </div>
            <i class="pi pi-arrow-up-right arrow-icon"></i>
          </div>

          <div class="card-body-events">
            <div class="events-list">
              <div v-for="evt in upcomingEvents.slice(0, 3)" :key="evt.title" class="event-item">
                <div class="event-date-badge">
                  <span class="day">{{ new Date(evt.date).getDate() }}</span>
                  <span class="month">{{ new Date(evt.date).toLocaleDateString(undefined, { month: 'short' }) }}</span>
                </div>
                <div class="event-info">
                  <span class="event-title">{{ evt.title }}</span>
                  <span class="event-time">
                    <i class="pi pi-clock"></i>
                    {{ new Date(evt.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                </div>
              </div>
              <div v-if="!upcomingEvents.length" class="empty-quick-list">
                {{ t('dashboard.noEvents') }}
              </div>
            </div>
          </div>
        </button>

        <!-- CARD: ALERTAS (Notificaciones recientes) -->
        <div class="bento-card alertas-card">
          <div class="card-header">
            <div class="card-title">
              <div class="icon-box icon-alerts"><i class="pi pi-bell"></i></div>
              <h3>{{ t('dashboard.notifications') }}</h3>
            </div>
          </div>

          <div class="card-body-alerts">
            <div class="alerts-list">
              <button
                v-for="alert in alerts.slice(0, 2)"
                :key="alert.id"
                class="alert-item"
                :class="alert.priority"
                @click="goRoute(alert.route)"
              >
                <i :class="iconFor(alert.type)"></i>
                <div class="alert-info">
                  <strong>{{ alert.title }}</strong>
                  <p>{{ alert.message }}</p>
                </div>
              </button>
              <div v-if="!alerts.length" class="empty-quick-list">
                {{ t('dashboard.noAlerts') }}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <div v-else class="ht-loading-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>{{ t('dashboard.loadError') }}</h3>
      <p class="ht-text-muted">{{ t('dashboard.serverHint') }}</p>
    </div>
  </div>
</template>

<style scoped>
.dashboard-wrapper {
  animation: ht-fade-in .35s ease-out;
  color: var(--color-text);
  width: 100%;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.dashboard-header {
  padding-bottom: var(--space-2);
  border-bottom: 1px dashed var(--color-border);
}

.dashboard-header h2 {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin: var(--space-1) 0;
  color: var(--color-text);
}

.dashboard-header .house-name {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.dashboard-header p {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  margin: 0;
}

/* Bento Grid */
.dashboard-bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-4);
}

.bento-card {
  border: 1px solid var(--accent-border, var(--color-border));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-surface) 95%, transparent);
  backdrop-filter: blur(8px);
  padding: var(--space-4);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  transition: transform 0.2s ease, border-color 0.2s ease;
  min-height: 200px;
}

button.bento-card {
  cursor: pointer;
  width: 100%;
  font-family: inherit;
  color: inherit;
}

.bento-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.card-title h3 {
  font-size: var(--text-base);
  font-weight: 700;
  margin: 0;
}

.icon-box {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
}

.icon-expense { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.icon-tasks { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.icon-events { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.icon-alerts { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

.arrow-icon {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  opacity: 0.5;
  transition: opacity 0.2s, transform 0.2s;
}

.bento-card:hover .arrow-icon {
  opacity: 1;
  transform: translate(2px, -2px);
}

.card-open-button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.card-open-button:hover {
  background: var(--accent-bg-subtle);
}

/* === EXPENSE COMPARE CARDS === */
.gastos-card {
  grid-column: span 8;
  min-height: 220px;
}

.expense-compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  flex: 1;
}

.expense-compare-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  transition: border-color 0.2s, transform 0.2s;
  position: relative;
  overflow: hidden;
}

.expense-compare-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.expense-compare-card--spent::before {
  background: linear-gradient(90deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, transparent));
}

.expense-compare-card--pending::before {
  background: linear-gradient(90deg, #f59e0b, color-mix(in srgb, #f59e0b 60%, transparent));
}

.expense-compare-card--spent {
  background: color-mix(in srgb, var(--color-accent) 5%, var(--color-surface));
}

.expense-compare-card--pending {
  background: color-mix(in srgb, #f59e0b 5%, var(--color-surface));
}

.expense-compare-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.expense-compare-card--pending:hover {
  border-color: #f59e0b;
}

.expense-compare-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: var(--text-base);
}

.expense-compare-card--spent .expense-compare-icon {
  background: rgba(var(--color-accent-rgb, 234 88 12), 0.12);
  color: var(--color-accent);
}

.expense-compare-card--pending .expense-compare-icon {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.expense-compare-amount {
  font-size: var(--text-2xl);
  font-weight: 800;
  line-height: 1;
}

.expense-compare-card--spent .expense-compare-amount {
  color: var(--color-accent);
}

.expense-compare-card--pending .expense-compare-amount {
  color: #f59e0b;
}

.expense-compare-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.03em;
}

/* Card Tareas specific styles */
.tareas-card {
  grid-column: span 4;
}

.card-body-tasks {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.tasks-progress-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.progress-percentage {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-accent);
}

.progress-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.progress-bar-container {
  height: 6px;
  background: var(--color-surface-strong, rgba(0,0,0,0.1));
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}

.quick-tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.quick-task-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.quick-task-item i {
  color: var(--color-text-muted);
}

.task-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-date {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.empty-quick-list {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-4) 0;
}

/* Card Eventos specific styles */
.eventos-card {
  grid-column: span 6;
}

.card-body-events {
  display: flex;
  flex-direction: column;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.event-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.event-date-badge {
  background: var(--color-surface-strong, rgba(0,0,0,0.1));
  border-radius: var(--radius-sm);
  width: 42px;
  height: 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.event-date-badge .day {
  font-size: var(--text-sm);
  font-weight: 700;
  line-height: 1;
}

.event-date-badge .month {
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.event-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.event-title {
  font-size: var(--text-sm);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-time {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Card Alertas specific styles */
.alertas-card {
  grid-column: span 6;
}

.card-body-alerts {
  display: flex;
  flex-direction: column;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  width: 100%;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: inherit;
}

.alert-item:hover {
  border-color: var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.05);
}

.alert-item i {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--color-surface-strong, rgba(0,0,0,0.1));
  color: var(--color-text-muted);
}

.alert-item.high {
  border-color: rgba(239, 68, 68, 0.3);
}

.alert-item.high i {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.alert-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.alert-info strong {
  font-size: var(--text-xs);
  font-weight: 700;
}

.alert-info p {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Responsive Grid */
@media (max-width: 980px) {
  .gastos-card { grid-column: span 12; }
  .tareas-card { grid-column: span 12; }
  .eventos-card { grid-column: span 6; }
  .alertas-card { grid-column: span 6; }
}

@media (max-width: 680px) {
  .eventos-card { grid-column: span 12; }
  .alertas-card { grid-column: span 12; }
  .expense-compare-grid { grid-template-columns: 1fr; }
}
</style>

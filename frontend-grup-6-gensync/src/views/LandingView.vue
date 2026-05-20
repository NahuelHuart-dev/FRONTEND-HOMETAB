<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgLogo from '@/components/svgLogo.vue'
import { useNavigation } from '@/composables/useNavigation'
import { useAnimations } from '@/composables/useAnimations'

defineProps(['config', 'isLoggedIn'])

const { go } = useNavigation()
const { gsap, onScroll, killScrollTriggers } = useAnimations()
const { t } = useI18n()

const features = [
  {
    tag: 'Resumen',
    title: 'Resumen mensual',
    text: 'Al cerrar el mes, ves gastos, tareas y eventos en un mismo resumen. Así la casa sabe qué ha pasado sin revisar cada sección.',
    icon: 'pi pi-chart-pie',
    type: 'summary',
  },
  {
    tag: 'Gastos',
    title: 'Pagos bajo control',
    text: 'Si alguien paga internet o la compra común, queda apuntado al momento. HomeTab separa lo pagado de lo pendiente.',
    icon: 'pi pi-wallet',
    type: 'expenses',
  },
  {
    tag: 'Tareas',
    title: 'Turnos visibles',
    text: 'Cuando toca limpiar o sacar la basura, la tarea aparece con responsable. Nadie tiene que preguntarlo otra vez por el chat.',
    icon: 'pi pi-check-square',
    type: 'tasks',
  },
  {
    tag: 'Agenda',
    title: 'Fechas compartidas',
    text: 'Si hay una cena, visita o reparación, se añade al calendario común. Todos ven la fecha antes de hacer otros planes.',
    icon: 'pi pi-calendar',
    type: 'calendar',
  },
]

onMounted(() => {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.from('.hero-badge-el', { opacity: 0, y: -15, duration: 0.4 })
    .from('.hero-h1', { opacity: 0, y: 20, duration: 0.5 }, '-=0.1')
    .from('.hero-subtitle', { opacity: 0, y: 15, duration: 0.4 }, '-=0.1')
    .from('.hero-actions > *', { opacity: 0, y: 10, duration: 0.35, stagger: 0.1 }, '-=0.1')
    .from('.brand-lockup', { opacity: 0, y: 18, duration: 0.45 }, '-=0.12')

  document.querySelectorAll('.ht-info-block').forEach((block) => {
    const isReverse = block.classList.contains('reverse')
    const text = block.querySelector('.ht-info-text')
    const visual = block.querySelector('.feature-note-wrap')
    const xText = isReverse ? 30 : -30
    const xVisual = isReverse ? -30 : 30
    if (text) onScroll(text, { x: xText, y: 0 })
    if (visual) onScroll(visual, { x: xVisual, y: 0 }, { start: 'top 88%' })
  })
})

onUnmounted(() => killScrollTriggers())
</script>

<template>
  <div class="landing-wrapper">
    <header class="hero-section ht-container">
      <div class="hero-copy">
        <div class="ht-hero-badge hero-badge-el">{{ t('landing.badge') }}</div>

        <h1 class="hero-h1">
          {{ t('landing.titleA') }} <br />
          <span class="ht-resaltado">{{ t('landing.titleB') }}</span>
        </h1>

        <p class="ht-text-muted hero-subtitle">
          {{ t('landing.subtitle') }}
        </p>

        <div class="hero-actions">
          <Button
            v-if="isLoggedIn"
            :label="t('landing.myTabs')"
            size="large"
            rounded
            variant="outlined"
            class="btn-hero-primary"
            @click="go('/tabhub')"
          />
          <Button
            v-else
            :label="t('landing.create')"
            size="large"
            rounded
            variant="outlined"
            class="btn-hero-primary"
            @click="go('/login')"
          />
          <Button
            :label="t('landing.about')"
            size="large"
            rounded
            variant="outlined"
            class="btn-hero-secondary"
            @click="go('/about')"
          />
        </div>
      </div>

      <div class="hero-brand">
        <div class="brand-lockup">
          <SvgLogo class="brand-logo" />
          <div>
            <span class="brand-name">HomeTab</span>
          </div>
        </div>
      </div>
    </header>

    <main class="content-container ht-container">
      <section
        v-for="(feature, index) in features"
        :key="feature.title"
        class="ht-info-block"
        :class="{ reverse: index % 2 === 1 }"
      >
        <div class="ht-info-text">
          <div class="ht-mini-tag">{{ feature.tag }}</div>
          <h2>{{ feature.title }}</h2>
          <p>{{ feature.text }}</p>
        </div>

        <div class="ht-visual-wrapper feature-note-wrap">
          <article class="feature-note" :class="[index % 2 === 0 ? 'tilt-left' : 'tilt-right', `note-${feature.type}`]">
            <div class="tape" aria-hidden="true"></div>
            <div class="note-head">
              <i :class="feature.icon" aria-hidden="true"></i>
              <span>{{ feature.tag }}</span>
            </div>

            <template v-if="feature.type === 'summary'">
              <strong>{{ t('landing.may') }}</strong>
              <div class="summary-bars" aria-hidden="true">
                <span style="--w: 74%"></span>
                <span style="--w: 46%"></span>
                <span style="--w: 62%"></span>
              </div>
              <p>{{ t('landing.demoSummary') }}</p>
            </template>

            <template v-else-if="feature.type === 'expenses'">
              <strong>{{ t('landing.flatExpenses') }}</strong>
              <div class="expense-lines">
                <div><span>Internet</span><em>{{ t('landing.pending') }}</em></div>
                <div><span>Compra común</span><em class="paid">{{ t('landing.paid') }}</em></div>
              </div>
            </template>

            <template v-else-if="feature.type === 'tasks'">
              <strong>{{ t('landing.todayTasks') }}</strong>
              <div class="task-lines">
                <label><span></span>{{ t('landing.trash') }}</label>
                <label><span class="checked"></span>{{ t('landing.plants') }}</label>
              </div>
              <p>{{ t('landing.assignedNoChase') }}</p>
            </template>

            <template v-else>
              <strong>{{ t('landing.week') }}</strong>
              <div class="calendar-dots" aria-hidden="true">
                <span></span><span></span><span class="active"></span><span></span>
                <span></span><span class="event"></span><span></span><span></span>
              </div>
              <p>{{ t('landing.dinner') }}</p>
            </template>
          </article>
        </div>
      </section>

      <section class="first-tab-cta">
        <div>
          <div class="ht-mini-tag">{{ t('landing.firstStep') }}</div>
          <h2>{{ t('landing.firstTitle') }}</h2>
          <p>{{ t('landing.firstText') }}</p>
        </div>

        <Button
          v-if="isLoggedIn"
            :label="t('landing.myTabs')"
          size="large"
          rounded
          variant="outlined"
          class="btn-hero-primary"
          @click="go('/tabhub')"
        />
        <Button
          v-else
            :label="t('landing.create')"
          size="large"
          rounded
          variant="outlined"
          class="btn-hero-primary"
          @click="go('/login')"
        />
      </section>

      <section class="feedback-cta">
        <Button
          :label="t('landing.feedback')"
          size="large"
          rounded
          variant="outlined"
          class="btn-hero-secondary"
          @click="go('/feedback')"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.landing-wrapper {
  width: 100%;
}

.hero-section {
  min-height: calc(100vh - var(--navbar-height));
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.9fr);
  align-items: center;
  gap: var(--space-16);
  padding-top: var(--space-12);
  padding-bottom: var(--space-16);
}

.hero-copy {
  max-width: 680px;
}

.hero-subtitle {
  font-size: var(--text-xl);
  max-width: 620px;
  margin-bottom: var(--space-8);
}

.hero-actions {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.hero-brand {
  display: flex;
  justify-content: center;
}

.brand-lockup {
  width: fit-content;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  padding: var(--space-4);
}

.brand-logo {
  width: 108px;
  color: var(--color-accent);
  flex: 0 0 auto;
}

.brand-name {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: 1;
  color: var(--color-text);
}

.btn-hero-primary {
  background-color: var(--accent-bg-medium) !important;
  border-color: var(--color-accent) !important;
  color: var(--color-text) !important;
  transition:
    transform var(--duration-base) var(--ease-bounce),
    box-shadow var(--duration-base) var(--ease-standard) !important;
}

.btn-hero-primary:hover {
  transform: translateY(-3px) !important;
  box-shadow: var(--shadow-md) !important;
}

.btn-hero-secondary {
  background-color: var(--accent-bg-btn) !important;
  border-color: var(--color-accent) !important;
  color: var(--color-text-muted) !important;
  transition:
    transform var(--duration-base) var(--ease-bounce),
    box-shadow var(--duration-base) var(--ease-standard) !important;
}

.btn-hero-secondary:hover {
  transform: translateY(-3px) !important;
  box-shadow: var(--shadow-md) !important;
}

.content-container {
  padding-bottom: var(--space-20);
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.feature-note-wrap {
  min-width: 0;
}

.feature-note {
  position: relative;
  width: min(100%, 390px);
  min-height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--space-8) var(--space-6) var(--space-6);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--color-card-bg);
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--duration-base) var(--ease-bounce),
    box-shadow var(--duration-base) var(--ease-standard);
}

.feature-note:hover {
  transform: rotate(0deg) translateY(-4px) !important;
  box-shadow: var(--shadow-md);
}

.feature-note .tape {
  top: -13px;
  width: 92px;
  height: 28px;
}

.note-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.note-head i {
  color: var(--color-accent);
  font-size: var(--icon-lg);
}

.note-head span {
  display: block;
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.feature-note strong {
  display: block;
  margin-bottom: var(--space-4);
  font-family: var(--font-accent);
  font-size: var(--text-2xl);
  line-height: 1.1;
  color: var(--color-accent);
}

.feature-note p {
  margin: 0;
  color: var(--color-text-muted);
}

.summary-bars {
  display: grid;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.summary-bars span {
  width: var(--w);
  height: 10px;
  border-radius: var(--radius-pill);
  background: var(--accent-bg-btn);
}

.summary-bars span:first-child {
  background: var(--color-accent);
}

.expense-lines,
.task-lines {
  display: grid;
  gap: var(--space-3);
}

.expense-lines div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px dashed var(--accent-border);
}

.expense-lines span,
.task-lines label {
  color: var(--color-text);
  font-weight: 700;
}

.expense-lines em {
  color: var(--color-accent);
  font-size: var(--text-sm);
  font-style: normal;
  font-weight: 700;
}

.expense-lines em.paid {
  color: var(--color-accent);
}

.task-lines label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.task-lines label span {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-sm);
  flex: 0 0 auto;
}

.task-lines label span.checked {
  background: var(--color-accent);
  box-shadow: inset 0 0 0 4px var(--color-card-bg);
}

.calendar-dots {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.calendar-dots span {
  min-height: 32px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent-bg-subtle);
}

.calendar-dots .active {
  background: var(--color-accent);
}

.calendar-dots .event {
  background: rgba(59, 130, 246, 0.18);
  border-color: rgba(59, 130, 246, 0.4);
}

.tilt-left { transform: rotate(-1.4deg); }
.tilt-right { transform: rotate(1.4deg); }

.first-tab-cta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8);
  border: 2px dashed var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent-bg-subtle);
}

.first-tab-cta h2 {
  margin: 0 0 var(--space-3);
}

.first-tab-cta p {
  margin: 0;
  color: var(--color-text-muted);
}

.feedback-cta {
  display: flex;
  justify-content: center;
}

@media (max-width: 980px) {
  .hero-section {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: var(--space-10);
  }

  .hero-copy {
    text-align: center;
    margin: 0 auto;
  }

  .hero-subtitle {
    margin-left: auto;
    margin-right: auto;
  }

  .hero-actions {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding-top: var(--space-8);
    padding-bottom: var(--space-12);
  }

  .brand-lockup {
    flex-direction: column;
    text-align: center;
  }

  .brand-logo {
    width: 88px;
  }

  .content-container {
    gap: var(--space-16);
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .feature-note {
    transform: rotate(0deg) !important;
  }

  .first-tab-cta {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--space-6);
  }
}
</style>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import http from '@/services/http'

const { t } = useI18n()

const form = ref({
  name: '',
  email: '',
  category: 'General',
  message: '',
  consent: false,
})

const categories = ['General', 'Bug', 'Mejora', 'Usabilidad', 'Legal']
const sending = ref(false)
const feedback = ref({ type: '', text: '' })

const sendFeedback = async () => {
  feedback.value = { type: '', text: '' }

  if (!form.value.consent || form.value.message.trim().length < 10) {
    feedback.value = { type: 'error', text: t('feedback.error') }
    return
  }

  sending.value = true
  try {
    await http.post('/feedback', form.value)
    feedback.value = { type: 'success', text: t('feedback.success') }
    form.value = { name: '', email: '', category: 'General', message: '', consent: false }
  } catch (error) {
    feedback.value = { type: 'error', text: error.response?.data?.error || t('feedback.error') }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <main class="feedback-page ht-container ht-fade-in">
    <section class="feedback-panel">
      <div class="ht-mini-tag">HomeTab</div>
      <h1>{{ t('feedback.title') }}</h1>
      <p class="feedback-subtitle">{{ t('feedback.subtitle') }}</p>

      <form class="feedback-form" @submit.prevent="sendFeedback">
        <label>
          <span>{{ t('feedback.name') }}</span>
          <InputText v-model="form.name" class="ht-input ht-w-full" maxlength="120" />
        </label>

        <label>
          <span>{{ t('feedback.email') }}</span>
          <InputText v-model="form.email" class="ht-input ht-w-full" type="email" />
        </label>

        <label>
          <span>{{ t('feedback.category') }}</span>
          <select v-model="form.category" class="feedback-select">
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </label>

        <label>
          <span>{{ t('feedback.message') }}</span>
          <textarea v-model="form.message" class="feedback-textarea" rows="7" maxlength="2000" required></textarea>
        </label>

        <label class="consent-row">
          <input v-model="form.consent" type="checkbox" required />
          <span>{{ t('feedback.consent') }}</span>
        </label>

        <div v-if="feedback.text" class="feedback-msg" :class="feedback.type">
          {{ feedback.text }}
        </div>

        <Button
          type="submit"
          :label="t('feedback.send')"
          icon="pi pi-send"
          :loading="sending"
          class="feedback-submit"
        />
      </form>
    </section>
  </main>
</template>

<style scoped>
.feedback-page {
  width: 100%;
  padding-top: var(--space-16);
  padding-bottom: var(--space-20);
}

.feedback-panel {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-8);
  border: 2px dashed var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent-bg-subtle);
}

.feedback-panel h1 {
  margin: var(--space-2) 0 var(--space-3);
}

.feedback-subtitle {
  margin: 0 0 var(--space-8);
  color: var(--color-text-muted);
}

.feedback-form {
  display: grid;
  gap: var(--space-5);
}

.feedback-form label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text);
  font-weight: 700;
}

.feedback-select,
.feedback-textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-input-bg);
  color: var(--color-text);
  padding: var(--space-3);
  font-family: var(--font-ui);
}

.feedback-textarea {
  resize: vertical;
}

.consent-row {
  display: flex !important;
  grid-template-columns: none;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--space-3) !important;
  color: var(--color-text-muted) !important;
  font-weight: 600 !important;
}

.feedback-msg {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-weight: 700;
}

.feedback-msg.success {
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
}

.feedback-msg.error {
  border: 1px solid var(--color-error);
  color: var(--color-error);
}

.feedback-submit {
  justify-self: start;
  background-color: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
  color: white !important;
}
</style>

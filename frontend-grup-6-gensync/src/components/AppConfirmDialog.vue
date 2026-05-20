<script setup>
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { state, accept, reject } = useConfirmDialog()
</script>

<template>
  <Dialog
    v-model:visible="state.visible"
    modal
    :closable="false"
    :header="state.title"
    :style="{ width: '90%', maxWidth: '430px' }"
  >
    <p class="confirm-message">{{ state.message }}</p>
    <div class="confirm-actions">
      <Button :label="state.cancelLabel" text class="confirm-cancel" @click="reject" />
      <Button
        :label="state.confirmLabel"
        class="confirm-accept"
        :class="`confirm-${state.severity}`"
        @click="accept"
      />
    </div>
  </Dialog>
</template>

<style scoped>
.confirm-message {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.confirm-cancel {
  color: var(--color-text-muted) !important;
}

.confirm-accept {
  color: white !important;
  background: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
}

.confirm-danger {
  background: var(--color-error) !important;
  border-color: var(--color-error) !important;
}
</style>

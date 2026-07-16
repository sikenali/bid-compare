<script setup lang="ts">
import { RiCheckLine, RiErrorWarningLine, RiInformationLine, RiCloseCircleLine } from '@remixicon/vue'
import { useToast } from '../composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <template v-for="toast in toasts" :key="toast.id">
          <div
            v-if="toast.visible"
            class="toast-item"
            :class="[`toast-${toast.type}`]"
          >
            <RiCheckLine v-if="toast.type === 'success'" class="toast-icon" />
            <RiCloseCircleLine v-else-if="toast.type === 'error'" class="toast-icon" />
            <RiInformationLine v-else-if="toast.type === 'warning'" class="toast-icon" />
            <RiInformationLine v-else class="toast-icon" />
            <span>{{ toast.message }}</span>
          </div>
        </template>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  font-size: 14px;
  font-family: var(--font-ui);
  font-weight: 500;
  min-width: 200px;
  max-width: 320px;
  pointer-events: auto;
  border: 1px solid;
}

.toast-info {
  background: var(--color-cream);
  border-color: var(--color-tan-border);
  color: var(--color-brown-dark);
}

.toast-success {
  background: var(--color-diff-added);
  border-color: var(--color-diff-added-border);
  color: var(--color-jade);
}

.toast-error {
  background: var(--color-diff-deleted);
  border-color: var(--color-diff-deleted-border);
  color: var(--color-cinnabar-dark);
}

.toast-warning {
  background: var(--color-diff-modified);
  border-color: var(--color-diff-modified-border);
  color: var(--color-gold-dark);
}

.toast-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.toast-info .toast-icon { color: var(--color-cinnabar); }
.toast-success .toast-icon { color: var(--color-jade); }
.toast-error .toast-icon { color: var(--color-cinnabar); }
.toast-warning .toast-icon { color: var(--color-gold-dark); }

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

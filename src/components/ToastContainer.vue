<script setup lang="ts">
import { RiCheckLine, RiErrorWarningLine, RiInformationLine } from '@remixicon/vue'
import { useToast } from '../composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="[`toast-${toast.type}`]"
        >
          <RiCheckLine v-if="toast.type === 'success'" class="toast-icon" />
          <RiErrorWarningLine v-else-if="toast.type === 'error'" class="toast-icon" />
          <RiInformationLine v-else-if="toast.type === 'warning'" class="toast-icon" />
          <RiInformationLine v-else class="toast-icon" />
          <span>{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 80px;
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
  padding: 10px 24px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  font-size: 14px;
  font-family: var(--font-ui);
  font-weight: 500;
  white-space: nowrap;
  pointer-events: auto;
}

.toast-info {
  background: var(--color-cream);
  border: 1px solid var(--color-tan-border);
  color: var(--color-brown-dark);
}

.toast-success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.toast-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.toast-warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.toast-info .toast-icon { color: var(--color-cinnabar); }
.toast-success .toast-icon { color: #16a34a; }
.toast-error .toast-icon { color: #dc2626; }
.toast-warning .toast-icon { color: #d97706; }

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

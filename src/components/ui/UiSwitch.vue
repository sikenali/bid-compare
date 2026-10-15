<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}>(), {
  modelValue: false,
  disabled: false,
  size: 'md',
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'change', v: boolean): void;
}>();

function toggle() {
  if (props.disabled) return;
  emit('update:modelValue', !props.modelValue);
  emit('change', !props.modelValue);
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    class="ui-switch"
    :class="['is-' + size, { 'is-on': modelValue, 'is-disabled': disabled }]"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="ui-switch-knob"></span>
  </button>
</template>

<style scoped>
.ui-switch {
  flex-shrink: 0;
  border: none;
  border-radius: 9999px;
  padding: 3px;
  cursor: pointer;
  background-color: var(--color-border, #E5DFD3);
  transition: background-color 0.22s ease, opacity 0.2s;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.is-md { width: 46px; height: 26px; }
.is-sm { width: 38px; height: 22px; padding: 2px; }
.ui-switch.is-on {
  background-color: var(--color-primary, #C0392B);
  justify-content: flex-end;
}
.ui-switch-knob {
  border-radius: 9999px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  transition: transform 0.22s ease;
}
.is-md .ui-switch-knob { width: 20px; height: 20px; }
.is-sm .ui-switch-knob { width: 18px; height: 18px; }
.ui-switch:active:not(:disabled) .ui-switch-knob { transform: scale(0.92); }
.ui-switch.is-disabled { opacity: 0.5; cursor: not-allowed; }
</style>

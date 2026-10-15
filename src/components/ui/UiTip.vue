<script setup lang="ts">
withDefaults(defineProps<{
  text?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
  disabled?: boolean;
}>(), {
  text: '',
  placement: 'top',
  maxWidth: 220,
  disabled: false,
});
</script>

<template>
  <span class="ui-tip" :class="['is-' + placement, { 'is-disabled': disabled }]">
    <slot />
    <span
      v-if="!disabled && ($slots.content || text)"
      class="ui-tip-bubble"
      :style="{ maxWidth: maxWidth + 'px' }"
      role="tooltip"
    >
      <slot name="content">{{ text }}</slot>
    </span>
  </span>
</template>

<style scoped>
.ui-tip {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: fit-content;
  width: fit-content;
}
.ui-tip-bubble {
  position: absolute;
  z-index: var(--z-tooltip, 1070);
  width: max-content;
  max-width: 260px;
  padding: 7px 12px;
  border-radius: 9px;
  background-color: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border, #E5DFD3);
  color: var(--color-text-body, #3A3A3A);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.5;
  font-family: "SourceHanSans-Regular", var(--font-family-cn), sans-serif;
  white-space: nowrap;
  word-break: keep-all;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.96);
  transition: opacity 0.16s ease, transform 0.16s ease;
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.12));
}
.ui-tip:not(.is-disabled):hover .ui-tip-bubble,
.ui-tip:not(.is-disabled):focus-within .ui-tip-bubble {
  opacity: 1;
}
.ui-tip-bubble::after {
  content: '';
  position: absolute;
  width: 7px;
  height: 7px;
  background-color: inherit;
  transform: rotate(45deg);
}
.is-top .ui-tip-bubble {
  bottom: calc(100% + 9px);
  left: 50%;
  transform: translateX(-50%) scale(0.96);
}
.is-top:hover .ui-tip-bubble, .is-top:focus-within .ui-tip-bubble {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}
.is-top .ui-tip-bubble::after { top: calc(100% - 4px); left: calc(50% - 3.5px); }
.is-bottom .ui-tip-bubble {
  top: calc(100% + 9px);
  left: 50%;
  transform: translateX(-50%) scale(0.96);
}
.is-bottom:hover .ui-tip-bubble, .is-bottom:focus-within .ui-tip-bubble {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}
.is-bottom .ui-tip-bubble::after { bottom: calc(100% - 4px); left: calc(50% - 3.5px); }
.is-left .ui-tip-bubble {
  right: calc(100% + 9px);
  top: 50%;
  transform: translateY(-50%) scale(0.96);
}
.is-left:hover .ui-tip-bubble, .is-left:focus-within .ui-tip-bubble {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
.is-left .ui-tip-bubble::after { left: calc(100% - 4px); top: calc(50% - 3.5px); }
.is-right .ui-tip-bubble {
  left: calc(100% + 9px);
  top: 50%;
  transform: translateY(-50%) scale(0.96);
}
.is-right:hover .ui-tip-bubble, .is-right:focus-within .ui-tip-bubble {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
.is-right .ui-tip-bubble::after { right: calc(100% - 4px); top: calc(50% - 3.5px); }
</style>

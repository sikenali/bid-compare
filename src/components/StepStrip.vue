<template>
  <div class="step-strip-root" :class="{ loading: loading, done: done }">
    <div class="step-strip">
      <template v-for="(step, i) in steps" :key="step.key">
        <div
          class="step-pill"
          :class="{
            done: !loading && currentStep > step.key,
            active: !loading && currentStep === step.key,
            processing: loading && step.key < loadingProgress,
            next: loading && step.key === loadingProgress,
          }"
        >
          <span class="step-num">
            <span
              v-if="(!loading && currentStep > step.key) || (loading && step.key < loadingProgress)"
              class="check-icon"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7L5.5 10L11.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span v-else>{{ step.key + 1 }}</span>
          </span>
          <span class="step-label">{{ step.label }}</span>
        </div>
        <span
          v-if="i < steps.length - 1"
          class="step-line"
          :class="{ filled: loadingProgress > i }"
        ></span>
      </template>
    </div>

    <div v-if="buttonLabel" class="btn-area">
      <button
        class="extract-btn"
        :disabled="loading || disabled"
        @click="!loading && !disabled && onExtract()"
      >
        <span v-if="loading" class="btn-spinner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.8"/>
            <path d="M14 8A6 6 0 0 0 8 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.8s" repeatCount="indefinite"/>
            </path>
          </svg>
          {{ done ? '完成' : '处理中…' }}
        </span>
        <span v-else>{{ buttonLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';

interface Step {
  key: number;
  label: string;
}

const props = withDefaults(defineProps<{
  steps: Step[];
  loading?: boolean;
  buttonLabel?: string;
  disabled?: boolean;
}>(), {
  loading: false,
  buttonLabel: '',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'extract'): void;
}>();

function onExtract() {
  emit('extract');
}

const loadingProgress = ref(-1);
const done = ref(false);

watch(() => props.loading, (val) => {
  if (val) {
    done.value = false;
    loadingProgress.value = 0;
  } else {
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    if (loadingProgress.value >= 0) {
      done.value = loadingProgress.value >= props.steps.length;
      loadingProgress.value = -1;
    }
  }
});

let animTimer: ReturnType<typeof setTimeout> | null = null;

watch(loadingProgress, (val) => {
  if (val < 0 || val >= props.steps.length) return;
  animTimer = setTimeout(() => {
    if (!props.loading) return;
    loadingProgress.value = val + 1;
    if (loadingProgress.value >= props.steps.length) {
      done.value = true;
    }
  }, 650);
});

const currentStep = computed(() => {
  if (done.value) return props.steps.length;
  if (loadingProgress.value >= 0) return loadingProgress.value + 1;
  return -1;
});

onUnmounted(() => {
  if (animTimer) clearTimeout(animTimer);
});
</script>

<style scoped>
.step-strip-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.step-strip {
  display: flex;
  align-items: center;
  gap: 0;
}

.step-pill {
  height: 48px;
  padding: 0 20px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--color-bg-white, #fff);
  border: 1.5px solid var(--color-border-soft, var(--color-tan-border, #EDE9E0));
  transition: border-color 0.4s ease, background-color 0.4s ease, box-shadow 0.4s ease;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.step-line {
  width: 48px;
  height: 2px;
  background-color: var(--color-border, var(--color-tan-light, #DDD7C9));
  flex-shrink: 0;
  transition: background-color 0.4s ease;
  position: relative;
  overflow: hidden;
  border-radius: 1px;
}

.step-line::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--color-primary, var(--color-cinnabar, #C0392B));
  transition: left 0.4s ease;
}

/* --- done --- */
.step-pill.done {
  background-color: #E4F0E6;
  border-color: #4E9B7A;
}
.step-pill.done .step-num {
  background-color: #4E9B7A;
  color: #fff;
}
.step-pill.done .step-label { color: #3E8A6B; }

/* --- active (idle state) --- */
.step-pill.active {
  border-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  box-shadow: 0 0 0 3px var(--color-primary-soft, #FBE9E7);
}
.step-pill.active .step-num {
  background-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  color: #fff;
}
.step-pill.active .step-label { color: var(--color-primary, var(--color-cinnabar, #C0392B)); font-weight: 600; }

/* --- loading: passed steps --- */
.step-strip-root.loading .step-pill.processing {
  background-color: #E4F0E6;
  border-color: #4E9B7A;
  animation: processPulse 0.8s ease forwards;
}
.step-strip-root.loading .step-pill.processing .step-num {
  background-color: #4E9B7A;
  color: #fff;
}
.step-strip-root.loading .step-pill.processing .step-label { color: #3E8A6B; }

/* --- loading: current step --- */
.step-strip-root.loading .step-pill.next {
  border-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  animation: nextGlow 1s ease-in-out infinite;
}
.step-strip-root.loading .step-pill.next .step-num {
  background-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  color: #fff;
  animation: numBlink 0.6s ease-in-out infinite;
}
.step-strip-root.loading .step-pill.next .step-label { color: var(--color-primary, var(--color-cinnabar, #C0392B)); }

/* --- line states --- */
.step-line.filled::after { left: 0; }

/* --- done mode --- */
.step-strip-root.done .step-pill {
  background-color: #E4F0E6;
  border-color: #4E9B7A;
}
.step-strip-root.done .step-pill .step-num {
  background-color: #4E9B7A;
  color: #fff;
}
.step-strip-root.done .step-pill .step-label { color: #3E8A6B; }
.step-strip-root.done .step-line {
  background-color: #4E9B7A;
}

/* --- keyframes --- */
@keyframes processPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(78, 155, 122, 0); }
  50% { box-shadow: 0 0 0 5px rgba(78, 155, 122, 0.22); }
}

@keyframes nextGlow {
  0%, 100% { box-shadow: 0 0 0 3px var(--color-primary-soft, #FBE9E7); }
  50% { box-shadow: 0 0 0 6px rgba(192, 57, 43, 0.25); }
}

@keyframes numBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* --- num circle --- */
.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--color-bg-secondary, var(--color-cream-dark, #EFEBE1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted, #8A8578);
  flex-shrink: 0;
  transition: background-color 0.3s ease, color 0.3s ease;
  position: relative;
  z-index: 1;
}

.check-icon {
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: checkIn 0.3s ease;
}

@keyframes checkIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.step-label {
  font-size: 15px;
  color: var(--color-text-muted, #8A8578);
  white-space: nowrap;
  transition: color 0.3s ease, font-weight 0.3s ease;
  position: relative;
  z-index: 1;
  font-family: var(--font-ui);
}

/* --- button --- */
.btn-area {
  padding-top: 32px;
}

.extract-btn {
  width: 260px;
  height: 54px;
  border: none;
  border-radius: 12px;
  background-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  color: #fff;
  font-size: 17px;
  font-weight: 500;
  font-family: var(--font-ui);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s, transform 0.15s, background-color 0.2s;
  position: relative;
  overflow: hidden;
}

.extract-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%);
  pointer-events: none;
}

.extract-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.extract-btn:active:not(:disabled) {
  transform: translateY(0);
}

.extract-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-spinner svg {
  flex-shrink: 0;
}

/* --- responsive --- */
@media (max-width: 640px) {
  .step-strip {
    flex-direction: column;
    gap: 8px;
  }
  .step-line {
    width: 2px;
    height: 24px;
    margin-left: 22px;
  }
  .step-line::after {
    top: -100%;
    left: 0;
    width: 100%;
    height: 100%;
    transition: top 0.4s ease;
  }
  .step-line.filled::after { top: 0; }
  .step-pill { width: 160px; }
}
</style>

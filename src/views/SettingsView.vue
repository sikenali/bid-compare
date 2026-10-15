<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SettingsModal from '../components/layout/SettingsModal.vue'

const router = useRouter()
const visible = ref(true)

watch(visible, (v) => {
  if (!v) router.back()
})
</script>

<template>
  <div class="settings-view">
    <SettingsModal v-model:visible="visible" />
  </div>
</template>

<style scoped>
.settings-view {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

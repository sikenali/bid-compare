<script setup lang="ts">
import SettingsModal from '../components/layout/SettingsModal.vue'
</script>

<template>
  <div class="settings-view">
    <SettingsModal :visible="true" />
  </div>
</template>

<style scoped>
.settings-view {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

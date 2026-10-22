<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import UiModal from '../ui/UiModal.vue'
import ThemeSettingsView from '../../views/settings/ThemeSettingsView.vue'
import TemplateSettingsView from '../../views/settings/TemplateSettingsView.vue'
import SkillSettingsView from '../../views/settings/SkillSettingsView.vue'
import RuleSettingsView from '../../views/settings/RuleSettingsView.vue'
import ModelSettingsView from '../../views/settings/ModelSettingsView.vue'
import ExportSettingsView from '../../views/settings/ExportSettingsView.vue'
import PersonalSettingsView from '../../views/settings/PersonalSettingsView.vue'
import AboutSettingsView from '../../views/settings/AboutSettingsView.vue'
import { riToCompName } from '../../utils/icon'

const props = defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['update:visible'])

const menuItems = [
  { key: 'theme',    label: '主题管理', icon: 'ri-palette-line',       component: ThemeSettingsView },
  { key: 'template', label: '模板管理', icon: 'ri-file-list-2-line',  component: TemplateSettingsView },
  { key: 'skill',    label: '技能管理', icon: 'ri-git-branch-line',   component: SkillSettingsView },
  { key: 'rule',     label: '规则管理', icon: 'ri-rules-line',        component: RuleSettingsView },
  { key: 'model',    label: '模型管理', icon: 'ri-cpu-line',          component: ModelSettingsView },
  { key: 'export',   label: '导出管理', icon: 'ri-download-2-line',   component: ExportSettingsView },
  { key: 'profile',  label: '个性设置', icon: 'ri-user-settings-line', component: PersonalSettingsView },
  { key: 'about',    label: '关于',     icon: 'ri-information-line',  component: AboutSettingsView },
]

const activeKey = ref('theme')

watch(() => props.visible, (v) => {
  if (v) activeKey.value = 'theme'
})

const activeComponent = computed(() => menuItems.find(i => i.key === activeKey.value)?.component)

function selectTab(key: string) {
  activeKey.value = key
}
</script>

<template>
  <UiModal
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    title="设置中心"
    subtitle="选择要进入的设置界面"
    icon="ri-settings-3-line"
    width="92vw"
    :max-width="1400"
    height="92vh"
    :show-footer="false"
    :close-on-click-overlay="false"
  >
    <div class="settings-body">
      <nav class="nav-list">
        <div
          v-for="item in menuItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: activeKey === item.key }"
          @click="selectTab(item.key)"
        >
          <component :is="riToCompName(item.icon)" class="nav-icon" />
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </nav>
      <div class="panel-content">
        <component :is="activeComponent" :key="activeKey" />
      </div>
    </div>
  </UiModal>
</template>

<style scoped>
:deep(.ui-modal-body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 20px;
}

.nav-list {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px;
  padding: 16px;
}

.nav-item {
  height: 52px;
  padding: 0 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
}
.nav-item:hover { background: var(--color-bg-secondary, #F7F3EA); }

.nav-icon {
  font-size: 20px;
  color: var(--color-text-body, #3A3A3A);
  width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.nav-label {
  font-size: 15px;
  color: var(--color-text-body, #3A3A3A);
  white-space: nowrap;
}
.nav-item.active { background: var(--color-primary-soft, #FBE9E7); }
.nav-item.active .nav-icon,
.nav-item.active .nav-label {
  color: var(--color-primary, #C0392B);
  font-weight: 500;
}

.panel-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.panel-content :deep(.page-header-card) { display: none; }
</style>

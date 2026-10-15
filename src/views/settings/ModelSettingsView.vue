<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const { settings, saveSettings } = useSettings()
const { show: showToast } = useToast()

const configTab = ref<'provider' | 'custom'>('provider')
const customProvider = ref('')
const customModel = ref('')
const apiKeyValue = ref('')
const keyVisible = ref(false)

interface ModelItem {
  id: string
  name: string
  icon: string
  provider: string
  model: string
}

const domesticModels: ModelItem[] = [
  { id: 'qwen',   name: '通义千问',   icon: 'RiRobotLine',   provider: '阿里云', model: 'qwen-turbo' },
  { id: 'wenxin', name: '文心一言',   icon: 'RiRobotLine',   provider: '百度',   model: 'ernie-4.0' },
  { id: 'glm',    name: '智谱 GLM',   icon: 'RiRobotLine',   provider: '智谱',   model: 'glm-4' },
]

const foreignModels: ModelItem[] = [
  { id: 'gpt4o',  name: 'GPT-4o',     icon: 'RiOpenaiFill',  provider: 'OpenAI', model: 'gpt-4o' },
  { id: 'claude', name: 'Claude 3.5', icon: 'RiRobotLine',   provider: 'Anthropic', model: 'claude-3-5-sonnet' },
]

interface SavedKey {
  id: string
  provider: string
  model: string
  key: string
}

const savedKeys = ref<SavedKey[]>([])

onMounted(() => {
  if (settings.apiKey) {
    savedKeys.value.push({
      id: 'default',
      provider: '自定义',
      model: settings.selectedModel || '',
      key: settings.apiKey,
    })
  }
})

function addApiKey() {
  const key = apiKeyValue.value.trim()
  if (!key) { showToast('请输入 API Key', 'warning'); return }
  if (configTab.value === 'custom') {
    if (!customProvider.value.trim() || !customModel.value.trim()) {
      showToast('请填写服务商和模型名称', 'warning'); return
    }
    savedKeys.value.push({
      id: Date.now().toString(),
      provider: customProvider.value.trim(),
      model: customModel.value.trim(),
      key,
    })
  } else {
    const m = domesticModels.find(x => x.id === settings.selectedModel) || foreignModels.find(x => x.id === settings.selectedModel)
    if (m) {
      savedKeys.value.push({
        id: Date.now().toString(),
        provider: m.provider,
        model: m.model,
        key,
      })
    }
  }
  settings.apiKey = key
  apiKeyValue.value = ''
  customProvider.value = ''
  customModel.value = ''
  saveSettings()
  showToast('API Key 已保存', 'success')
}

function removeApiKey(id: string) {
  const removed = savedKeys.value.find(k => k.id === id)
  savedKeys.value = savedKeys.value.filter(k => k.id !== id)
  if (removed && removed.key === settings.apiKey) {
    settings.apiKey = savedKeys.value.length > 0 ? savedKeys.value[savedKeys.value.length - 1].key : ''
    saveSettings()
  }
}

function resetForm() {
  apiKeyValue.value = ''
  customProvider.value = ''
  customModel.value = ''
  keyVisible.value = false
}
</script>

<template>
  <div class="model-view">
    <div class="page-header-card">
      <div class="header-content">
        <div class="header-info">
          <div class="breadcrumb">
            <span>首页</span><span class="sep">/</span>
            <span>设置中心</span><span class="sep">/</span>
            <span class="current">模型管理</span>
          </div>
          <div class="header-title">
            <h1>模型管理</h1>
            <p>配置 AI 大模型服务商与 API Key 连接</p>
          </div>
        </div>
        <button class="reset-button" @click="resetForm">
          <RiRestartLine class="icon" />清空表单
        </button>
      </div>
    </div>

    <div class="section-card">
      <div class="card-title">模型选择</div>
      <div class="model-list">
        <span class="model-section">国内模型</span>
        <div
          v-for="m in domesticModels"
          :key="m.id"
          class="model-item"
          :class="{ active: settings.selectedModel === m.id }"
          @click="settings.selectedModel = m.id; saveSettings()"
        >
          <div class="model-icon-wrap" :class="{ active: settings.selectedModel === m.id }">
            <component :is="m.icon" :size="16" />
          </div>
          <span class="model-name" :class="{ active: settings.selectedModel === m.id }">{{ m.name }}</span>
        </div>
        <div class="model-divider" />
        <span class="model-section">国外模型</span>
        <div
          v-for="m in foreignModels"
          :key="m.id"
          class="model-item"
          :class="{ active: settings.selectedModel === m.id }"
          @click="settings.selectedModel = m.id; saveSettings()"
        >
          <div class="model-icon-wrap" :class="{ active: settings.selectedModel === m.id }">
            <component :is="m.icon" :size="16" />
          </div>
          <span class="model-name" :class="{ active: settings.selectedModel === m.id }">{{ m.name }}</span>
        </div>
      </div>

      <div class="config-panel">
        <div class="config-tabs">
          <button class="config-tab" :class="{ active: configTab === 'provider' }" @click="configTab = 'provider'">模型制造商</button>
          <button class="config-tab" :class="{ active: configTab === 'custom' }" @click="configTab = 'custom'">自定义配置</button>
        </div>

        <div class="config-form">
          <div class="form-field">
            <label class="form-label">服务商</label>
            <input v-if="configTab === 'custom'" v-model="customProvider" class="form-input" placeholder="例如: OpenAI" />
            <div v-else class="form-input static">{{ domesticModels.find(m => m.id === settings.selectedModel)?.provider || foreignModels.find(m => m.id === settings.selectedModel)?.provider || '' }}</div>
          </div>
          <div class="form-field">
            <label class="form-label">模型</label>
            <input v-if="configTab === 'custom'" v-model="customModel" class="form-input" placeholder="例如: gpt-4" />
            <div v-else class="form-input static">{{ domesticModels.find(m => m.id === settings.selectedModel)?.model || foreignModels.find(m => m.id === settings.selectedModel)?.model || '' }}</div>
          </div>
          <div class="form-field">
            <label class="form-label">API Key</label>
            <div class="form-input-row">
              <input v-model="apiKeyValue" :type="keyVisible ? 'text' : 'password'" class="form-input" placeholder="sk-..." />
              <button class="form-key-toggle" @click="keyVisible = !keyVisible">
                <RiEyeOffLine v-if="!keyVisible" :size="16" />
                <RiEyeLine v-else :size="16" />
              </button>
            </div>
          </div>
          <div class="form-actions">
            <button class="form-btn-cancel" @click="resetForm">取消</button>
            <button class="form-btn-add" @click="addApiKey">添加</button>
          </div>
        </div>

        <div v-if="savedKeys.length > 0" class="saved-keys">
          <span class="saved-keys-title">已保存的密钥</span>
          <div v-for="k in savedKeys" :key="k.id" class="saved-key-item">
            <div class="saved-key-info">
              <span class="saved-key-provider">{{ k.provider }}</span>
              <span class="saved-key-model">{{ k.model }}</span>
            </div>
            <button class="saved-key-delete" @click="removeApiKey(k.id)">
              <RiDeleteBinLine :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-view { display: flex; flex-direction: column; gap: 20px; }

.page-header-card {
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; padding: 20px 24px;
}
.header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.header-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.breadcrumb span { color: var(--color-text-faint, #A7A296); }
.breadcrumb span.current { color: var(--color-text-body, #3A3A3A); font-weight: 500; }
.header-title h1 { font-size: 30px; font-weight: 700; color: var(--color-text-primary, #1F1D1A); margin: 12px 0 0; letter-spacing: -0.5px; line-height: 1.2; }
.header-title p { font-size: 15px; color: var(--color-text-secondary, #6E6A60); margin: 8px 0 0; }
.reset-button {
  display: inline-flex; align-items: center; gap: 8px; padding: 0 20px; height: 48px;
  border: 0.7px solid var(--color-border, #E5DFD3); background: var(--color-bg-white, #FFFFFF);
  border-radius: 12px; font-size: 15px; color: var(--color-text-body, #3A3A3A);
  cursor: pointer; transition: all 0.2s; flex-shrink: 0;
}
.reset-button:hover { background: var(--color-bg-secondary, #F7F3EA); }
.reset-button .icon { font-size: 18px; }

.section-card {
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; padding: 24px 28px;
}
.card-title { font-size: 17px; font-weight: 500; color: var(--color-text-primary, #1F1D1A); margin-bottom: 20px; }

.model-list { display: flex; flex-direction: column; gap: 4px; }
.model-section { font-size: 11px; font-weight: 600; color: var(--color-text-muted, #8A8578); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0 4px; }
.model-item {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  border-radius: 12px; cursor: pointer; transition: all 0.2s;
}
.model-item:hover { background: var(--color-bg-secondary, #F7F3EA); }
.model-item.active { background: var(--color-primary, #C0392B); }
.model-icon-wrap {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--color-bg-secondary, #F7F3EA);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: var(--color-text-secondary, #6E6A60);
}
.model-item.active .model-icon-wrap { background: rgba(255,255,255,0.2); color: #fff; }
.model-name { font-size: 14px; color: var(--color-text-secondary, #6E6A60); font-weight: 500; }
.model-name.active { color: #fff; font-weight: 600; }
.model-divider { height: 1px; background: var(--color-border-soft, #EDE9E0); margin: 8px 0; }

.config-panel { margin-top: 24px; display: flex; flex-direction: column; gap: 20px; }
.config-tabs {
  display: flex; gap: 4px; background: var(--color-bg-secondary, #F7F3EA);
  border-radius: 12px; padding: 4px; width: fit-content;
}
.config-tab {
  padding: 8px 20px; border: none; border-radius: 8px; background: transparent;
  color: var(--color-text-muted, #8A8578); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.config-tab.active { background: var(--color-primary, #C0392B); color: #fff; font-weight: 600; }

.config-form {
  background: var(--color-bg-secondary, #F7F3EA);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; padding: 24px;
  display: flex; flex-direction: column; gap: 20px;
}
.form-field { display: flex; align-items: center; gap: 16px; }
.form-label { width: 90px; font-size: 13px; font-weight: 500; color: var(--color-text-secondary, #6E6A60); flex-shrink: 0; }
.form-input {
  flex: 1; background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 10px; padding: 10px 12px; font-size: 13px;
  color: var(--color-text-body, #3A3A3A); outline: none; transition: all 0.2s;
}
.form-input:focus { border-color: var(--color-primary, #C0392B); }
.form-input.static { cursor: default; }
.form-input-row { display: flex; align-items: center; flex: 1; position: relative; }
.form-input-row .form-input { padding-right: 40px; }
.form-key-toggle {
  border: none; background: transparent; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; position: absolute; right: 8px; top: 50%;
  transform: translateY(-50%); border-radius: 6px; color: var(--color-text-faint, #A7A296);
}
.form-key-toggle:hover { color: var(--color-text-secondary, #6E6A60); }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; }
.form-btn-cancel {
  padding: 10px 24px; border: 0.7px solid var(--color-border, #E5DFD3);
  border-radius: 10px; background: var(--color-bg-white, #FFFFFF);
  color: var(--color-text-muted, #8A8578); font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.form-btn-cancel:hover { background: var(--color-bg-secondary, #F7F3EA); }
.form-btn-add {
  padding: 10px 24px; border: none; border-radius: 10px;
  background: var(--color-primary, #C0392B); color: #fff;
  font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.form-btn-add:hover { background: color-mix(in srgb, var(--color-primary, #C0392B) 88%, black); }

.saved-keys { display: flex; flex-direction: column; gap: 8px; }
.saved-keys-title {
  font-size: 13px; font-weight: 600; color: var(--color-text-muted, #8A8578);
  text-transform: uppercase; letter-spacing: 0.5px; padding: 0 0 4px;
}
.saved-key-item {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; background: var(--color-bg-secondary, #F7F3EA);
  border: 0.7px solid var(--color-border-soft, #EDE9E0); border-radius: 12px;
}
.saved-key-info { display: flex; flex-direction: column; gap: 2px; }
.saved-key-provider { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #1F1D1A); }
.saved-key-model { font-size: 12px; color: var(--color-text-muted, #8A8578); }
.saved-key-delete {
  width: 30px; height: 30px; border: none; background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center; border-radius: 6px;
  color: var(--color-text-faint, #A7A296); transition: all 0.2s;
}
.saved-key-delete:hover { background: rgba(192,57,43,0.08); color: var(--color-primary, #C0392B); }
</style>

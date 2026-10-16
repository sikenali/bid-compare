<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { deleteApiKey, toggleApiKey, testApiKey, updateApiKey, addApiKey, getApiKeyList } from '../../api/settings'
import { UiSelect, UiInput, UiSelectCard, UiTip, UiModal, UiSwitch, type UiSelectOption } from '../../components/ui'

const { settings, saveSettings } = useSettings()
const { show: showToast } = useToast()

const configTab = ref<'provider' | 'custom'>('provider')
const keyInput = ref('')
const keyVisible = ref(false)

const customApiFormat = ref<'openai' | 'anthropic'>('openai')
const customEndpoint = ref('')
const customModelId = ref('')

const providerModelsMap: Record<string, string[]> = {
  '阿里云': ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
  '百度': ['ernie-4.0-turbo-8k', 'ernie-3.5-turbo-128k', 'ernie-speed-128k'],
  '智谱': ['glm-4-flash', 'glm-4-air', 'glm-4-plus'],
  'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
  'OpenAI': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  'Anthropic': ['claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-3-opus'],
}

const selectedProvider = ref('')
const selectedModelName = ref('')
const providerModels = computed(() => providerModelsMap[selectedProvider.value] || [])

const providerOptions: UiSelectOption[] = [
  { value: '阿里云', label: '阿里云', desc: '通义千问', group: '国内' },
  { value: '百度', label: '百度', desc: '文心一言', group: '国内' },
  { value: '智谱', label: '智谱', desc: 'GLM', group: '国内' },
  { value: 'DeepSeek', label: 'DeepSeek', group: '国内' },
  { value: 'OpenAI', label: 'OpenAI', desc: 'GPT', group: '国外' },
  { value: 'Anthropic', label: 'Anthropic', desc: 'Claude', group: '国外' },
]
const modelOptions = computed<UiSelectOption[]>(() =>
  providerModels.value.map(m => ({ value: m, label: m })),
)
const formatOptions: UiSelectOption[] = [
  { value: 'openai', label: 'OpenAI Chat Completions 格式' },
  { value: 'anthropic', label: 'Anthropic Messages 格式' },
]

function onProviderChange() {
  selectedModelName.value = ''
}

interface SavedKey {
  id: string
  provider: string
  model: string
  maskedKey: string
  enabled: boolean
  baseUrl?: string
  format?: string
}

const savedKeys = ref<SavedKey[]>([])
const testingKey = ref<string | null>(null)
const testSuccess = ref<Record<string, boolean>>({})
const testFailed = ref<Record<string, boolean>>({})
const testError = ref<Record<string, string>>({})
const editingId = ref('')
const showDeleteDialog = ref(false)
const deletingId = ref('')

async function loadKeys() {
  try {
    const keys = getApiKeyList()
    savedKeys.value = (keys || []).map((k: any) => ({
      id: k.id,
      provider: k.provider,
      model: k.model,
      maskedKey: k.api_key || '••••',
      enabled: k.enabled !== 0,
      baseUrl: k.base_url || '',
      format: k.format || 'openai',
    }))
  } catch {}
}

function syncToSettings(key: { provider: string; model: string; api_key?: string }) {
  const providerMap: Record<string, string> = {
    '阿里云': 'qwen', '百度': 'wenxin', '智谱': 'glm',
    'DeepSeek': 'deepseek', 'OpenAI': 'openai', 'Anthropic': 'claude',
  }
  const providerKey = providerMap[key.provider] || key.provider
  settings.selectedModel = providerKey
  if (key.api_key) {
    settings.apiKey = key.api_key
    saveSettings()
  }
}

async function handleSave() {
  const key = keyInput.value.trim()
  if (configTab.value === 'custom') {
    if (!customEndpoint.value.trim() || !customModelId.value.trim()) {
      showToast('请填写自定义地址和模型 ID', 'warning')
      return
    }
    const payload: any = {
      provider: customApiFormat.value === 'anthropic' ? 'Anthropic (自定义)' : 'OpenAI (自定义)',
      model: customModelId.value.trim(),
      base_url: customEndpoint.value.trim(),
      format: customApiFormat.value,
    }
    if (key) payload.api_key = key
    try {
      if (editingId.value) {
        await updateApiKey(editingId.value, payload)
        showToast('自定义配置已更新', 'success')
      } else {
        if (!key) { showToast('请输入 API Key', 'warning'); return }
        await addApiKey(payload)
        showToast('自定义配置已保存', 'success')
      }
      syncToSettings({ provider: payload.provider, model: payload.model, api_key: key || undefined })
      resetForm()
      await loadKeys()
    } catch (err: any) {
      showToast(err?.message || '保存失败', 'error')
    }
  } else {
    if (!selectedProvider.value || !selectedModelName.value) {
      showToast('请选择服务商和模型', 'warning')
      return
    }
    const payload: any = {
      provider: selectedProvider.value,
      model: selectedModelName.value,
      format: selectedProvider.value === 'Anthropic' ? 'anthropic' : 'openai',
    }
    if (key) payload.api_key = key
    try {
      if (editingId.value) {
        await updateApiKey(editingId.value, payload)
        showToast(`「${selectedProvider.value}」配置已更新`, 'success')
      } else {
        if (!key) { showToast('请输入 API Key', 'warning'); return }
        await addApiKey(payload)
        showToast(`「${selectedProvider.value}」API Key 已保存`, 'success')
      }
      syncToSettings({ provider: selectedProvider.value, model: selectedModelName.value, api_key: key || undefined })
      resetForm()
      await loadKeys()
    } catch (err: any) {
      showToast(err?.message || '保存失败', 'error')
    }
  }
}

function resetForm() {
  keyInput.value = ''
  keyVisible.value = false
  selectedProvider.value = ''
  selectedModelName.value = ''
  customEndpoint.value = ''
  customModelId.value = ''
  editingId.value = ''
}

function openDelete(id: string) {
  deletingId.value = id
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deletingId.value) return
  try {
    await deleteApiKey(deletingId.value)
    showDeleteDialog.value = false
    showToast('已删除', 'success')
    if (editingId.value === deletingId.value) resetForm()
    await loadKeys()
  } catch { showToast('删除失败', 'error') }
}

async function handleToggle(key: SavedKey) {
  try {
    const result = await toggleApiKey(key.id)
    key.enabled = result.enabled === 1
    if (key.enabled) {
      const storedKey = getApiKeyList().find(k => k.id === key.id)
      if (storedKey) syncToSettings({ provider: storedKey.provider, model: storedKey.model, api_key: storedKey.api_key })
    }
  } catch { showToast('操作失败', 'error') }
}

async function handleTest(key: SavedKey) {
  testingKey.value = key.id
  testSuccess.value[key.id] = false
  testFailed.value[key.id] = false
  testError.value[key.id] = ''
  try {
    const result = await testApiKey({ id: key.id })
    if (result.available) {
      testSuccess.value[key.id] = true
    } else {
      testFailed.value[key.id] = true
      testError.value[key.id] = result.error || '测试失败'
    }
  } catch (err: any) {
    testFailed.value[key.id] = true
    testError.value[key.id] = err?.message || '网络错误'
  } finally {
    testingKey.value = null
  }
}

function startEdit(key: SavedKey) {
  editingId.value = key.id
  if (key.baseUrl) {
    configTab.value = 'custom'
    customApiFormat.value = (key.format as any) || 'openai'
    customEndpoint.value = key.baseUrl
    customModelId.value = key.model
  } else {
    configTab.value = 'provider'
    selectedProvider.value = key.provider
    selectedModelName.value = key.model
  }
  keyInput.value = ''
}

onMounted(async () => {
  await loadKeys()
  const activeKey = savedKeys.value.find(k => k.enabled)
  if (activeKey && activeKey.provider) {
    syncToSettings({ provider: activeKey.provider, model: activeKey.model })
  }
})
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
      <div class="card-title">API Key</div>
      <div class="density-group">
        <UiSelectCard
          :selected="configTab === 'provider'"
          title="模型制造商"
          desc="从内置服务商列表选择模型并填写 API Key"
          @select="configTab = 'provider'"
        />
        <UiSelectCard
          :selected="configTab === 'custom'"
          title="自定义配置"
          desc="手动填写 API 格式、端点地址和模型 ID"
          @select="configTab = 'custom'"
        />
      </div>

      <div class="config-form">
        <template v-if="configTab === 'provider'">
          <div class="form-field">
            <label class="form-label">服务商</label>
            <UiSelect v-model="selectedProvider" :options="providerOptions" placeholder="请选择服务商" @change="onProviderChange" />
          </div>
          <div class="form-field">
            <label class="form-label">模型</label>
            <UiSelect v-model="selectedModelName" :options="modelOptions" placeholder="请选择模型" />
          </div>
        </template>

        <template v-else>
          <div class="form-field">
            <label class="form-label">API格式</label>
            <UiSelect v-model="customApiFormat" :options="formatOptions" />
          </div>
          <div class="form-field">
            <label class="form-label">自定义地址</label>
            <UiInput v-model="customEndpoint" placeholder="https://api.example.com/v1" clearable />
          </div>
          <div class="form-field">
            <label class="form-label">模型ID</label>
            <UiInput v-model="customModelId" placeholder="例如: gpt-4" clearable />
          </div>
        </template>

        <div class="form-field">
          <label class="form-label">API Key</label>
          <div class="form-input-row">
            <UiInput
              v-model="keyInput"
              :type="keyVisible ? 'text' : 'password'"
              :placeholder="editingId ? '留空则保留原密钥，输入则更换' : 'sk-...'"
            >
              <template #suffix>
                <button class="form-key-toggle" @click="keyVisible = !keyVisible">
                  <RiEyeLine v-if="keyVisible" class="icon" /><RiEyeOffLine v-else class="icon" />
                </button>
              </template>
            </UiInput>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn-save" @click="handleSave">{{ editingId ? '更新配置' : '保存配置' }}</button>
      </div>

      <div v-if="savedKeys.length > 0" class="saved-keys">
        <span class="saved-keys-title">已保存的密钥</span>
        <div v-for="key in savedKeys" :key="key.id" class="saved-key-item">
          <div class="saved-key-info">
            <span class="saved-key-provider">{{ key.provider }}</span>
            <span class="saved-key-model">{{ key.model }}<span v-if="key.baseUrl" class="saved-key-endpoint"> · {{ key.baseUrl }}</span></span>
          </div>
          <div class="saved-key-actions">
            <span class="saved-key-masked">{{ key.maskedKey }}</span>
            <button class="saved-key-test" @click="handleTest(key)" :disabled="testingKey === key.id">
              <RiLoader4Line v-if="testingKey === key.id" class="icon spinning" />
              <RiCheckLine v-else-if="testSuccess[key.id]" class="icon success" />
              <RiCloseCircleLine v-else-if="testFailed[key.id]" class="icon failed" />
              <span v-else>{{ testSuccess[key.id] ? '连通性正常' : testFailed[key.id] ? '失败' : '测试' }}</span>
            </button>
            <UiTip text="编辑">
              <button class="saved-key-edit" @click="startEdit(key)">
                <RiEditLine class="icon" />
              </button>
            </UiTip>
            <UiTip text="删除">
              <button class="saved-key-delete" @click="openDelete(key.id)">
                <RiDeleteBinLine class="icon" />
              </button>
            </UiTip>
            <UiSwitch :model-value="key.enabled" size="sm" @click="handleToggle(key)" />
          </div>
        </div>
        <div v-if="Object.values(testError).some(v => v)" class="test-error-msg">
          {{ Object.values(testError).find(v => v) }}
        </div>
      </div>
    </div>

    <UiModal
      v-model="showDeleteDialog"
      title="删除密钥"
      subtitle="删除后使用该密钥的抽取将不可用"
      icon="ri-delete-bin-line"
      :width="480"
      confirm-text="确认删除"
      @confirm="confirmDelete"
    >
      <p class="confirm-text">确定删除该 API 密钥配置？</p>
    </UiModal>
  </div>
</template>

<style scoped>
.model-view { display: flex; flex-direction: column; gap: 20px; }

.page-header-card {
  background-color: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; padding: 20px 24px;
}
.header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.header-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 14px; font-family: "SourceHanSans-Regular", var(--font-family-cn); }
.breadcrumb span { color: var(--color-text-faint, #A7A296); }
.breadcrumb span.sep { color: var(--color-text-faint, #A7A296); }
.breadcrumb span.current { color: var(--color-text-body, #3A3A3A); font-weight: 500; }
.header-title h1 { font-size: 30px; font-weight: 700; color: var(--color-text-primary, #1F1D1A); margin: 12px 0 0 0; letter-spacing: -0.5px; font-family: "SourceHanSans-Bold", var(--font-family-cn); line-height: 1.2; }
.header-title p { font-size: 15px; color: var(--color-text-secondary, #6E6A60); margin: 8px 0 0 0; font-family: "SourceHanSans-Regular", var(--font-family-cn); }
.reset-button {
  display: inline-flex; align-items: center; gap: 8px; padding: 0 20px; height: 48px;
  border: 0.7px solid var(--color-border, #E5DFD3); background-color: var(--color-bg-white, #FFFFFF); border-radius: 12px;
  font-size: 15px; color: var(--color-text-body, #3A3A3A); cursor: pointer; transition: all 0.2s; flex-shrink: 0;
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}
.reset-button:hover { background-color: var(--color-bg-secondary, #F7F3EA); }
.reset-button .icon { font-family: "remixicon", sans-serif; font-style: normal; font-size: 18px; }

.section-card {
  background-color: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; padding: 24px 40px;
}
.card-title {
  font-size: 17px; font-weight: 500; color: var(--color-text-primary, #1F1D1A);
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
}
.density-group { display: flex; gap: 24px; margin-top: 20px; }
.density-group > * { flex: 1; min-width: 0; display: flex; }
.density-group > * > * { flex: 1; }

.config-form {
  margin-top: 24px; background-color: var(--color-bg-card, #FCFBF8);
  border: 0.7px solid var(--color-border-soft, #EDE9E0); border-radius: 16px; padding: 24px;
  display: flex; flex-direction: column; gap: 20px;
}
.form-field { display: flex; align-items: center; gap: 16px; }
.form-label {
  width: 90px; font-size: 13px; font-weight: 500; color: var(--color-text-secondary, #6E6A60); flex-shrink: 0;
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}
.form-field > .ui-select,
.form-field > .ui-input,
.form-input-row > .ui-input { flex: 1; min-width: 0; }
.form-input-row { display: flex; align-items: center; flex: 1; position: relative; }
.form-key-toggle {
  border: none; background-color: transparent; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px;
}
.form-key-toggle .icon { font-family: "remixicon", sans-serif; font-style: normal; font-size: 18px; color: var(--color-text-faint, #A7A296); }
.form-key-toggle:hover .icon { color: var(--color-text-secondary, #6E6A60); }

.form-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
.btn-save {
  height: 44px; padding: 0 28px; border: none; border-radius: 10px;
  background-color: var(--color-primary, #C0392B); color: #fff; font-size: 15px; font-weight: 500;
  cursor: pointer; font-family: "SourceHanSans-Medium", var(--font-family-cn);
  transition: background-color 0.2s, transform 0.1s; white-space: nowrap;
}
.btn-save:hover { background-color: color-mix(in srgb, var(--color-primary, #C0392B) 88%, black); }
.btn-save:active { transform: scale(0.97); }

.saved-keys {
  margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--color-border-soft, #EDE9E0);
  display: flex; flex-direction: column; gap: 8px;
}
.saved-keys-title {
  font-size: 13px; font-weight: 600; color: var(--color-text-muted, #8A8578);
  text-transform: uppercase; letter-spacing: 0.5px; padding: 0 0 4px;
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
}
.saved-key-item {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; background-color: var(--color-bg-card, #FCFBF8);
  border: 0.7px solid var(--color-border-soft, #EDE9E0); border-radius: 12px;
}
.saved-key-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.saved-key-provider { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #1F1D1A); font-family: "SourceHanSans-Medium", var(--font-family-cn); }
.saved-key-model { font-size: 12px; color: var(--color-text-muted, #8A8578); font-family: "SourceHanSans-Regular", var(--font-family-cn); }
.saved-key-endpoint { font-size: 11px; color: var(--color-text-faint, #A7A296); font-family: monospace; }
.saved-key-actions { display: flex; align-items: center; gap: 10px; }
.saved-key-masked { font-size: 12px; color: var(--color-text-faint, #A7A296); font-family: monospace; padding: 0 8px; }

.saved-key-test,
.saved-key-edit,
.saved-key-delete {
  height: 30px; padding: 0 10px; border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 8px; background-color: var(--color-bg-white, #fff); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  font-size: 12px; color: var(--color-text-secondary, #6E6A60); transition: background-color 0.15s;
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}
.saved-key-test:hover { background-color: var(--color-bg-secondary, #F7F3EA); }
.saved-key-edit:hover { background-color: var(--color-bg-secondary, #F7F3EA); }
.saved-key-delete:hover { background-color: rgba(192, 57, 43, 0.08); color: var(--color-primary, #C0392B); }
.saved-key-test:disabled { opacity: 0.4; cursor: not-allowed; }
.saved-key-test .icon,
.saved-key-edit .icon,
.saved-key-delete .icon { font-family: "remixicon", sans-serif; font-style: normal; font-size: 14px; }
.saved-key-test .icon.spinning { animation: spin 1s linear infinite; }
.saved-key-test .icon.success { color: var(--color-success, #4E9B7A); }
.saved-key-test .icon.failed { color: var(--color-error, #E74C3C); }

.test-error-msg {
  margin-top: 8px; font-size: 12px; color: var(--color-error, #E74C3C);
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}

.confirm-text {
  font-size: 15px; color: var(--color-text-body, #3A3A3A);
  font-family: "SourceHanSans-Regular", var(--font-family-cn); margin: 0; line-height: 1.7;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>

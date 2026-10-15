<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  RiFileTextLine,
  RiBuildingLine,
  RiServerLine,
  RiCustomerServiceLine,
  RiArrowDownSLine,
  RiAddLine,
  RiDeleteBinLine,
  RiCloseLine,
  RiCheckLine
} from '@remixicon/vue'

export interface SkillEntry {
  id: string
  name: string
  description: string
  category: string
  prompt: string
  type?: 'chat' | 'generate'
  enabled?: boolean
  path?: string
}

const props = defineProps<{
  apiBase?: string
}>()

const apiBase = props.apiBase || '/api'

const builtinSkills: SkillEntry[] = [
  { id: 'generate-bid', name: '生成标书', description: '根据需求自动生成标书大纲和内容', category: '智能写作', type: 'generate', prompt: '你是一名资深的投标文件撰写专家。根据用户提供的需求描述，生成一份完整的标书大纲。只输出 Markdown 格式的大纲，使用 # 表示章，## 表示节，### 表示小节。不要输出额外说明。' },
  { id: 'outline', name: '大纲生成', description: '根据招标文件自动生成标书大纲', category: '智能写作', prompt: '请根据以下内容生成一份完整的标书大纲，包含章节标题和层级结构：' },
  { id: 'expand', name: '内容扩写', description: '基于大纲要点自动扩写章节内容', category: '智能写作', prompt: '请扩写以下内容，使其更加详细和专业：' },
  { id: 'summarize', name: '摘要总结', description: '提取文档关键信息生成简洁摘要', category: '智能处理', prompt: '请对以下内容进行摘要总结，提取关键信息：' },
  { id: 'format', name: '格式优化', description: '统一文档格式、段落和排版风格', category: '智能处理', prompt: '请优化以下内容的格式和排版，使其更加规范统一：' },
]

const localSkills = ref<SkillEntry[]>([])
const customSkills = ref<SkillEntry[]>([])
const hiddenSkills = ref(new Set<string>())
const showMoreSkills = ref(false)
const showSkillPreview = ref(false)
const currentSkillContent = ref('')
const currentSkillName = ref('')
const skillFileInput = ref<HTMLInputElement | null>(null)

const iconMap = [
  { icon: RiFileTextLine, bg: '#C23B22' },
  { icon: RiBuildingLine, bg: '#2D6A9F' },
  { icon: RiServerLine, bg: '#2D8A4E' },
  { icon: RiCustomerServiceLine, bg: '#D4A017' },
]

const allManageableSkills = computed(() => [
  ...builtinSkills,
  ...localSkills.value,
  ...customSkills.value
])

const displaySkills = computed(() => {
  const icons = iconMap
  return allManageableSkills.value.map((skill, idx) => ({
    id: skill.id,
    name: skill.name,
    desc: skill.description || '',
    category: skill.category || '自定义',
    iconComp: icons[idx % icons.length].icon,
    iconBg: icons[idx % icons.length].bg,
    path: (skill as any).path || '',
    enabled: (skill as any).enabled !== false,
  }))
})

const hasMoreSkills = computed(() => displaySkills.value.length > 10 && !showMoreSkills.value)
const visibleSkillsCount = computed(() => allManageableSkills.value.filter(s => !hiddenSkills.value.has(s.id)).length)

async function fetchLocalSkills() {
  try {
    const res = await fetch(`${apiBase}/local-skills`)
    const data = await res.json()
    localSkills.value = (data.skills || []).map((s: any) => ({
      id: `local_${s.path}`,
      name: s.name,
      description: s.description || '',
      category: '本地技能',
      prompt: '',
      enabled: true,
      path: s.path
    }))
  } catch {
    // API unavailable, keep defaults
  }
}

function loadStoredState() {
  try {
    const hidden = localStorage.getItem('bc_hidden_skills')
    if (hidden) hiddenSkills.value = new Set(JSON.parse(hidden))
    const custom = localStorage.getItem('bc_custom_skills')
    if (custom) customSkills.value = JSON.parse(custom)
  } catch {}
}

function saveHiddenSkills() {
  try { localStorage.setItem('bc_hidden_skills', JSON.stringify([...hiddenSkills.value])) } catch {}
}

function saveCustomSkills() {
  try { localStorage.setItem('bc_custom_skills', JSON.stringify(customSkills.value)) } catch {}
}

const isSkillVisible = (skill: SkillEntry) => !hiddenSkills.value.has(skill.id)

const handleToggleSkill = (skill: SkillEntry & { path?: string }) => {
  if (skill.id.startsWith('custom_')) {
    const cs = customSkills.value.find(s => s.id === skill.id)
    if (cs) { cs.enabled = !cs.enabled; saveCustomSkills() }
  } else {
    const ls = localSkills.value.find(s => s.id === skill.id)
    if (ls) ls.enabled = !ls.enabled
  }
}

const handleDeleteCustomSkill = (skill: SkillEntry) => {
  if (skill.id.startsWith('custom_')) {
    customSkills.value = customSkills.value.filter(s => s.id !== skill.id)
    saveCustomSkills()
    hiddenSkills.value.delete(skill.id)
    saveHiddenSkills()
  } else if ((skill as any).path) {
    localSkills.value = localSkills.value.filter(s => s.id !== skill.id)
    hiddenSkills.value.delete(skill.id)
    saveHiddenSkills()
  }
}

const openSkillPreview = async (skill: SkillEntry & { path?: string }) => {
  currentSkillName.value = skill.name
  if (skill.path) {
    try {
      const res = await fetch(`${apiBase}/skills/content?path=${encodeURIComponent(skill.path)}`)
      currentSkillContent.value = await res.text()
    } catch {
      currentSkillContent.value = ''
    }
  } else {
    currentSkillContent.value = skill.prompt || '(无详细内容)'
  }
  showSkillPreview.value = true
}

const closeSkillPreview = () => {
  showSkillPreview.value = false
  currentSkillContent.value = ''
  currentSkillName.value = ''
}

const openAddSkillPicker = () => {
  skillFileInput.value?.click()
}

const handleSkillFileSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const parsed = parseFrontmatter(text, file.name)
    customSkills.value.push(parsed)
    saveCustomSkills()
  } catch {
    alert('读取文件失败')
  }
  ;(event.target as HTMLInputElement).value = ''
}

function parseFrontmatter(content: string, filename: string): SkillEntry {
  const result: SkillEntry = {
    id: `custom_${Date.now()}`,
    name: '', description: '', prompt: '', category: '自定义', enabled: true
  }
  if (!content.startsWith('---')) {
    result.name = filename.replace('.md', '')
    result.description = content.split('\n')[0]?.substring(0, 100) || ''
    result.prompt = content
    return result
  }
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) { result.name = filename.replace('.md', ''); return result }
  const fm: Record<string, string> = {}
  match[1].split('\n').forEach(line => {
    const i = line.indexOf(':')
    if (i > -1) {
      const key = line.substring(0, i).trim()
      let val = line.substring(i + 1).trim()
      val = val.replace(/^["']|["']$/g, '')
      if (key && val) fm[key] = val
    }
  })
  result.name = fm.name || filename.replace('.md', '')
  result.description = fm.description || ''
  result.prompt = fm.prompt || content
  result.category = fm.category || '自定义'
  return result
}

onMounted(() => {
  loadStoredState()
  fetchLocalSkills()
})
</script>

<template>
  <div class="skill-settings-panel">
    <!-- 技能预览模态框 -->
    <div v-if="showSkillPreview" class="skill-preview-overlay" @click.self="closeSkillPreview">
      <div class="skill-preview-modal">
        <div class="skill-preview-header">
          <span class="skill-preview-title">{{ currentSkillName }}</span>
          <button class="skill-preview-close" @click="closeSkillPreview">
            <RiCloseLine size="18" color="#8B7355" />
          </button>
        </div>
        <pre class="skill-preview-content">{{ currentSkillContent }}</pre>
      </div>
    </div>

    <div class="settings-card">
      <div class="tpl-shelf">
        <div
          v-for="(skill, idx) in displaySkills"
          :key="skill.id + '-' + idx"
          class="tpl-card"
        >
          <div class="tpl-card-cover">
            <div class="tpl-card-icon" :style="{ background: skill.iconBg }">
              <component :is="skill.iconComp" :size="'24'" color="#ffffff" />
            </div>
            <span class="tpl-card-cat">{{ skill.category }}</span>
            <label class="toggle-switch-compact" @click.prevent="handleToggleSkill(skill)">
              <input type="checkbox" :checked="skill.enabled" @change="handleToggleSkill(skill)" />
              <span class="toggle-slider"></span>
            </label>
            <button
              v-if="skill.path || skill.id.startsWith('custom_')"
              class="tpl-card-skill-delete-btn"
              @click.stop="handleDeleteCustomSkill(skill)"
              title="从设置中删除"
            >
              <RiDeleteBinLine size="16" color="#C43A31" />
            </button>
            <button
              class="tpl-card-preview"
              @click.stop="openSkillPreview(skill)"
              title="查看技能详情"
            >
              <RiFileTextLine size="16" color="#8B7355" />
            </button>
          </div>
          <div class="tpl-card-info">
            <span class="tpl-card-name">{{ skill.name }}</span>
            <span class="tpl-card-desc" :title="skill.desc">{{ skill.desc }}</span>
          </div>
        </div>
        <div v-if="hasMoreSkills" class="tpl-card tpl-card-more" @click="showMoreSkills = true">
          <div class="tpl-add-icon">
            <RiArrowDownSLine size="22" color="#8B7355" />
          </div>
          <span class="tpl-add-text">更多技能 ({{ visibleSkillsCount }})</span>
        </div>
        <input type="file" accept=".md" ref="skillFileInput" style="display:none" @change="handleSkillFileSelect" />
        <div class="tpl-card tpl-card-add" @click="openAddSkillPicker">
          <div class="tpl-add-icon">
            <RiAddLine size="22" color="#8B7355" />
          </div>
          <span class="tpl-add-text">添加技能</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-card {
  background: var(--color-white);
  border-radius: var(--radius-lg, 12px);
  padding: 32px;
}

.tpl-shelf {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.tpl-card {
  width: 200px;
  border-radius: 12px;
  background: var(--color-white);
  position: relative;
  cursor: pointer;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.tpl-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.tpl-card-cover {
  height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
}

.tpl-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.tpl-card-cat {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brown-dark, #3D2B1F);
}

.tpl-card-info {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tpl-card-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-brown-dark, #3D2B1F);
}

.tpl-card-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 11px;
  color: var(--color-brown-muted, #8B7355);
  cursor: help;
}

.tpl-card-add,
.tpl-card-more {
  background: var(--color-cream-dark, #F5EFE0);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 340px;
  gap: 8px;
  border: 1.5px dashed var(--color-tan-dark, #D4C4A8);
  transition: border-color 0.2s, background 0.2s;
}

.tpl-card-add:hover,
.tpl-card-more:hover {
  border-color: var(--color-cinnabar, #C23B22);
  background: var(--color-cream-darker, #F0E8D5);
}

.tpl-add-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-cream-darker, #F0E8D5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tpl-add-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-brown-muted, #8B7355);
}

/* Toggle switch */
.toggle-switch-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: var(--color-tan-dark, #D4C4A8);
  cursor: pointer;
  position: absolute;
  top: 12px;
  left: 12px;
  transition: background 0.2s;
}

.toggle-switch-compact input {
  display: none;
}

.toggle-switch-compact .toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.toggle-switch-compact input:checked + .toggle-slider {
  transform: translateX(16px);
}

.toggle-switch-compact:has(input:checked) {
  background: var(--color-cinnabar, #C23B22);
}

/* Delete button */
.tpl-card-skill-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
  z-index: 2;
  opacity: 0;
}

.tpl-card:hover .tpl-card-skill-delete-btn {
  opacity: 1;
}

.tpl-card-skill-delete-btn:hover svg {
  color: #C23B22 !important;
}

/* Preview button */
.tpl-card-preview {
  position: absolute;
  top: 12px;
  right: 36px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--color-cream-darker, #F0E8D5);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 2;
  opacity: 0;
}

.tpl-card:hover .tpl-card-preview {
  opacity: 1;
}

.tpl-card-preview:hover {
  background: var(--color-cinnabar, #C23B22);
  color: #fff;
}

.tpl-card-preview svg {
  color: inherit !important;
}

/* Skill preview modal */
.skill-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.skill-preview-modal {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.skill-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-tan-border, #E0D5C0);
}

.skill-preview-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark, #3D2B1F);
}

.skill-preview-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.skill-preview-close:hover {
  background: var(--color-cream-darker, #F0E8D5);
}

.skill-preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  margin: 0;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-brown-dark, #3D2B1F);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

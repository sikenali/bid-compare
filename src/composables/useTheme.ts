export type ThemeType = 'light' | 'dark'
export type AccentKey = 'vermilion' | 'gold' | 'jade' | 'cloud' | 'ink'

export const THEME_KEY = 'bc_theme'
export const ACCENT_KEY = 'bc_accent'

const DEFAULT_THEME: ThemeType = 'light'
const DEFAULT_ACCENT: AccentKey = 'vermilion'

/** 强调色预设（DESIGN.md §4.3 五色盘）
 * color 为浅色主题用值；darkColor 为深色主题用值 —— 浅色系强调色在深色背景下
 * 会对比度不足（尤其黛墨 #2F3640 近乎不可见），故各配一个提亮的深色变体。
 * soft 为该色约 10% 的浅色底，darkSoft 为深色主题下的低亮底色。 */
export const ACCENTS: Record<AccentKey, { name: string; color: string; darkColor: string; soft: string; darkSoft: string; rgb: string }> = {
  vermilion: { name: '朱红 · 默认', color: '#C0392B', darkColor: '#E05050', soft: '#FBE9E7', darkSoft: '#3A2323', rgb: '192, 57, 43' },
  gold:      { name: '鎏金',       color: '#D3A93F', darkColor: '#E8C56A', soft: '#FAF1DC', darkSoft: '#332C14', rgb: '211, 169, 63' },
  jade:      { name: '玉绿',       color: '#3E8C6E', darkColor: '#5CB98C', soft: '#E7F1EC', darkSoft: '#1E332A', rgb: '62, 140, 110' },
  cloud:     { name: '云蓝',       color: '#4A72A8', darkColor: '#82AEDD', soft: '#E9EEF6', darkSoft: '#1E2836', rgb: '74, 114, 168' },
  ink:       { name: '黛墨',       color: '#2F3640', darkColor: '#8B95A5', soft: '#E8EAED', darkSoft: '#2A2E35', rgb: '47, 54, 64' },
}

/** 深色主题下强调色的 rgba() 三元组（对应 ACCENTS 的 darkColor） */
const DARK_RGB: Record<AccentKey, string> = {
  vermilion: '224, 80, 80',
  gold: '232, 197, 106',
  jade: '92, 185, 140',
  cloud: '130, 174, 221',
  ink: '139, 149, 165',
}

type TokenMap = Record<string, string>

/**
 * 浅色（Parchment）Token 集。
 * 规范颜色取自 DESIGN.md §5 Light 速查表；文比猩遗留 Token 保留原浅色值以兼容既有组件。
 */
const LIGHT: TokenMap = {
  /* --- 规范层（DESIGN.md §5 Light）--- */
  '--color-primary': '#C0392B',
  '--color-primary-soft': '#FBE9E7',
  '--color-bg-main': '#FAF7F2',
  '--color-bg-secondary': '#F7F3EA',
  '--color-bg-card': '#FCFBF8',
  '--color-bg-white': '#FFFFFF',
  '--color-text-primary': '#1F1D1A',
  '--color-text-body': '#3A3A3A',
  '--color-text-secondary': '#6E6A60',
  '--color-text-muted': '#8A8578',
  '--color-text-faint': '#A7A296',
  '--color-border': '#E5DFD3',
  '--color-border-soft': '#EDE9E0',
  '--color-border-hover': '#D9D2C2',
  '--color-success': '#4E9B7A',
  '--color-success-soft': '#E8F2EC',
  '--color-info': '#4A72A8',
  '--color-info-soft': '#E8EEF6',
  '--color-warning': '#F39C12',
  '--color-warning-soft': '#FDF3E0',
  '--color-error': '#E74C3C',
  '--color-error-soft': '#FBEAE7',

  /* --- 文比猩遗留层 --- */
  '--color-parchment': '#FDF6E3',
  '--color-cream': '#FBF7EF',
  '--color-cream-dark': '#F5EFE0',
  '--color-cream-darker': '#F0E8D5',
  '--color-warm-gray': '#EAE5D9',
  '--color-white': '#FFFFFF',
  '--color-cinnabar-dark': '#A83028',
  '--color-gold': '#D4AF37',
  '--color-gold-dark': '#C8A45C',
  '--color-jade': '#2D8B57',
  '--color-jade-light': '#5B8C5A',
  '--color-jade-dark': '#1A6B3A',
  '--color-cloud-blue': '#5B7DB1',
  '--color-ink-black': '#2C2C2C',
  '--color-brown-dark': '#3D2B1F',
  '--color-brown': '#5C4033',
  '--color-brown-muted': '#8B7355',
  '--color-tan-border': '#E0D5C0',
  '--color-tan-dark': '#D4C4A8',
  '--color-tan-light': '#E8DCC8',
  '--color-diff-red-bg': '#FFF0ED',
  '--color-diff-green-bg': '#E8F0E0',
  '--color-upload-bg': '#F5EFE3',
  '--color-nav-bg': '#FBF7F0',
  '--color-icon-bg': '#F0E8D8',
  '--color-accent-red': '#C43D3D',
  '--color-accent-red-dark': '#A83028',
  '--color-diff-added': '#E8F5E0',
  '--color-diff-modified': '#FFF8E0',
  '--color-diff-deleted': '#FFE8E0',
  '--color-diff-added-border': '#4CAF50',
  '--color-diff-modified-border': '#FF9800',
  '--color-diff-deleted-border': '#F44336',
  '--color-blue-accent': '#2D6A9F',

  /* --- rgba() 用 RGB 三元组 --- */
  '--rgb-primary': '192, 57, 43',
  '--rgb-cinnabar': '192, 57, 43',
  '--rgb-cinnabar-dark': '168, 48, 40',
  '--rgb-parchment': '245, 239, 227',
  '--rgb-cream': '251, 247, 239',
  '--rgb-cream-dark': '245, 239, 224',
  '--rgb-cream-darker': '240, 232, 213',
  '--rgb-gold': '212, 175, 55',
  '--rgb-gold-dark': '200, 164, 92',
  '--rgb-jade': '45, 139, 87',
  '--rgb-jade-light': '91, 140, 90',
  '--rgb-cloud-blue': '91, 125, 177',
  '--rgb-ink-black': '44, 44, 44',
  '--rgb-brown-dark': '61, 43, 31',
  '--rgb-brown': '92, 64, 51',
  '--rgb-brown-muted': '139, 115, 85',
  '--rgb-tan-border': '224, 213, 192',
  '--rgb-tan-light': '232, 220, 200',
  '--rgb-tan-dark': '212, 196, 168',
  '--rgb-white': '255, 255, 255',

  /* --- 阴影 --- */
  '--shadow-xs': '0 1px 2px rgba(0,0,0,0.05)',
  '--shadow-sm': '0 1px 2px rgba(0,0,0,0.05)',
  '--shadow-md': '0 4px 16px rgba(0,0,0,0.08)',
  '--shadow-lg': '0 4px 20px rgba(0,0,0,0.12)',
  '--shadow-xl': '0 12px 40px rgba(0,0,0,0.2)',
  '--shadow-cinnabar': '0 4px 20px rgba(192,57,43,0.2)',
  '--shadow-cinnabar-hover': '0 6px 24px rgba(192,57,43,0.3)',
}

/**
 * 深色（墨夜）Token 集。
 * 规范颜色取自 DESIGN.md §5 Dark 速查表；文比猩遗留 Token 一并提供深色映射，
 * 避免深色下组件仍取到浅色值造成白字白底。
 */
const DARK: TokenMap = {
  /* --- 规范层（DESIGN.md §5 Dark）--- */
  '--color-primary': '#E05050',
  '--color-primary-soft': '#3A2323',
  '--color-bg-main': '#17171A',
  '--color-bg-secondary': '#1C1C1F',
  '--color-bg-card': '#232324',
  '--color-bg-white': '#232324',
  '--color-text-primary': '#F2F3F5',
  '--color-text-body': '#DDE0E6',
  '--color-text-secondary': '#C9CDD4',
  '--color-text-muted': '#A7AEB9',
  '--color-text-faint': '#86909C',
  '--color-border': '#2A2B2E',
  '--color-border-soft': '#2A2B2E',
  '--color-border-hover': '#3A3B3F',
  '--color-success': '#5CB98C',
  '--color-success-soft': '#1E332A',
  '--color-info': '#82AEDD',
  '--color-info-soft': '#1E2836',
  '--color-warning': '#F2B23E',
  '--color-warning-soft': '#3A3017',
  '--color-error': '#E86A5A',
  '--color-error-soft': '#3A2320',

  /* --- 文比猩遗留层 --- */
  '--color-parchment': '#17171A',
  '--color-cream': '#1C1C1F',
  '--color-cream-dark': '#232324',
  '--color-cream-darker': '#2A2A2C',
  '--color-warm-gray': '#1C1C1F',
  '--color-white': '#232324',
  '--color-cinnabar-dark': '#C7453A',
  '--color-gold': '#D3A93F',
  '--color-gold-dark': '#C8A45C',
  '--color-jade': '#3DA06A',
  '--color-jade-light': '#5B8C5A',
  '--color-jade-dark': '#1A6B3A',
  '--color-cloud-blue': '#5B7DB1',
  '--color-ink-black': '#F2F3F5',
  '--color-brown-dark': '#F2F3F5',
  '--color-brown': '#DDE0E6',
  '--color-brown-muted': '#A7AEB9',
  '--color-tan-border': '#2A2B2E',
  '--color-tan-dark': '#3A3B3F',
  '--color-tan-light': '#2A2B2E',
  '--color-diff-red-bg': '#3A1F1C',
  '--color-diff-green-bg': '#1E3328',
  '--color-upload-bg': '#1C1C1F',
  '--color-nav-bg': '#1C1C1F',
  '--color-icon-bg': '#2A2A2C',
  '--color-accent-red': '#E05050',
  '--color-accent-red-dark': '#C7453A',
  '--color-diff-added': '#1E3328',
  '--color-diff-modified': '#332C14',
  '--color-diff-deleted': '#331C19',
  '--color-diff-added-border': '#3DA06A',
  '--color-diff-modified-border': '#C8912F',
  '--color-diff-deleted-border': '#B03A2E',
  '--color-blue-accent': '#4A72A8',

  /* --- rgba() 用 RGB 三元组 --- */
  '--rgb-primary': '224, 80, 80',
  '--rgb-cinnabar': '224, 80, 80',
  '--rgb-cinnabar-dark': '199, 69, 58',
  '--rgb-parchment': '23, 23, 26',
  '--rgb-cream': '28, 28, 31',
  '--rgb-cream-dark': '35, 35, 36',
  '--rgb-cream-darker': '42, 42, 44',
  '--rgb-gold': '211, 169, 63',
  '--rgb-gold-dark': '200, 164, 92',
  '--rgb-jade': '61, 160, 106',
  '--rgb-jade-light': '91, 140, 90',
  '--rgb-cloud-blue': '91, 125, 177',
  '--rgb-ink-black': '242, 243, 245',
  '--rgb-brown-dark': '242, 243, 245',
  '--rgb-brown': '221, 224, 230',
  '--rgb-brown-muted': '167, 174, 185',
  '--rgb-tan-border': '42, 43, 46',
  '--rgb-tan-light': '42, 43, 46',
  '--rgb-tan-dark': '58, 59, 63',
  '--rgb-white': '35, 35, 36',

  /* --- 阴影 --- */
  '--shadow-xs': '0 1px 2px rgba(0,0,0,0.3)',
  '--shadow-sm': '0 1px 2px rgba(0,0,0,0.3)',
  '--shadow-md': '0 4px 16px rgba(0,0,0,0.4)',
  '--shadow-lg': '0 4px 20px rgba(0,0,0,0.5)',
  '--shadow-xl': '0 12px 40px rgba(0,0,0,0.6)',
  '--shadow-cinnabar': '0 4px 20px rgba(224,80,80,0.2)',
  '--shadow-cinnabar-hover': '0 6px 24px rgba(224,80,80,0.3)',
}

const TOKENS: Record<ThemeType, TokenMap> = { light: LIGHT, dark: DARK }

/** 当前生效主题（模块级单例，与 useSettings 的 reactive 单例模式一致） */
let currentTheme: ThemeType = DEFAULT_THEME
let currentAccent: AccentKey = DEFAULT_ACCENT

function normalizeTheme(value: string | null): ThemeType {
  return value === 'dark' ? 'dark' : DEFAULT_THEME
}

function normalizeAccent(value: string | null): AccentKey {
  return value && value in ACCENTS ? (value as AccentKey) : DEFAULT_ACCENT
}

/**
 * 写入主题 Token（AGENT.md §7：主题切换统一由 JS 直写 root.style，
 * global.css 只保留 :root 默认值，不出现 [data-theme] 覆盖块）。
 * 保留 dataset.theme 仅作调试用途。
 */
export function applyTheme(theme: ThemeType): void {
  currentTheme = theme
  const root = document.documentElement
  root.dataset.theme = theme
  const tokens = TOKENS[theme]
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value)
  }
  applyAccent(currentAccent)
}

/** 写入强调色，按当前主题取浅色/深色变体。
 * --color-cinnabar 在 CSS 中是 --color-primary 的别名，会自动跟随。 */
export function applyAccent(accent: AccentKey, theme: ThemeType = currentTheme): void {
  currentAccent = accent
  const palette = ACCENTS[accent]
  const color = theme === 'dark' ? palette.darkColor : palette.color
  const soft = theme === 'dark' ? palette.darkSoft : palette.soft
  const rgb = theme === 'dark' ? DARK_RGB[accent] : palette.rgb
  const root = document.documentElement
  root.style.setProperty('--color-primary', color)
  root.style.setProperty('--color-primary-soft', soft)
  root.style.setProperty('--rgb-primary', rgb)
  root.style.setProperty('--rgb-cinnabar', rgb)
  root.style.setProperty('--shadow-cinnabar', `0 4px 20px rgba(${rgb},0.2)`)
  root.style.setProperty('--shadow-cinnabar-hover', `0 6px 24px rgba(${rgb},0.3)`)
}

/** 应用 localStorage 中已持久化的主题与强调色，应在应用挂载前调用 */
export function applyStoredTheme(): void {
  applyTheme(normalizeTheme(localStorage.getItem(THEME_KEY)))
  applyAccent(normalizeAccent(localStorage.getItem(ACCENT_KEY)))
}

export function getStoredAccent(): AccentKey {
  return normalizeAccent(localStorage.getItem(ACCENT_KEY))
}

export function isAccent(key: string): key is AccentKey {
  return key in ACCENTS
}

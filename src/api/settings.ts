// All settings use localStorage for persistence
const STORAGE_KEY = 'bid-compare-settings';

function loadSettings(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSettings(data: Record<string, any>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function getSetting<T>(key: string, defaultVal: T): T {
  const settings = loadSettings();
  return settings[key] ?? defaultVal;
}

function setSetting(key: string, value: any) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
}

// ── Export Settings ────────────────────────────────────────────
export interface ExportSettings {
  format: string;
  include_highlight?: number;
  include_charts?: number;
  word_keep_style?: number;
  word_toc?: number;
  word_embed_font?: number;
  pdf_high_res?: number;
  pdf_bookmarks?: number;
  pdf_watermark?: number;
  md_keep_tables?: number;
  md_demote_heading?: number;
}

const DEFAULT_EXPORT: ExportSettings = {
  format: 'docx',
  include_highlight: 1,
  include_charts: 1,
  word_keep_style: 1,
  word_toc: 1,
  word_embed_font: 0,
  pdf_high_res: 1,
  pdf_bookmarks: 1,
  pdf_watermark: 0,
  md_keep_tables: 1,
  md_demote_heading: 0,
};

export async function getExportSettings(): Promise<ExportSettings> {
  return getSetting<ExportSettings>('export', DEFAULT_EXPORT);
}

export async function setExportSettings(data: ExportSettings): Promise<void> {
  setSetting('export', data);
}

// ── API Keys ───────────────────────────────────────────────────
export interface ApiKeyData {
  id: string;
  provider: string;
  model: string;
  api_key: string;
  base_url?: string;
  format?: string;
  enabled?: number;
  createdAt?: number;
}

export function getApiKeyList(): ApiKeyData[] {
  return getSetting<ApiKeyData[]>('apikeys', []);
}

export async function addApiKey(data: { provider: string; model: string; api_key: string; base_url?: string; format?: string }): Promise<void> {
  const keys = getSetting<ApiKeyData[]>('apikeys', []);
  keys.push({
    ...data,
    id: Date.now().toString(),
    enabled: 1,
    createdAt: Date.now(),
  });
  setSetting('apikeys', keys);
}

export async function toggleApiKey(id: string): Promise<{ enabled: number }> {
  const keys = getSetting<ApiKeyData[]>('apikeys', []);
  const key = keys.find(k => k.id === id);
  if (key) {
    key.enabled = key.enabled === 1 ? 0 : 1;
    setSetting('apikeys', keys);
    return { enabled: key.enabled };
  }
  return { enabled: 0 };
}

export async function deleteApiKey(id: string): Promise<void> {
  const keys = getSetting<ApiKeyData[]>('apikeys', []);
  setSetting('apikeys', keys.filter(k => k.id !== id));
}

export async function testApiKey(data: { id?: string; provider?: string; model?: string; key?: string; endpoint?: string; format?: string }): Promise<{ available: boolean; error?: string }> {
  const keys = getSetting<ApiKeyData[]>('apikeys', []);
  const key = data.id ? keys.find(k => k.id === data.id) : null;
  const apiKey = data.key || key?.api_key || '';
  const provider = data.provider || key?.provider || '';
  const format = data.format || (key as any)?.format || 'openai';
  
  if (!apiKey) return { available: false, error: '未配置 API Key' };
  
  try {
    const endpoint = data.endpoint || key?.base_url || '';
    if (endpoint) {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: data.model || key?.model || '',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 1,
        }),
      });
      if (!resp.ok) {
        return { available: false, error: `HTTP ${resp.status}` };
      }
      return { available: true };
    }
    return { available: false, error: '未配置 API 地址' };
  } catch (err: any) {
    return { available: false, error: err?.message || '测试失败' };
  }
}

export async function updateApiKey(id: string, data: { provider?: string; model?: string; api_key?: string; base_url?: string; format?: string }): Promise<void> {
  const keys = getSetting<ApiKeyData[]>('apikeys', []);
  const key = keys.find(k => k.id === id);
  if (key) {
    if (data.provider) key.provider = data.provider;
    if (data.model) key.model = data.model;
    if (data.api_key) key.api_key = data.api_key;
    if (data.base_url !== undefined) key.base_url = data.base_url;
    if (data.format !== undefined) key.format = data.format;
    setSetting('apikeys', keys);
  }
}

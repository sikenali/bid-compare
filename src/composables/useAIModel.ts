import { ref } from 'vue'

// 设置类型定义（与useSettings.ts保持一致）
interface FileCompareSettings {
  minDuplicateWords: number
  textSimilarityThreshold: number
  imageSimilarityThreshold: number
  ignorePunctuation: boolean
  ignoreWhitespace: boolean
  ignoreCase: boolean
  // AI模型设置
  selectedModel: string
  apiKey: string
  apiEndpoint: string
}

// AI分析结果类型
interface AIAnalysisResult {
  summary: string
  insights: string[]
  suggestions: string[]
  error?: string
}

// API Endpoint 白名单
const ALLOWED_ENDPOINTS = [
  'api.openai.com',
  'api.deepseek.com',
  'dashscope.aliyuncs.com',
  'api.qwen.ai'
]

// 验证 endpoint 是否在白名单中
const validateEndpoint = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint)
    const hostname = url.hostname.toLowerCase()
    return ALLOWED_ENDPOINTS.some(allowed => hostname === allowed || hostname.endsWith('.' + allowed))
  } catch {
    return false
  }
}

// 获取默认 endpoint
const getDefaultEndpoint = (model: string): string => {
  switch (model) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions'
    case 'deepseek':
      return 'https://api.deepseek.com/v1/chat/completions'
    case 'qwen':
      return 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    default:
      throw new Error('不支持的AI模型')
  }
}

// AI模型调用组合式函数
export function useAIModel() {
  const isLoading = ref(false)
  const analysisResult = ref<AIAnalysisResult>({
    summary: '',
    insights: [],
    suggestions: []
  })

  // 根据模型类型获取API配置
  const getAPIConfig = (settings: FileCompareSettings) => {
    switch (settings.selectedModel) {
      case 'openai':
        return {
          apiUrl: settings.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
          model: 'gpt-4o-mini',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          }
        }
      case 'deepseek':
        return {
          apiUrl: settings.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions',
          model: 'deepseek-chat',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          }
        }
      case 'qwen':
        return {
          apiUrl: settings.apiEndpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          model: 'qwen-turbo',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          }
        }
      default:
        throw new Error('不支持的AI模型')
    }
  }

  // 构建分析提示词
  const buildPrompt = (leftFileContent: string, rightFileContent: string, similarity: string, similarSegments: any[]): string => {
    return `你是一个专业的文件对比分析助手，请对以下文件对比结果进行深入分析，提供总结、关键发现和改进建议。

文件对比结果：
相似度：${similarity}
雷同片段数量：${similarSegments.length}

左侧文件内容（前1000字符）：
${leftFileContent.substring(0, 1000)}...

右侧文件内容（前1000字符）：
${rightFileContent.substring(0, 1000)}...

雷同片段详情：
${JSON.stringify(similarSegments.slice(0, 5), null, 2)}

请按以下格式输出：
1. 总结：简要说明对比结果
2. 关键发现：列出主要的雷同点
3. 改进建议：给出减少重复的建议`
  }

  // 调用AI模型进行文件对比分析
  const analyzeFileComparison = async (
    settings: FileCompareSettings,
    leftFileContent: string,
    rightFileContent: string,
    similarity: string,
    similarSegments: any[]
  ): Promise<AIAnalysisResult> => {
    isLoading.value = true
    analysisResult.value = {
      summary: '',
      insights: [],
      suggestions: []
    }

    try {
      // 检查API密钥是否配置
      if (!settings.apiKey) {
        throw new Error('未配置API密钥，请在系统设置中配置')
      }

      // 验证 endpoint 是否在白名单中，防止 API Key 泄露到恶意服务器
      const endpointToUse = settings.apiEndpoint || getDefaultEndpoint(settings.selectedModel)
      if (!validateEndpoint(endpointToUse)) {
        throw new Error(`API 地址不在白名单中: ${endpointToUse}\n允许的域名: ${ALLOWED_ENDPOINTS.join(', ')}`)
      }

      // 获取API配置
      const apiConfig = getAPIConfig(settings)

      // 所有模型使用 OpenAI 兼容格式
      const requestData = {
        model: apiConfig.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文件对比分析助手，请对文件对比结果进行深入分析，提供总结、关键发现和改进建议。用中文回答。'
          },
          {
            role: 'user',
            content: buildPrompt(leftFileContent, rightFileContent, similarity, similarSegments)
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      }

      // 发送API请求
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      let response
      try {
        response = await fetch(apiConfig.apiUrl, {
          method: 'POST',
          headers: apiConfig.headers,
          body: JSON.stringify(requestData),
          signal: controller.signal
        })
      } finally {
        clearTimeout(timeoutId)
      }

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API请求失败：${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
      }

      // 解析响应数据
      const responseData = await response.json()
      if (!responseData.choices?.length || !responseData.choices[0]?.message?.content) {
        throw new Error('API 返回格式异常，缺少 choices 字段')
      }
      const aiResponse = responseData.choices[0].message.content

      // 解析AI响应为结构化数据
      const lines = aiResponse.split('\n').filter((line: string) => line.trim())
      const summaryLines: string[] = []
      const insights: string[] = []
      const suggestions: string[] = []

      let currentSection = 'summary'
      for (const line of lines) {
        if (line.includes('总结') || line.includes('Summary')) {
          currentSection = 'summary'
          const content = line.replace(/^#+\s*/, '').replace(/^(总结|Summary)[：:]\s*/, '')
          if (content) summaryLines.push(content)
        } else if (line.includes('关键发现') || line.includes('发现') || line.includes('Insight')) {
          currentSection = 'insights'
        } else if (line.includes('改进建议') || line.includes('建议') || line.includes('Suggestion')) {
          currentSection = 'suggestions'
        } else if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
          const content = line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '')
          if (currentSection === 'insights') {
            insights.push(content)
          } else if (currentSection === 'suggestions') {
            suggestions.push(content)
          }
        } else if (currentSection === 'summary' && line.trim()) {
          summaryLines.push(line.trim())
        }
      }

      const result: AIAnalysisResult = {
        summary: summaryLines.join('\n') || aiResponse.substring(0, 500),
        insights: insights.length > 0 ? insights : [aiResponse],
        suggestions: suggestions.length > 0 ? suggestions : ['建议进一步人工审核雷同内容']
      }

      analysisResult.value = result
      return result
    } catch (error) {
      const errorResult: AIAnalysisResult = {
        summary: 'AI分析失败',
        insights: [],
        suggestions: [],
        error: (error as Error).message
      }
      analysisResult.value = errorResult
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    analysisResult,
    analyzeFileComparison
  }
}

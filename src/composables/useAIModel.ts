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
  'generativelanguage.googleapis.com',
  'api.anthropic.com',
  'api.deepseek.com',
  'api.moonshot.cn',
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
    case 'gpt-3.5':
    case 'gpt-4':
      return 'https://api.openai.com/v1/chat/completions'
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    case 'claude':
      return 'https://api.anthropic.com/v1/messages'
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
      case 'gpt-3.5':
      case 'gpt-4':
        return {
          apiUrl: settings.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
          model: settings.selectedModel,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          }
        }
      case 'gemini':
        return {
          apiUrl: settings.apiEndpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
          model: 'gemini-pro',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          }
        }
      case 'claude':
        return {
          apiUrl: settings.apiEndpoint || 'https://api.anthropic.com/v1/messages',
          model: 'claude-3-opus-20240229',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      default:
        throw new Error('不支持的AI模型')
    }
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

      // 准备请求数据
      let requestData: any
      
      // 根据不同模型准备不同的请求格式
      switch (settings.selectedModel) {
        case 'gpt-3.5':
        case 'gpt-4':
          requestData = {
            model: apiConfig.model,
            messages: [
              {
                role: 'system',
                content: '你是一个专业的文件对比分析助手，请对以下文件对比结果进行深入分析，提供总结、关键发现和改进建议。'
              },
              {
                role: 'user',
                content: `文件对比结果：\n\n相似度：${similarity}\n\n雷同片段数量：${similarSegments.length}\n\n左侧文件内容：${leftFileContent.substring(0, 1000)}...\n\n右侧文件内容：${rightFileContent.substring(0, 1000)}...\n\n雷同片段：${JSON.stringify(similarSegments.slice(0, 3))}`
              }
            ],
            temperature: 0.3,
            max_tokens: 1000
          }
          break
        case 'gemini':
          requestData = {
            contents: [
              {
                parts: [
                  {
                    text: `你是一个专业的文件对比分析助手，请对以下文件对比结果进行深入分析，提供总结、关键发现和改进建议。\n\n文件对比结果：\n\n相似度：${similarity}\n\n雷同片段数量：${similarSegments.length}\n\n左侧文件内容：${leftFileContent.substring(0, 1000)}...\n\n右侧文件内容：${rightFileContent.substring(0, 1000)}...\n\n雷同片段：${JSON.stringify(similarSegments.slice(0, 3))}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1000
            }
          }
          break
        case 'claude':
          requestData = {
            model: apiConfig.model,
            messages: [
              {
                role: 'user',
                content: `你是一个专业的文件对比分析助手，请对以下文件对比结果进行深入分析，提供总结、关键发现和改进建议。\n\n文件对比结果：\n\n相似度：${similarity}\n\n雷同片段数量：${similarSegments.length}\n\n左侧文件内容：${leftFileContent.substring(0, 1000)}...\n\n右侧文件内容：${rightFileContent.substring(0, 1000)}...\n\n雷同片段：${JSON.stringify(similarSegments.slice(0, 3))}`
              }
            ],
            temperature: 0.3,
            max_tokens: 1000
          }
          break
        default:
          throw new Error('不支持的AI模型')
      }

      // 发送API请求
      const response = await fetch(apiConfig.apiUrl, {
        method: 'POST',
        headers: apiConfig.headers,
        body: JSON.stringify(requestData)
      })

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API请求失败：${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
      }

      // 解析响应数据
      const responseData = await response.json()
      
      // 处理不同模型的响应格式
      let aiResponse: string
      switch (settings.selectedModel) {
        case 'gpt-3.5':
        case 'gpt-4':
          aiResponse = responseData.choices[0].message.content
          break
        case 'gemini':
          aiResponse = responseData.candidates[0].content.parts[0].text
          break
        case 'claude':
          aiResponse = responseData.content[0].text
          break
        default:
          throw new Error('不支持的AI模型')
      }

      // 解析AI响应为结构化数据
      // 这里简单处理，实际应用中可以使用更复杂的解析逻辑
      const result: AIAnalysisResult = {
        summary: aiResponse,
        insights: aiResponse.split('\n').filter((line: string) => line.startsWith('-')).map((line: string) => line.substring(2)),
        suggestions: aiResponse.split('\n').filter((line: string) => line.startsWith('建议:')).map((line: string) => line.substring(4))
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
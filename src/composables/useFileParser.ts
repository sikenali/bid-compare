import { parseOffice } from 'officeparser';
import type { PageMap } from '../utils/textAlgorithms';

// 文件属性类型
export interface FileProperties {
  文件名?: string;
  文件大小?: string;
  文件类型?: string;
  作者?: string;
  最后一次保存者?: string;
  修订号?: string;
  页码范围?: string;
  版本号?: string;
  程序名称?: string;
  公司?: string;
  创建时间?: string;
  修改时间?: string;
  文本内容长度?: string;
}

// 文件解析结果类型
export interface FileParseResult {
  content: string;
  properties: FileProperties;
  pages?: number;
  pageMap?: PageMap;
  images?: Array<{ name: string; url: string }>;
  error?: string;
}

// 格式化文件大小
const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

// 构建估算页码映射（1500 字符/页）
const buildEstimatedPageMap = (content: string, charsPerPage: number = 1500): PageMap => {
  const totalPages = Math.max(1, Math.ceil(content.length / charsPerPage));
  const ranges = [];
  for (let i = 1; i <= totalPages; i++) {
    ranges.push({
      start: (i - 1) * charsPerPage,
      end: Math.min(i * charsPerPage, content.length),
      page: i
    });
  }
  return { ranges, totalPages };
};

// 从 officeParser metadata 构建文件属性
const buildPropertiesFromMeta = (
  file: File,
  meta: any,
  fileType: string,
  programName: string
): FileProperties => {
  const properties: FileProperties = {
    文件名: file.name,
    文件大小: formatFileSize(file.size),
    文件类型: fileType,
    作者: meta?.author || '未知作者',
    最后一次保存者: meta?.lastModifiedBy || '未知用户',
    修订号: meta?.customProperties?.Revision || '未知',
    页码范围: meta?.pages ? `1-${meta.pages}` : '1',
    版本号: meta?.customProperties?.AppVersion || '1.0',
    程序名称: programName,
    公司: meta?.customProperties?.Company || meta?.customProperties?.Organization || '未知',
    创建时间: meta?.created
      ? new Date(meta.created).toLocaleString()
      : new Date(file.lastModified).toLocaleString(),
    修改时间: meta?.modified
      ? new Date(meta.modified).toLocaleString()
      : new Date(file.lastModified).toLocaleString(),
    文本内容长度: '0'
  };
  return properties;
};

// 从 officeParser text 输出中构建页码映射（PDF 使用 \x0C 分页符）
const buildPdfPageMap = (content: string, totalPages: number): PageMap => {
  const ranges: Array<{ start: number; end: number; page: number }> = [];
  if (totalPages <= 1) {
    return { ranges: [{ start: 0, end: content.length, page: 1 }], totalPages: 1 };
  }
  const separator = '\x0C';
  const parts = content.split(separator);
  let offset = 0;
  for (let i = 0; i < parts.length; i++) {
    const page = i + 1;
    const partEnd = offset + parts[i].length;
    ranges.push({ start: offset, end: partEnd, page });
    offset = partEnd + (i < parts.length - 1 ? 1 : 0);
  }
  return { ranges, totalPages };
};

async function parseWithOfficeParser(file: File, signal?: AbortSignal): Promise<{
  ast: any;
  textResult: { value: string };
}> {
  const arrayBuffer = await file.arrayBuffer();
  const ast = await parseOffice(arrayBuffer, {
    extractAttachments: false,
    includeRawContent: false
  });
  const textResult = await ast.to('text');
  return { ast, textResult };
}

// 文件解析组合式函数
export function useFileParser() {
  // 解析TXT文件
  const parseTxtFile = async (file: File): Promise<FileParseResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        resolve({
          content,
          properties: {
            文件名: file.name,
            文件大小: formatFileSize(file.size),
            文件类型: 'TXT文本文件',
            作者: '未知作者',
            最后一次保存者: '未知用户',
            页码范围: '1',
            版本号: '1.0',
            程序名称: '未知',
            公司: '',
            文本内容长度: content.length.toString(),
            创建时间: new Date(file.lastModified).toLocaleString(),
            修改时间: new Date(file.lastModified).toLocaleString()
          },
          pageMap: buildEstimatedPageMap(content)
        });
      };
      reader.onerror = () => {
        resolve({ content: '', properties: {}, error: '解析TXT文件失败' });
      };
      reader.readAsText(file, 'utf-8');
    });
  };

  // 解析DOCX文件
  const parseDocxFile = async (file: File): Promise<FileParseResult> => {
    try {
      const { textResult, ast } = await parseWithOfficeParser(file);
      const properties = buildPropertiesFromMeta(file, ast.metadata, 'DOCX文档', 'Microsoft Word');
      properties.文本内容长度 = textResult.value.length.toString();

      const pageMap = buildEstimatedPageMap(textResult.value);
      if (properties.页码范围 === '1' && pageMap.totalPages > 1) {
        properties.页码范围 = `1-${pageMap.totalPages}`;
        properties.页数 = pageMap.totalPages.toString();
      }

      return { content: textResult.value, properties, pageMap };
    } catch (error) {
      return { content: '', properties: {}, error: '解析DOCX文件失败: ' + (error as Error).message };
    }
  };

  // 解析PDF文件
  const parsePdfFile = async (file: File, signal?: AbortSignal): Promise<FileParseResult> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ast = await parseOffice(arrayBuffer, {
        extractAttachments: false,
        includeRawContent: false
      });
      const textResult = await ast.to('text');

      const properties = buildPropertiesFromMeta(file, ast.metadata, 'PDF文档', 'Adobe Acrobat');
      properties.文本内容长度 = textResult.value.length.toString();

      const pageCount = ast.metadata.pages || 1;
      const pageMap = buildPdfPageMap(textResult.value, pageCount);

      return {
        content: textResult.value,
        properties,
        pages: pageCount,
        pageMap
      };
    } catch (error) {
      return {
        content: '',
        properties: {},
        error: `PDF解析失败: ${(error as Error).message || '文件损坏或格式不支持'}`
      };
    }
  };

  // 解析DOC文件（浏览器环境限制，建议转换为DOCX）
  const parseDocFile = async (file: File): Promise<FileParseResult> => {
    return {
      content: '',
      properties: {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'DOC文档',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        页码范围: '1',
        版本号: '1.0',
        程序名称: 'Microsoft Word',
        公司: '',
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString()
      },
      error: 'DOC文件在浏览器环境中暂不支持直接解析，请转换为DOCX格式后重试'
    };
  };

  // 解析XLSX文件
  const parseXlsxFile = async (file: File): Promise<FileParseResult> => {
    try {
      const { textResult, ast } = await parseWithOfficeParser(file);
      const properties = buildPropertiesFromMeta(file, ast.metadata, 'XLSX表格', 'Microsoft Excel');
      properties.文本内容长度 = textResult.value.length.toString();

      const pageMap = buildEstimatedPageMap(textResult.value);
      if (properties.页码范围 === '1' && pageMap.totalPages > 1) {
        properties.页码范围 = `1-${pageMap.totalPages}`;
        properties.页数 = pageMap.totalPages.toString();
      }

      return { content: textResult.value, properties, pageMap };
    } catch (error) {
      return { content: '', properties: {}, error: '解析XLSX文件失败: ' + (error as Error).message };
    }
  };

  // 解析PPTX文件
  const parsePptxFile = async (file: File, signal?: AbortSignal): Promise<FileParseResult> => {
    try {
      const { textResult, ast } = await parseWithOfficeParser(file, signal);
      const properties = buildPropertiesFromMeta(file, ast.metadata, 'PPTX演示', 'Microsoft PowerPoint');
      properties.文本内容长度 = textResult.value.length.toString();

      const slideCount = ast.metadata.pages || 1;
      const pageMap = buildEstimatedPageMap(textResult.value);
      if (properties.页码范围 === '1' && pageMap.totalPages > 1) {
        properties.页码范围 = `1-${pageMap.totalPages}`;
        properties.页数 = pageMap.totalPages.toString();
      }

      return { content: textResult.value, properties, pageMap };
    } catch (error) {
      return { content: '', properties: {}, error: '解析PPTX文件失败: ' + (error as Error).message };
    }
  };

  // 根据文件类型选择解析方法
  const parseFile = async (file: File, signal?: AbortSignal): Promise<FileParseResult> => {
    if (signal?.aborted) throw new DOMException('用户取消了文件解析', 'AbortError');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    switch (ext) {
      case 'txt':    return parseTxtFile(file);
      case 'docx':   return parseDocxFile(file);
      case 'doc':    return parseDocFile(file);
      case 'pdf':    return parsePdfFile(file, signal);
      case 'xlsx':
      case 'xls':    return parseXlsxFile(file);
      case 'pptx':
      case 'ppt':    return parsePptxFile(file, signal);
      default:       return { content: '', properties: {}, error: '不支持的文件类型' };
    }
  };

  return {
    parseFile,
    parseTxtFile,
    parseDocxFile,
    parsePdfFile,
    parseDocFile,
    parseXlsxFile,
    parsePptxFile,
    disposeFileResult: (result: FileParseResult) => {
      if (result.images) {
        result.images.forEach(img => URL.revokeObjectURL(img.url));
      }
    }
  };
}

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { PageMap } from '../utils/textAlgorithms';

// 设置worker路径
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

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
  error?: string;
}

// 格式化文件大小
const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
};

// 构建估算页码映射（1500 字符/页）
const buildEstimatedPageMap = (content: string, charsPerPage: number = 1500): PageMap => {
  const ranges: Array<{ start: number; end: number; page: number }> = []
  const totalPages = Math.max(1, Math.ceil(content.length / charsPerPage))

  for (let i = 1; i <= totalPages; i++) {
    ranges.push({
      start: (i - 1) * charsPerPage,
      end: Math.min(i * charsPerPage, content.length),
      page: i
    })
  }

  return { ranges, totalPages }
}

/**
 * 从 Office Open XML (docProps/core.xml + app.xml) 提取元数据
 * 适用于 DOCX、XLSX、PPTX
 */
const extractOfficeMetadata = async (zip: any): Promise<Partial<FileProperties>> => {
  const properties: Partial<FileProperties> = {};
  
  try {
    const coreXmlFile = zip.file('docProps/core.xml');
    const appXmlFile = zip.file('docProps/app.xml');

    // 提取 core.xml
    if (coreXmlFile) {
      const coreXmlContent = await coreXmlFile.async('string');

      // 作者
      const creatorMatch = coreXmlContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
      if (creatorMatch?.[1]) properties.作者 = creatorMatch[1];

      // 最后一次保存者
      const lastModifiedByMatch = coreXmlContent.match(/<cp:lastModifiedBy[^>]*>([^<]+)<\/cp:lastModifiedBy>/i);
      if (lastModifiedByMatch?.[1]) properties.最后一次保存者 = lastModifiedByMatch[1];

      // 创建时间
      const createdMatch = coreXmlContent.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/i);
      if (createdMatch?.[1]) properties.创建时间 = new Date(createdMatch[1]).toLocaleString();

      // 修改时间
      const modifiedMatch = coreXmlContent.match(/<dcterms:modified[^>]*>([^<]+)<\/dcterms:modified>/i);
      if (modifiedMatch?.[1]) properties.修改时间 = new Date(modifiedMatch[1]).toLocaleString();
    }

    // 提取 app.xml
    if (appXmlFile) {
      const appXmlContent = await appXmlFile.async('string');

      // 页码
      const pageMatch = appXmlContent.match(/<Pages[^>]*>(\d+)<\/Pages>/i) ||
                        appXmlContent.match(/<PageCount[^>]*>(\d+)<\/PageCount>/i) ||
                        appXmlContent.match(/<Slides[^>]*>(\d+)<\/Slides>/i);
      if (pageMatch?.[1]) {
        properties.页码范围 = `1-${pageMatch[1]}`;
      }

      // 程序名称
      const appMatch = appXmlContent.match(/<Application[^>]*>([^<]+)<\/Application>/i);
      if (appMatch?.[1]) properties.程序名称 = appMatch[1];

      // 版本号 (AppVersion)
      const versionMatch = appXmlContent.match(/<AppVersion[^>]*>([^<]+)<\/AppVersion>/i);
      if (versionMatch?.[1]) properties.版本号 = versionMatch[1];

      // 修订号 (Revision)
      const revisionMatch = appXmlContent.match(/<Revision[^>]*>(\d+)<\/Revision>/i);
      if (revisionMatch?.[1]) {
        properties.修订号 = revisionMatch[1];
      }

      // 公司
      const companyMatch = appXmlContent.match(/<Company[^>]*>([^<]+)<\/Company>/i) ||
                           appXmlContent.match(/<Organization[^>]*>([^<]+)<\/Organization>/i);
      if (companyMatch?.[1]) properties.公司 = companyMatch[1];
    }
  } catch (error) {
    console.warn('提取 Office 元数据失败:', error);
  }

  return properties;
};

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
        resolve({
          content: '',
          properties: {},
          error: '解析TXT文件失败'
        });
      };
      
      reader.readAsText(file, 'utf-8');
    });
  };

  // 解析DOCX文件
  const parseDocxFile = async (file: File): Promise<FileParseResult> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const textResult = await mammoth.extractRawText({ arrayBuffer });

      // 默认属性
      const properties: FileProperties = {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'DOCX文档',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        修订号: '未知',
        页码范围: '1',
        版本号: '1.0',
        程序名称: 'Microsoft Word',
        公司: '未知',
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString(),
        文本内容长度: textResult.value.length.toString()
      };

      // 提取元数据
      try {
        const JSZipModule = await import('jszip');
        const JSZip = JSZipModule.default;
        const zip = await Promise.race([
          JSZip.loadAsync(arrayBuffer),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DOCX加载超时')), 20000))
        ]) as any;

        const meta = await extractOfficeMetadata(zip);
        Object.assign(properties, meta);
      } catch (zipError) {
        console.warn('DOCX 元数据提取失败，使用默认值:', zipError);
      }

      return {
        content: textResult.value,
        properties,
        pageMap: buildEstimatedPageMap(textResult.value)
      };
    } catch (error) {
      console.error('解析DOCX文件失败:', error);
      return {
        content: '',
        properties: {},
        error: '解析DOCX文件失败: ' + (error as Error).message
      };
    }
  };

  // 解析PDF文件
  const parsePdfFile = async (file: File): Promise<FileParseResult> => {
    try {
      // 读取文件为ArrayBuffer
      const dataBuffer = await file.arrayBuffer();

      // 设置PDF解析配置
      const pdfPromise = pdfjsLib.getDocument({
        data: dataBuffer,
        useSystemFonts: true
      }).promise;
      
      // 添加超时机制
      const pdfDocument = await Promise.race([
        pdfPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('PDF解析超时')), 30000))
      ]) as any;
      
      // 获取PDF页数
      const pageCount = pdfDocument.numPages;

      // 初始化文本内容和页码映射
      const textParts: string[] = [];
      const pageMap: PageMap = { ranges: [], totalPages: pageCount };

      // 全量提取所有页数
      const extractPageCount = pageCount;

      // 逐页提取文本，同时构建页码映射
      let offset = 0
      for (let pageNum = 1; pageNum <= extractPageCount; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContentResult = await page.getTextContent();

        // 提取文本内容
        const pageText = textContentResult.items
          .map((item: any) => item.str)
          .join('');

        // 添加页码映射
        pageMap.ranges.push({
          start: offset,
          end: offset + pageText.length,
          page: pageNum
        })

        textParts.push(pageText);
        offset += pageText.length + 1;
      }

      const textContent = textParts.join('\n');
      
      // 关闭PDF文档
      await pdfDocument.destroy();
      
      // 尝试提取PDF元数据
      let pdfProperties = {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'PDF文档',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        修订号: '未知',
        页码范围: `1-${pageCount}`,
        版本号: '1.0',
        程序名称: '未知',
        公司: '未知',
        文本内容长度: textContent.length.toString(),
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString()
      };

      try {
        // pdfjs-dist v4.x 使用 getMetadata() 异步方法
        const metadata = await pdfDocument.getMetadata();
        const info = metadata?.info;
        
        if (info) {
          // 作者
          if (info.Author) pdfProperties.作者 = info.Author;
          
          // 程序名称 (Producer 或 Creator)
          if (info.Producer) {
            pdfProperties.程序名称 = info.Producer;
          } else if (info.Creator) {
            pdfProperties.程序名称 = info.Creator;
          }
          
          // 创建时间
          if (info.CreationDate) {
            try {
              const dateStr = info.CreationDate.replace(/^D:/, '').replace(/([+-]\d{2})'(\d{2})'$/, '$1:$2');
              pdfProperties.创建时间 = new Date(dateStr).toLocaleString();
            } catch (e) { /* 忽略解析错误 */ }
          }
          
          // 修改时间
          if (info.ModDate) {
            try {
              const dateStr = info.ModDate.replace(/^D:/, '').replace(/([+-]\d{2})'(\d{2})'$/, '$1:$2');
              pdfProperties.修改时间 = new Date(dateStr).toLocaleString();
            } catch (e) { /* 忽略解析错误 */ }
          }
        }
      } catch (metadataError) {
        console.warn('PDF 元数据提取失败:', metadataError);
      }
      
      // 返回解析结果
      return {
        content: textContent,
        properties: pdfProperties,
        pages: pageCount,
        pageMap
      };
    } catch (error) {
      console.error('PDF解析错误:', error);
      // 如果解析失败，返回基本信息，不显示错误给用户
      return {
        content: 'PDF文件内容（浏览器环境下无法直接解析）',
        properties: {
          文件名: file.name,
          文件大小: formatFileSize(file.size),
          文件类型: 'PDF文档',
          作者: '未知作者',
          最后一次保存者: '未知用户',
          页码范围: '1',
          版本号: '1.0',
          程序名称: '未知',
          公司: '未知',
          文本内容长度: '0',
          创建时间: new Date(file.lastModified).toLocaleString(),
          修改时间: new Date(file.lastModified).toLocaleString()
        }
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
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // 提取所有工作表的文本内容
      let textContent = '';
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        textContent += `工作表: ${sheetName}\n`;
        jsonData.forEach((row: any[]) => {
          if (row.some(cell => cell && cell.toString().trim() !== '')) {
            textContent += row.map(cell => cell || '').join('\t') + '\n';
          }
        });
        textContent += '\n';
      });

      // 默认属性
      const properties: FileProperties = {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'XLSX表格',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        修订号: '未知',
        页码范围: '1',
        版本号: '1.0',
        程序名称: 'Microsoft Excel',
        公司: '未知',
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString(),
        文本内容长度: textContent.length.toString()
      };

      // 提取元数据
      try {
        const JSZipModule = await import('jszip');
        const JSZip = JSZipModule.default;
        const zip = await JSZip.loadAsync(arrayBuffer);
        const meta = await extractOfficeMetadata(zip);
        Object.assign(properties, meta);
      } catch (zipError) {
        console.warn('XLSX 元数据提取失败，使用默认值:', zipError);
      }

      return {
        content: textContent,
        properties,
        pageMap: buildEstimatedPageMap(textContent)
      };
    } catch (error) {
      console.error('解析XLSX文件失败:', error);
      return {
        content: '',
        properties: {},
        error: '解析XLSX文件失败: ' + (error as Error).message
      };
    }
  };

  // 解析PPTX文件
  const parsePptxFile = async (file: File): Promise<FileParseResult> => {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // 默认属性
      const properties: FileProperties = {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'PPTX演示',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        修订号: '未知',
        页码范围: '1',
        版本号: '1.0',
        程序名称: 'Microsoft PowerPoint',
        公司: '未知',
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString(),
        文本内容长度: '0'
      };

      let textContent = '';

      try {
        const JSZipModule = await import('jszip');
        const JSZip = JSZipModule.default;
        const zip = await Promise.race([
          JSZip.loadAsync(arrayBuffer),
          new Promise((_, reject) => setTimeout(() => reject(new Error('PPTX加载超时')), 20000))
        ]) as any;

        // 提取元数据
        const meta = await extractOfficeMetadata(zip);
        Object.assign(properties, meta);

        // 提取幻灯片内容
        const slideFiles = zip.file(/^ppt\/slides\/slide(\d+)\.xml$/);
        if (slideFiles.length > 0) {
          slideFiles.sort((a: any, b: any) => {
            const aNum = parseInt(a.name.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
            const bNum = parseInt(b.name.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
            return aNum - bNum;
          });

          const MAX_EXTRACT_SLIDES = 200;
          const extractSlides = slideFiles.slice(0, MAX_EXTRACT_SLIDES);

          for (let i = 0; i < extractSlides.length; i++) {
            const slideXmlContent = await extractSlides[i].async('string');
            textContent += `幻灯片 ${i + 1}\n`;
            const textMatches = slideXmlContent.match(/<a:t[^>]*>([^<]+)<\/a:t>/gi) || [];
            for (const match of textMatches) {
              const text = match.replace(/<[^>]+>/g, '');
              if (text.trim()) textContent += text + '\n';
            }
            textContent += '\n';
          }

          properties.页码范围 = `1-${slideFiles.length}`;
        }
      } catch (zipError) {
        console.warn('PPTX 内容提取失败:', zipError);
        textContent = 'PPTX演示内容（浏览器环境下解析受限）\n';
      }

      properties.文本内容长度 = textContent.length.toString();

      return {
        content: textContent,
        properties,
        pageMap: buildEstimatedPageMap(textContent)
      };
    } catch (error) {
      console.error('解析PPTX文件失败:', error);
      return {
        content: '',
        properties: {},
        error: '解析PPTX文件失败: ' + (error as Error).message
      };
    }
  };

  // 根据文件类型选择解析方法
  const parseFile = async (file: File): Promise<FileParseResult> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    
    switch (fileExtension) {
      case 'txt':
        return parseTxtFile(file);
      case 'docx':
        return parseDocxFile(file);
      case 'doc':
        return parseDocFile(file);
      case 'pdf':
        return parsePdfFile(file);
      case 'xlsx':
      case 'xls':
        return parseXlsxFile(file);
      case 'pptx':
      case 'ppt':
        return parsePptxFile(file);
      default:
        return {
          content: '',
          properties: {},
          error: '不支持的文件类型'
        };
    }
  };

  return {
    parseFile,
    parseTxtFile,
    parseDocxFile,
    parsePdfFile,
    parseDocFile,
    parseXlsxFile,
    parsePptxFile
  };
}

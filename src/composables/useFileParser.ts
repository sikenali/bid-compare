import mammoth from 'mammoth';

// 文件属性类型
export interface FileProperties {
  文件名?: string;
  文件大小?: string;
  文件类型?: string;
  作者?: string;
  最后一次保存者?: string;
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
          }
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

      const properties: any = {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'DOCX文档',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        页码范围: '1',
        版本号: '1.0',
        程序名称: 'Microsoft Word',
        公司: '',
        文本内容长度: textResult.value.length.toString(),
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString()
      };

      return {
        content: textResult.value,
        properties
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
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js';

      const dataBuffer = await file.arrayBuffer();
      const pdfDocument = await pdfjsLib.getDocument({
        data: dataBuffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@latest/cmaps/',
        cMapPacked: true
      }).promise;

      const pageCount = pdfDocument.numPages;
      let textContent = '';
      const MAX_EXTRACT_PAGES = 50;
      const extractPageCount = Math.min(pageCount, MAX_EXTRACT_PAGES);

      for (let pageNum = 1; pageNum <= extractPageCount; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContentResult = await page.getTextContent();
        const pageText = textContentResult.items.map((item: any) => item.str).join('');
        textContent += pageText + '\n';
      }

      if (pageCount > extractPageCount) {
        textContent += `\n... 仅显示前${extractPageCount}页内容，共${pageCount}页 ...\n`;
      }

      await pdfDocument.destroy();

      const pdfProperties = {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'PDF文档',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        页码范围: `1-${pageCount}`,
        版本号: '1.0',
        程序名称: '未知',
        公司: '未知',
        文本内容长度: textContent.length.toString(),
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString()
      };

      return {
        content: textContent,
        properties: pdfProperties,
        pages: pageCount
      };
    } catch (error) {
      console.error('PDF解析错误:', error);
      return {
        content: '',
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
          文本内容长度: '0'
        },
        error: 'PDF解析失败'
      };
    }
  };

  // 解析DOC文件
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
        文本内容长度: '0'
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

      const properties: any = {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'XLSX表格',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        页码范围: '1',
        版本号: '1.0',
        程序名称: 'Microsoft Excel',
        公司: '',
        文本内容长度: '0'
      };

      let textContent = '';
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        textContent += `工作表: ${sheetName}\n`;
        jsonData.forEach((row: any[]) => {
          if (row.some(cell => cell && cell.toString().trim() !== '')) {
            const rowText = row.map(cell => cell || '').join('\t');
            textContent += rowText + '\n';
          }
        });
        textContent += '\n';
      });

      properties.文本内容长度 = textContent.length.toString();

      return {
        content: textContent,
        properties
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
      const properties: any = {
        文件名: file.name,
        文件大小: formatFileSize(file.size),
        文件类型: 'PPTX演示',
        作者: '未知作者',
        最后一次保存者: '未知用户',
        页码范围: '1',
        版本号: '1.0',
        程序名称: 'Microsoft PowerPoint',
        公司: '',
        文本内容长度: '0'
      };

      let textContent = '';
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = zip.file(/^ppt\/slides\/slide(\d+)\.xml$/);

      if (slideFiles.length > 0) {
        slideFiles.sort((a: any, b: any) => {
          const aNum = parseInt(a.name.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
          const bNum = parseInt(b.name.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
          return aNum - bNum;
        });

        const MAX_EXTRACT_SLIDES = 30;
        const extractSlides = slideFiles.slice(0, MAX_EXTRACT_SLIDES);

        for (let i = 0; i < extractSlides.length; i++) {
          const slideFile = extractSlides[i];
          textContent += `幻灯片 ${i + 1}\n`;
          const slideXmlContent = await slideFile.async('string');
          const textMatches = slideXmlContent.match(/<a:t[^>]*>([^<]+)<\/a:t>/gi) || [];
          for (const match of textMatches) {
            const text = match.replace(/<[^>]+>/g, '');
            if (text.trim()) {
              textContent += text + '\n';
            }
          }
          textContent += '\n';
        }

        properties.页码范围 = `1-${slideFiles.length}`;
        if (slideFiles.length > MAX_EXTRACT_SLIDES) {
          textContent += `... 仅显示前${MAX_EXTRACT_SLIDES}张幻灯片，共${slideFiles.length}张 ...\n`;
        }
      }

      properties.文本内容长度 = textContent.length.toString();

      return {
        content: textContent,
        properties
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

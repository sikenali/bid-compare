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
      // 只读取一次文件，避免文件锁问题
      const arrayBuffer = await file.arrayBuffer();
      
      // 使用mammoth提取文本内容
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      
      // 初始化默认属性
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
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString(),
        文本内容长度: textResult.value.length.toString()
      };
      
      // 使用jszip提取DOCX元数据，但添加超时机制
      try {
        const JSZipModule = await import('jszip');
        const JSZip = JSZipModule.default;
        
        // 为zip加载添加超时机制，防止大文件阻塞
        const zipLoadPromise = JSZip.loadAsync(arrayBuffer);
        const zip = await Promise.race([
          zipLoadPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('DOCX加载超时')), 20000))
        ]) as any;
        
        // 初始化页码范围
        let pageRange = '1';
        
        // 先获取所有需要的元数据文件，避免作用域问题
        const coreXmlFile = zip.file('docProps/core.xml');
        const appXmlFile = zip.file('docProps/app.xml');
        
        // 提取核心元数据 (core.xml) - 使用简化的正则表达式提取，避免完整DOM解析
        if (coreXmlFile) {
          try {
            const coreXmlContent = await coreXmlFile.async('string');
            
            // 使用正则表达式快速提取核心元数据，避免完整DOM解析
            const creatorMatch = coreXmlContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i) || 
                                coreXmlContent.match(/<creator[^>]*>([^<]+)<\/creator>/i);
            if (creatorMatch && creatorMatch[1]) {
              properties.作者 = creatorMatch[1];
            }
            
            const lastModifiedByMatch = coreXmlContent.match(/<cp:lastModifiedBy[^>]*>([^<]+)<\/cp:lastModifiedBy>/i) ||
                                       coreXmlContent.match(/<lastModifiedBy[^>]*>([^<]+)<\/lastModifiedBy>/i);
            if (lastModifiedByMatch && lastModifiedByMatch[1]) {
              properties.最后一次保存者 = lastModifiedByMatch[1];
            }
            
            // 提取公司信息
            let companyInfo = '';
            
            // 1. 从core.xml中提取公司信息，支持多种标签格式
            const coreCompanyPattern = /<(?:cp:|dc:|xmp:|)(?:company|Company|Organization|organization)[^>]*>([\s\S]*?)<\/(?:cp:|dc:|xmp:|)(?:company|Company|Organization|organization)>/i;
            const coreCompanyMatch = coreXmlContent.match(coreCompanyPattern);
            if (coreCompanyMatch && coreCompanyMatch[1]) {
              companyInfo = coreCompanyMatch[1].trim();
            }
            
            // 2. 如果core.xml中没有，尝试从app.xml中提取
            if (!companyInfo && appXmlFile) {
              try {
                const appXmlContent = await appXmlFile.async('string');
                const appCompanyPattern = /<(?:Company|ApplicationCompany|ApplicationVendor|company|applicationcompany|applicationvendor|Organization|organization)[^>]*>([\s\S]*?)<\/(?:Company|ApplicationCompany|ApplicationVendor|company|applicationcompany|applicationvendor|Organization|organization)>/i;
                const appCompanyMatch = appXmlContent.match(appCompanyPattern);
                if (appCompanyMatch && appCompanyMatch[1]) {
                  companyInfo = appCompanyMatch[1].trim();
                }
              } catch (error) {
                console.log('Error extracting company from app.xml:', error);
              }
            }
            
            // 3. 确保公司属性始终有值，避免显示"未知"
            // 如果提取到了公司信息，使用它，否则使用默认值
            properties.公司 = companyInfo || '未知';
            
            const createdMatch = coreXmlContent.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/i) ||
                               coreXmlContent.match(/<created[^>]*>([^<]+)<\/created>/i);
            if (createdMatch && createdMatch[1]) {
              properties.创建时间 = new Date(createdMatch[1]).toLocaleString();
            }
            
            const modifiedMatch = coreXmlContent.match(/<dcterms:modified[^>]*>([^<]+)<\/dcterms:modified>/i) ||
                                coreXmlContent.match(/<modified[^>]*>([^<]+)<\/modified>/i);
            if (modifiedMatch && modifiedMatch[1]) {
              properties.修改时间 = new Date(modifiedMatch[1]).toLocaleString();
            }
          } catch (error) {
            console.log('简化处理core.xml时出错:', error);
          }
        }
        
        // 提取扩展元数据 (app.xml) - 简化处理，避免长时间阻塞
        if (appXmlFile) {
          // 简化处理，提取页码信息和其他属性
          try {
            const appXmlContent = await appXmlFile.async('string');
            
            // 快速提取页码信息，避免完整DOM解析
            const pageMatch = appXmlContent.match(/<Pages[^>]*>(\d+)<\/Pages>/i);
            if (pageMatch && pageMatch[1]) {
              pageRange = `1-${pageMatch[1]}`;
              console.log('Found page range via Pages element:', pageRange);
            } else {
              const pageCountMatch = appXmlContent.match(/<PageCount[^>]*>(\d+)<\/PageCount>/i);
              if (pageCountMatch && pageCountMatch[1]) {
                pageRange = `1-${pageCountMatch[1]}`;
                console.log('Found page range via PageCount element:', pageRange);
              }
            }
            
            // 设置页码范围
            properties.页码范围 = pageRange;
            
            // 提取程序名称
            const appMatch = appXmlContent.match(/<Application[^>]*>([^<]+)<\/Application>/i);
            if (appMatch && appMatch[1]) {
              properties.程序名称 = appMatch[1];
            }
            
            // 再次尝试从app.xml提取公司信息，确保不会遗漏
            if (!properties.公司 || properties.公司 === '未知') {
              const appCompanyPattern = /<(?:Company|ApplicationCompany|ApplicationVendor|company|applicationcompany|applicationvendor|Organization|organization)[^>]*>([\s\S]*?)<\/(?:Company|ApplicationCompany|ApplicationVendor|company|applicationcompany|applicationvendor|Organization|organization)>/i;
              const appCompanyMatch = appXmlContent.match(appCompanyPattern);
              if (appCompanyMatch && appCompanyMatch[1]) {
                const appCompanyInfo = appCompanyMatch[1].trim();
                if (appCompanyInfo) {
                  properties.公司 = appCompanyInfo;
                }
              }
            }
          } catch (error) {
            console.log('简化处理app.xml时出错:', error);
          }
        }
      } catch (zipError) {
        console.log('提取DOCX元数据时发生错误，使用默认值:', zipError);
      }
      
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
      // 动态导入pdfjs-dist，避免初始化问题
      const pdfjsLib = await import('pdfjs-dist');
      
      // 设置worker路径
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js';
      
      // 读取文件为ArrayBuffer
      const dataBuffer = await file.arrayBuffer();
      
      // 设置PDF解析超时
      const pdfPromise = pdfjsLib.getDocument({
        data: dataBuffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@latest/cmaps/',
        cMapPacked: true
      }).promise;
      
      // 添加超时机制
      const pdfDocument = await Promise.race([
        pdfPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('PDF解析超时')), 30000))
      ]) as any;
      
      // 获取PDF页数
      const pageCount = pdfDocument.numPages;
      
      // 初始化文本内容
      let textContent = '';
      
      // 对于大文件，限制提取的页数，提高性能
      const MAX_EXTRACT_PAGES = 50; // 最多提取50页
      const extractPageCount = Math.min(pageCount, MAX_EXTRACT_PAGES);
      
      // 逐页提取文本，但不超过最大页数限制
      for (let pageNum = 1; pageNum <= extractPageCount; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContentResult = await page.getTextContent();
        
        // 提取文本内容
        const pageText = textContentResult.items
          .map((item: any) => item.str)
          .join('');
        
        // 添加上下文信息（可选择性添加）
        textContent += pageText + '\n';
      }
      
      // 如果有更多页，添加提示信息
      if (pageCount > extractPageCount) {
        textContent += `\n... 仅显示前${extractPageCount}页内容，共${pageCount}页 ...\n`;
      }
      
      // 关闭PDF文档
      await pdfDocument.destroy();
      
      // 尝试提取PDF元数据
      let pdfProperties = {
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
      
      try {
        // 获取PDF元数据
        const metadata = pdfDocument.metadata;
        if (metadata) {
          // 提取作者信息
          if (metadata.Author) {
            pdfProperties.作者 = metadata.Author;
          }
          
          // 提取程序名称
          if (metadata.Producer) {
            pdfProperties.程序名称 = metadata.Producer;
          } else if (metadata.Creator) {
            pdfProperties.程序名称 = metadata.Creator;
          }
          
          // 尝试从元数据中提取公司信息
          // 检查常见的公司相关字段
          const companyFields = ['Company', 'Organization', 'Producer', 'Creator'];
          for (const field of companyFields) {
            if (metadata[field]) {
              const value = metadata[field].toString();
              // 检查是否包含公司相关关键词
              if (value && !pdfProperties.公司) {
                pdfProperties.公司 = value;
                break;
              }
            }
          }
          
          // 尝试从创建时间和修改时间中提取
          if (metadata.CreationDate) {
            try {
              // PDF日期格式通常为D:YYYYMMDDHHmmSSOHH'mm'
              const pdfDate = metadata.CreationDate.toString();
              const dateStr = pdfDate.replace(/^D:/, '').replace(/([+-]\d{2})'(\d{2})'$/, '$1:$2');
              pdfProperties.创建时间 = new Date(dateStr).toLocaleString();
            } catch (e) {
              // 如果解析失败，使用文件的最后修改时间
            }
          }
          
          if (metadata.ModDate) {
            try {
              const pdfDate = metadata.ModDate.toString();
              const dateStr = pdfDate.replace(/^D:/, '').replace(/([+-]\d{2})'(\d{2})'$/, '$1:$2');
              pdfProperties.修改时间 = new Date(dateStr).toLocaleString();
            } catch (e) {
              // 如果解析失败，使用文件的最后修改时间
            }
          }
        }
      } catch (metadataError) {
        console.log('提取PDF元数据时发生错误:', metadataError);
      }
      
      // 返回解析结果
      return {
        content: textContent,
        properties: pdfProperties,
        pages: pageCount
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
      // 动态导入xlsx库
      const XLSX = await import('xlsx');
      
      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 使用xlsx库解析Excel文件
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 初始化默认属性
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
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString()
      };
      
      // 提取所有工作表的文本内容
      let textContent = '';
      
      // 遍历所有工作表
      workbook.SheetNames.forEach((sheetName) => {
        // 获取工作表
        const worksheet = workbook.Sheets[sheetName];
        
        // 将工作表转换为JSON格式
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 将JSON数据转换为文本
        textContent += `工作表: ${sheetName}\n`;
        
        // 遍历行
        jsonData.forEach((row: any[]) => {
          // 过滤掉空行
          if (row.some(cell => cell && cell.toString().trim() !== '')) {
            // 拼接单元格内容
            const rowText = row.map(cell => cell || '').join('\t');
            textContent += rowText + '\n';
          }
        });
        
        textContent += '\n';
      });
      
      // 更新文本内容长度
      properties.文本内容长度 = textContent.length.toString();
      
      // 尝试使用jszip提取XLSX元数据
      try {
        const JSZipModule = await import('jszip');
        const JSZip = JSZipModule.default;
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // 先获取所有需要的元数据文件
        const coreXmlFile = zip.file('docProps/core.xml');
        const appXmlFile = zip.file('docProps/app.xml');
        
        // 提取核心元数据 (core.xml)
        if (coreXmlFile) {
          const coreXmlContent = await coreXmlFile.async('string');
          
          // 使用正则表达式提取元数据，避免完整DOM解析
          const creatorMatch = coreXmlContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i) || 
                              coreXmlContent.match(/<creator[^>]*>([^<]+)<\/creator>/i);
          if (creatorMatch && creatorMatch[1]) {
            properties.作者 = creatorMatch[1];
          }
          
          const lastModifiedByMatch = coreXmlContent.match(/<cp:lastModifiedBy[^>]*>([^<]+)<\/cp:lastModifiedBy>/i) ||
                                     coreXmlContent.match(/<lastModifiedBy[^>]*>([^<]+)<\/lastModifiedBy>/i);
          if (lastModifiedByMatch && lastModifiedByMatch[1]) {
            properties.最后一次保存者 = lastModifiedByMatch[1];
          }
          
          // 提取公司信息
          // 支持多种来源和格式
          let companyInfo = '';
          
          // 1. 从core.xml中提取公司信息，支持多种标签格式和名称
          const coreCompanyPattern = /<(?:cp:|dc:|xmp:|)(?:company|Company|Organization|organization)[^>]*>([\s\S]*?)<\/(?:cp:|dc:|xmp:|)(?:company|Company|Organization|organization)>/i;
          const coreCompanyMatch = coreXmlContent.match(coreCompanyPattern);
          if (coreCompanyMatch && coreCompanyMatch[1]) {
            companyInfo = coreCompanyMatch[1].trim();
          }
          
          // 2. 如果core.xml中没有，尝试从app.xml中提取
          if (!companyInfo && appXmlFile) {
            try {
              const appXmlContent = await appXmlFile.async('string');
              const appCompanyPattern = /<(?:Company|ApplicationCompany|ApplicationVendor|company|applicationcompany|applicationvendor|Organization|organization)[^>]*>([\s\S]*?)<\/(?:Company|ApplicationCompany|ApplicationVendor|company|applicationcompany|applicationvendor|Organization|organization)>/i;
              const appCompanyMatch = appXmlContent.match(appCompanyPattern);
              if (appCompanyMatch && appCompanyMatch[1]) {
                companyInfo = appCompanyMatch[1].trim();
              }
            } catch (error) {
              console.log('Error extracting company from app.xml:', error);
            }
          }
          
          // 3. 更新公司属性，确保始终有值
          properties.公司 = companyInfo || '未知';
        }
      } catch (zipError) {
        console.log('提取XLSX元数据时发生错误，使用默认值:', zipError);
        // 确保公司属性有默认值
        properties.公司 = properties.公司 || '未知';
      }
      
      // 返回Excel文件的解析结果
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
      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 初始化默认属性
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
        创建时间: new Date(file.lastModified).toLocaleString(),
        修改时间: new Date(file.lastModified).toLocaleString()
      };
      
      // 初始化文本内容
      let textContent = '';
      
      // 使用jszip提取PPTX内容，但添加超时机制
      try {
        const JSZipModule = await import('jszip');
        const JSZip = JSZipModule.default;
        
        // 添加加载超时
        const zipLoadPromise = JSZip.loadAsync(arrayBuffer);
        const zip = await Promise.race([
          zipLoadPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('PPTX加载超时')), 20000))
        ]) as any;
        
        // 提取核心元数据 (core.xml) - 简化处理
        const coreXmlFile = zip.file('docProps/core.xml');
        const appXmlFile = zip.file('docProps/app.xml');
        
        if (coreXmlFile) {
          const coreXmlContent = await coreXmlFile.async('string');
          
          // 使用正则表达式提取元数据，避免完整DOM解析
          const creatorMatch = coreXmlContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i) || 
                              coreXmlContent.match(/<creator[^>]*>([^<]+)<\/creator>/i);
          if (creatorMatch && creatorMatch[1]) {
            properties.作者 = creatorMatch[1];
          }
          
          const lastModifiedByMatch = coreXmlContent.match(/<cp:lastModifiedBy[^>]*>([^<]+)<\/cp:lastModifiedBy>/i) ||
                                     coreXmlContent.match(/<lastModifiedBy[^>]*>([^<]+)<\/lastModifiedBy>/i);
          if (lastModifiedByMatch && lastModifiedByMatch[1]) {
            properties.最后一次保存者 = lastModifiedByMatch[1];
          }
          
          // 提取公司信息
          // 支持多种来源和格式
          let companyInfo = '';
          
          // 1. 从core.xml中提取公司信息，支持多种标签格式和名称
          const coreCompanyPattern = /<(?:cp:|dc:|xmp:|)(?:company|Company|Organization|organization)[^>]*>([\s\S]*?)<\/(?:cp:|dc:|xmp:|)(?:company|Company|Organization|organization)>/i;
          const coreCompanyMatch = coreXmlContent.match(coreCompanyPattern);
          if (coreCompanyMatch && coreCompanyMatch[1]) {
            companyInfo = coreCompanyMatch[1].trim();
          }
          
          // 2. 如果core.xml中没有，尝试从app.xml中提取
          if (!companyInfo && appXmlFile) {
            try {
              const appXmlContent = await appXmlFile.async('string');
              const appCompanyPattern = /<(?:Company|ApplicationCompany|ApplicationVendor|company|applicationcompany|applicationvendor|Organization|organization)[^>]*>([\s\S]*?)<\/(?:Company|ApplicationCompany|ApplicationVendor|company|applicationcompany|applicationvendor|Organization|organization)>/i;
              const appCompanyMatch = appXmlContent.match(appCompanyPattern);
              if (appCompanyMatch && appCompanyMatch[1]) {
                companyInfo = appCompanyMatch[1].trim();
              }
            } catch (error) {
              console.log('Error extracting company from app.xml:', error);
            }
          }
          
          // 3. 更新公司属性，确保始终有值
          properties.公司 = companyInfo || '未知';
        } else {
          // 确保公司属性始终有值
          properties.公司 = '未知';
        }
        
        // 提取幻灯片数量和内容
        let slideCount = 0;
        
        // 获取所有幻灯片文件
        const slideFiles = zip.file(/^ppt\/slides\/slide(\d+)\.xml$/);
        
        // 如果有幻灯片文件
        if (slideFiles.length > 0) {
          // 按幻灯片编号排序
          slideFiles.sort((a: any, b: any) => {
            const aNum = parseInt(a.name.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
            const bNum = parseInt(b.name.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
            return aNum - bNum;
          });
          
          // 对于大文件，限制提取的幻灯片数量
          const MAX_EXTRACT_SLIDES = 30; // 最多提取30张幻灯片
          const extractSlides = slideFiles.slice(0, MAX_EXTRACT_SLIDES);
          
          // 遍历幻灯片文件，但不超过最大限制
          for (const slideFile of extractSlides) {
            slideCount++;
            
            // 读取幻灯片XML内容
            const slideXmlContent = await slideFile.async('string');
            
            // 使用正则表达式提取文本，避免完整DOM解析，提高性能
            const textMatches = slideXmlContent.match(/<a:t[^>]*>([^<]+)<\/a:t>/gi) || 
                               slideXmlContent.match(/<t[^>]*>([^<]+)<\/t>/gi) || [];
            
            // 提取幻灯片标题
            textContent += `幻灯片 ${slideCount}\n`;
            
            // 提取幻灯片中的所有文本
            for (const match of textMatches) {
              const text = match.replace(/<[^>]+>/g, ''); // 移除XML标签
              if (text.trim()) {
                textContent += text + '\n';
              }
            }
            
            textContent += '\n';
          }
          
          // 更新页码范围
          properties.页码范围 = `1-${slideFiles.length}`;
          
          // 如果有更多幻灯片，添加提示信息
          if (slideFiles.length > MAX_EXTRACT_SLIDES) {
            textContent += `... 仅显示前${MAX_EXTRACT_SLIDES}张幻灯片，共${slideFiles.length}张 ...\n`;
          }
        }
      } catch (zipError) {
        console.log('提取PPTX内容时发生错误，使用默认值:', zipError);
        // 如果提取失败，使用默认的幻灯片信息
        textContent = 'PPTX演示内容（浏览器环境下解析受限）\n';
      }
      
      // 更新文本内容长度
      properties.文本内容长度 = textContent.length.toString();
      
      // 返回PPTX文件的解析结果
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

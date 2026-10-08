/**
 * 文档图片提取模块
 * 支持从 Word (.docx) 和 PDF 文件中提取图片
 */

let JSZip: any = null

async function getJSZip() {
  if (!JSZip) {
    JSZip = (await import('jszip')).default
  }
  return JSZip
}

/**
 * 从 DOCX 文件中提取图片
 * @param file DOCX 文件
 * @returns 图片数组 { name: string; url: string }[]
 */
export async function extractImagesFromDocx(file: File): Promise<Array<{ name: string; url: string }>> {
  const images: Array<{ name: string; url: string }> = []
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await (await getJSZip()).loadAsync(arrayBuffer)
    
    // 查找所有图片文件
    const imageFiles: any[] = []
    zip.forEach((path, entry) => {
      if (path.match(/^word\/media\/image\d+\.\w+$/i)) {
        imageFiles.push(entry)
      }
    })
    
    // 提取每张图片
    for (let i = 0; i < imageFiles.length; i++) {
      const entry = imageFiles[i]
      const blob = await entry.async('blob')
      const url = URL.createObjectURL(blob)
      const ext = entry.name.split('.').pop() || 'png'
      images.push({
        name: `image_${i + 1}.${ext}`,
        url
      })
    }
  } catch (error) {
    // ignore
  }
  
  return images
}

/**
 * 从 PDF 文件中提取图片（通过渲染页面为图片）
 * @param file PDF 文件
 * @param maxPages 最大提取页数
 * @returns 图片数组 { name: string; url: string }[]
 */
export async function extractImagesFromPdf(
  file: File,
  maxPages: number = 10
): Promise<Array<{ name: string; url: string }>> {
  const images: Array<{ name: string; url: string }> = []
  
  try {
    // 动态导入 pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).href
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    const pagesToExtract = Math.min(pdf.numPages, maxPages)
    
    for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 }) // 1.5倍缩放提高清晰度
      
      // 创建 canvas 渲染页面
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        await page.render({
          canvasContext: ctx,
          viewport
        }).promise
        
        // 将 canvas 转为图片
        const url = canvas.toDataURL('image/png')
        images.push({
          name: `page_${pageNum}.png`,
          url
        })
      }
    }
    
    await pdf.destroy()
  } catch (error) {
    // ignore
  }
  
  return images
}

/**
 * 根据文件类型提取图片
 * @param file 文件
 * @returns 图片数组
 */
export async function extractImagesFromFile(file: File): Promise<Array<{ name: string; url: string }>> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'docx':
      return extractImagesFromDocx(file)
    case 'pdf':
      return extractImagesFromPdf(file)
    default:
      return []
  }
}

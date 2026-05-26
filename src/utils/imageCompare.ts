export interface ImageDuplicate {
  id: number
  leftImage?: string
  rightImage?: string
  similarity: number
  leftPage: string
  rightPage: string
  leftIndex: number
  rightIndex: number
}

const HASH_SIZE = 8

function pixelToGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function resizeToGrayscale(
  imageData: ImageData,
  size: number
): number[][] {
  const { width, height, data } = imageData
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0))

  for (let cy = 0; cy < size; cy++) {
    for (let cx = 0; cx < size; cx++) {
      const srcX = Math.floor((cx / size) * width)
      const srcY = Math.floor((cy / size) * height)
      const idx = (srcY * width + srcX) * 4
      grid[cy][cx] = pixelToGray(data[idx], data[idx + 1], data[idx + 2])
    }
  }

  return grid
}

function computeDHash(grid: number[][]): string {
  const size = grid.length
  let hash = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 1; x++) {
      hash += grid[y][x] > grid[y][x + 1] ? '1' : '0'
    }
  }
  return hash
}

export function computeImageHash(imageData: ImageData): string {
  const grid = resizeToGrayscale(imageData, HASH_SIZE)
  return computeDHash(grid)
}

export function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0
  const len = Math.min(hash1.length, hash2.length)
  for (let i = 0; i < len; i++) {
    if (hash1[i] !== hash2[i]) distance++
  }
  return distance
}

export function calculateImageSimilarity(hash1: string, hash2: string): number {
  const maxDist = Math.max(hash1.length, hash2.length)
  if (maxDist === 0) return 100
  const dist = hammingDistance(hash1, hash2)
  return Math.round((1 - dist / maxDist) * 100)
}

export function extractImagesFromText(text: string): string[] {
  const urls: string[] = []
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = imgRegex.exec(text)) !== null) {
    urls.push(match[1])
  }
  const urlRegex = /https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|bmp|webp)/gi
  while ((match = urlRegex.exec(text)) !== null) {
    urls.push(match[0])
  }
  return [...new Set(urls)]
}

export function loadImageAsDataUrl(url: string): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, img.width, img.height))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export function findDuplicateImages(
  images1: string[],
  images2: string[],
  threshold: number = 80
): Promise<ImageDuplicate[]> {
  return new Promise(async (resolve) => {
    const duplicates: ImageDuplicate[] = []
    let idCounter = 0

    const hashes1: { url: string; hash: string; index: number }[] = []
    for (let i = 0; i < images1.length; i++) {
      const data = await loadImageAsDataUrl(images1[i])
      if (data) {
        const hash = computeImageHash(data)
        hashes1.push({ url: images1[i], hash, index: i })
      }
    }

    for (let i = 0; i < images2.length; i++) {
      const data = await loadImageAsDataUrl(images2[i])
      if (!data) continue
      const hash2 = computeImageHash(data)

      for (const h1 of hashes1) {
        const similarity = calculateImageSimilarity(h1.hash, hash2)
        if (similarity >= threshold) {
          duplicates.push({
            id: ++idCounter,
            leftImage: h1.url,
            rightImage: images2[i],
            similarity,
            leftPage: '',
            rightPage: '',
            leftIndex: h1.index,
            rightIndex: i,
          })
        }
      }
    }

    duplicates.sort((a, b) => b.similarity - a.similarity)
    resolve(duplicates)
  })
}

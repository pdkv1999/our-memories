export interface CompressResult {
  fullData: string
  thumbData: string
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function canvasToBase64(canvas: HTMLCanvasElement, mimeType: string, quality: number): string {
  return canvas.toDataURL(mimeType === 'image/gif' ? 'image/gif' : 'image/jpeg', quality)
}

function resizeOnCanvas(img: HTMLImageElement, maxSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  let { naturalWidth: w, naturalHeight: h } = img

  if (w > maxSize || h > maxSize) {
    if (w >= h) {
      h = Math.round((h * maxSize) / w)
      w = maxSize
    } else {
      w = Math.round((w * maxSize) / h)
      h = maxSize
    }
  }

  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

export async function compressImage(file: File): Promise<CompressResult> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const { naturalWidth: w, naturalHeight: h } = img

    const isGif = file.type === 'image/gif'
    if (isGif) {
      // Don't compress GIFs to preserve animation
      const reader = new FileReader()
      const data: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const thumbCanvas = resizeOnCanvas(img, 300)
      return {
        fullData: data,
        thumbData: canvasToBase64(thumbCanvas, file.type, 0.75),
        width: w,
        height: h,
      }
    }

    const fullCanvas = resizeOnCanvas(img, 1600)
    const thumbCanvas = resizeOnCanvas(img, 400)

    return {
      fullData: canvasToBase64(fullCanvas, file.type, 0.85),
      thumbData: canvasToBase64(thumbCanvas, file.type, 0.75),
      width: fullCanvas.width,
      height: fullCanvas.height,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function isSupported(file: File): boolean {
  const supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  return supported.includes(file.type.toLowerCase()) || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)
}

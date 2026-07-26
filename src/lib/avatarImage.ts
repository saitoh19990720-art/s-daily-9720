const MAX_AVATAR_EDGE = 256
const JPEG_QUALITY = 0.85

interface DecodedAvatarImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

export interface AvatarImageRuntime {
  decode: (file: File) => Promise<DecodedAvatarImage>
  createCanvas: (width: number, height: number) => HTMLCanvasElement
}

function validDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function targetSize(width: number, height: number): { width: number; height: number } {
  if (!validDimension(width) || !validDimension(height)) {
    throw new Error('画像サイズを取得できませんでした')
  }
  const scale = Math.min(1, MAX_AVATAR_EDGE / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

async function decodeInBrowser(file: File): Promise<DecodedAvatarImage> {
  if (typeof globalThis.createImageBitmap === 'function') {
    try {
      // 対応ブラウザではEXIF Orientationを反映した向きと寸法でCanvasへ描画する。
      const bitmap = await globalThis.createImageBitmap(file, { imageOrientation: 'from-image' })
      if (!validDimension(bitmap.width) || !validDimension(bitmap.height)) {
        bitmap.close()
        throw new Error('画像サイズを取得できませんでした')
      }
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // createImageBitmap未対応の形式は、ブラウザのImageデコードへフォールバックする。
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    const release = () => URL.revokeObjectURL(objectUrl)
    image.onload = () => {
      if (!validDimension(image.naturalWidth) || !validDimension(image.naturalHeight)) {
        release()
        reject(new Error('画像サイズを取得できませんでした'))
        return
      }
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release,
      })
    }
    image.onerror = () => {
      release()
      reject(new Error('画像を読み込めませんでした'))
    }
    image.src = objectUrl
  })
}

const browserRuntime: AvatarImageRuntime = {
  decode: decodeInBrowser,
  createCanvas: (width, height) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  },
}

export async function compressAvatarImage(
  file: File,
  runtime: AvatarImageRuntime = browserRuntime,
): Promise<string> {
  if (!file.type.toLowerCase().startsWith('image/')) {
    throw new Error('画像ファイルを選択してください')
  }

  const decoded = await runtime.decode(file)
  try {
    const size = targetSize(decoded.width, decoded.height)
    const canvas = runtime.createCanvas(size.width, size.height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('画像を変換できませんでした')

    context.clearRect(0, 0, size.width, size.height)
    context.drawImage(decoded.source, 0, 0, size.width, size.height)
    const pixels = context.getImageData(0, 0, size.width, size.height).data
    let hasTransparency = false
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 255) {
        hasTransparency = true
        break
      }
    }

    const mimeType = hasTransparency ? 'image/png' : 'image/jpeg'
    const dataUrl = canvas.toDataURL(mimeType, hasTransparency ? undefined : JPEG_QUALITY)
    if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
      throw new Error('画像を変換できませんでした')
    }
    return dataUrl
  } finally {
    decoded.release()
  }
}

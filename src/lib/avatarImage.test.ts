// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { compressAvatarImage, type AvatarImageRuntime } from './avatarImage'

interface CanvasRecord {
  width: number
  height: number
  mimeType: string
  quality?: number
  drawnWidth: number
  drawnHeight: number
}

function runtimeFor(
  sourceWidth: number,
  sourceHeight: number,
  transparent = false,
): { runtime: AvatarImageRuntime; record: CanvasRecord; release: ReturnType<typeof vi.fn> } {
  const release = vi.fn()
  const record: CanvasRecord = {
    width: 0,
    height: 0,
    mimeType: '',
    drawnWidth: 0,
    drawnHeight: 0,
  }
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn((_source, _x, _y, width: number, height: number) => {
      record.drawnWidth = width
      record.drawnHeight = height
    }),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray([0, 0, 0, transparent ? 128 : 255]),
    })),
  }
  const runtime: AvatarImageRuntime = {
    decode: vi.fn().mockResolvedValue({
      source: {} as CanvasImageSource,
      width: sourceWidth,
      height: sourceHeight,
      release,
    }),
    createCanvas: vi.fn((width: number, height: number) => {
      record.width = width
      record.height = height
      return {
        getContext: () => context,
        toDataURL: (mimeType: string, quality?: number) => {
          record.mimeType = mimeType
          record.quality = quality
          return `data:${mimeType};base64,test`
        },
      } as unknown as HTMLCanvasElement
    }),
  }
  return { runtime, record, release }
}

const imageFile = (type = 'image/png') => new File(['image'], 'avatar', { type })

describe('compressAvatarImage', () => {
  it('横長画像を長辺256pxへ縮小し、アスペクト比を維持する', async () => {
    const { runtime, record } = runtimeFor(1024, 512)
    await compressAvatarImage(imageFile(), runtime)
    expect([record.width, record.height]).toEqual([256, 128])
    expect([record.drawnWidth, record.drawnHeight]).toEqual([256, 128])
  })

  it('縦長画像を長辺256pxへ縮小し、アスペクト比を維持する', async () => {
    const { runtime, record } = runtimeFor(400, 800)
    await compressAvatarImage(imageFile(), runtime)
    expect([record.width, record.height]).toEqual([128, 256])
    expect(record.width / record.height).toBe(400 / 800)
  })

  it('256px以下でもCanvasで安全なData URLへ変換する', async () => {
    const { runtime, record } = runtimeFor(120, 80)
    await compressAvatarImage(imageFile(), runtime)
    expect([record.width, record.height]).toEqual([120, 80])
  })

  it('透過画像をPNGで出力し透過を保持する', async () => {
    const { runtime, record } = runtimeFor(100, 100, true)
    const result = await compressAvatarImage(imageFile(), runtime)
    expect(result).toBe('data:image/png;base64,test')
    expect(record.mimeType).toBe('image/png')
  })

  it('非透過画像をJPEG品質0.85で出力する', async () => {
    const { runtime, record, release } = runtimeFor(100, 100)
    const result = await compressAvatarImage(imageFile(), runtime)
    expect(result).toBe('data:image/jpeg;base64,test')
    expect(record.quality).toBe(0.85)
    expect(release).toHaveBeenCalledOnce()
  })

  it('画像以外をデコード前に拒否する', async () => {
    const { runtime } = runtimeFor(100, 100)
    await expect(compressAvatarImage(imageFile('text/plain'), runtime)).rejects.toThrow(
      '画像ファイルを選択してください',
    )
    expect(runtime.decode).not.toHaveBeenCalled()
  })
})

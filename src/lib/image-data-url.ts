/** Cap raw file size before we bother decoding (bytes). */
export const MAX_IMAGE_FILE_BYTES = 12 * 1024 * 1024

/** Soft cap for the final data URL so Express JSON stays under the body limit. */
export const MAX_IMAGE_DATA_URL_CHARS = 1_400_000

type EncodeImageOptions = {
  /** Longest side in pixels. */
  maxEdge?: number
  /** JPEG quality 0–1. */
  quality?: number
}

/**
 * Turn a picked image into a resized data URL.
 * Raw phone photos often exceed the API body limit when sent as base64.
 */
export async function fileToCompressedDataUrl(
  file: File,
  options: EncodeImageOptions = {}
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file")
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error("Image is too large")
  }

  const maxEdge = options.maxEdge ?? 1280
  const quality = options.quality ?? 0.82

  // SVG stays as-is (usually small); raster images get resized.
  if (file.type === "image/svg+xml") {
    const raw = await readFileAsDataUrl(file)
    if (raw.length > MAX_IMAGE_DATA_URL_CHARS) {
      throw new Error("Image is too large")
    }
    return raw
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Could not encode image")
    ctx.drawImage(image, 0, 0, width, height)

    // Prefer JPEG for photos; keep PNG only when the source is PNG/WebP with transparency needs.
    const preferPng = file.type === "image/png"
    let dataUrl = canvas.toDataURL(preferPng ? "image/png" : "image/jpeg", quality)
    if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
      dataUrl = canvas.toDataURL("image/jpeg", 0.7)
    }
    if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
      dataUrl = canvas.toDataURL("image/jpeg", 0.55)
    }
    if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
      throw new Error("Image is too large")
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Could not read image"))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load image"))
    image.src = src
  })
}

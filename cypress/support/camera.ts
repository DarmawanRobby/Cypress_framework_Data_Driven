/**
 * Camera injection utilities for eKYC / OCR testing.
 *
 * Provides helpers to fake the browser's MediaStream (getUserMedia) so the app
 * "sees" a static image or a looping video as the camera feed. Useful for:
 *   - KTP / ID card OCR capture
 *   - Selfie with KTP
 *   - Liveness detection (blink, head turn) — use a video sequence
 *
 * Usage in a spec or Page Object:
 *   import { fakeCamera } from '../support/camera'
 *
 *   cy.visit('/ekyc', {
 *     onBeforeLoad: fakeCamera('ekyc/ktp-sample.png'),
 *   })
 *
 * For liveness (video), convert to .y4m first:
 *   ffmpeg -i liveness.mp4 -pix_fmt yuv420p data/ekyc/liveness.y4m
 * then use the Chrome flag approach (already wired in cypress.config.ts).
 */

export interface CameraOptions {
  width?: number
  height?: number
  frameRate?: number
}

const DEFAULTS: Required<CameraOptions> = { width: 640, height: 480, frameRate: 30 }

/**
 * Returns an `onBeforeLoad` callback that stubs `getUserMedia` so the app
 * receives a MediaStream whose video track is a single static image drawn
 * on a canvas. The image path is relative to `data/` (same as fixtures).
 *
 * @example
 *   cy.visit('/ekyc', { onBeforeLoad: fakeCamera('ekyc/ktp-front.png') })
 */
export function fakeCamera(
  fixturePath: string,
  opts?: CameraOptions,
): (win: Cypress.AUTWindow) => void {
  const { width, height, frameRate } = { ...DEFAULTS, ...opts }

  return (win: Cypress.AUTWindow) => {
    const canvas = win.document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    const img = new win.Image()
    img.src = `/${fixturePath}`
    img.onload = () => ctx.drawImage(img, 0, 0, width, height)

    // Fill with a grey placeholder until the image loads, so the stream
    // is never blank (some SDKs reject an all-black first frame).
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, width, height)

    const stream = canvas.captureStream(frameRate)
    cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves(stream)
  }
}

/**
 * Variant that paints a **sequence** of images onto the canvas at a given
 * interval — simulates head-turn or blink for basic liveness checks that
 * only look for frame-to-frame change (not real depth/IR).
 *
 * @example
 *   cy.visit('/ekyc', {
 *     onBeforeLoad: fakeCameraSequence([
 *       'ekyc/face-center.png',
 *       'ekyc/face-left.png',
 *       'ekyc/face-right.png',
 *       'ekyc/face-blink.png',
 *     ], { intervalMs: 1500 }),
 *   })
 */
export function fakeCameraSequence(
  fixturePaths: string[],
  opts?: CameraOptions & { intervalMs?: number },
): (win: Cypress.AUTWindow) => void {
  const { width, height, frameRate } = { ...DEFAULTS, ...opts }
  const intervalMs = opts?.intervalMs ?? 1500

  return (win: Cypress.AUTWindow) => {
    const canvas = win.document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, width, height)

    const images = fixturePaths.map((p) => {
      const img = new win.Image()
      img.src = `/${p}`
      return img
    })

    let idx = 0
    const draw = () => {
      const img = images[idx % images.length]
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, width, height)
      }
      idx++
    }

    // Draw first frame immediately once loaded, then cycle.
    images[0].onload = draw
    win.setInterval(draw, intervalMs)

    const stream = canvas.captureStream(frameRate)
    cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves(stream)
  }
}

/**
 * Inject an image file into an `<input type="file">` (or `capture="camera"`).
 * Thin wrapper around `cy.selectFile` for readability.
 *
 * @param selector  CSS selector or data-test name for the file input
 * @param filePath  Path relative to project root (e.g. 'data/ekyc/ktp-front.png')
 * @param mode      'select' (click input) or 'drag-drop' (drop zone)
 */
export function uploadImage(
  selector: string,
  filePath: string,
  mode: 'select' | 'drag-drop' = 'select',
): void {
  const action = mode === 'drag-drop' ? 'drag-drop' : 'select'
  cy.get(selector).selectFile(filePath, { action })
}

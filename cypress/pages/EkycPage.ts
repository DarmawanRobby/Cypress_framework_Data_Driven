import { BasePage } from './BasePage'
import { fakeCamera, fakeCameraSequence } from '../support/camera'

/**
 * Page Object for a typical eKYC verification flow:
 *   1. KTP / ID card photo (OCR)
 *   2. Selfie holding KTP
 *   3. Liveness detection (blink, head turn)
 *
 * Selectors are TODO — replace with your app's actual selectors.
 */
export class EkycPage extends BasePage {
  readonly path = '/ekyc' // TODO: adjust to your app's eKYC route

  // --- selectors (keep private, expose intent methods) ---
  private readonly sel = {
    ktpUploadInput: '[data-test="ktp-upload"]', // TODO
    selfieUploadInput: '[data-test="selfie-upload"]', // TODO
    cameraPreview: '[data-test="camera-preview"]', // TODO
    captureBtn: '[data-test="capture-btn"]', // TODO
    nextBtn: '[data-test="next-step"]', // TODO
    retakeBtn: '[data-test="retake-btn"]', // TODO
    successBanner: '[data-test="ekyc-success"]', // TODO
    errorBanner: '[data-test="ekyc-error"]', // TODO
    errorMessage: '[data-test="ekyc-error-message"]', // TODO
    stepIndicator: '[data-test="step-indicator"]', // TODO
    livenessInstruction: '[data-test="liveness-instruction"]', // TODO
  }

  // --- navigation with camera injection ---

  visitWithCamera(fixturePath: string): this {
    cy.visit(this.path, { onBeforeLoad: fakeCamera(fixturePath) })
    return this
  }

  visitWithLiveness(framePaths: string[], intervalMs = 1500): this {
    cy.visit(this.path, {
      onBeforeLoad: fakeCameraSequence(framePaths, { intervalMs }),
    })
    return this
  }

  // --- step 1: KTP upload (file input or camera capture) ---

  uploadKtp(filePath: string): this {
    cy.get(this.sel.ktpUploadInput).selectFile(filePath)
    return this
  }

  captureKtp(): this {
    cy.get(this.sel.captureBtn).click()
    return this
  }

  // --- step 2: selfie with KTP ---

  uploadSelfie(filePath: string): this {
    cy.get(this.sel.selfieUploadInput).selectFile(filePath)
    return this
  }

  captureSelfie(): this {
    cy.get(this.sel.captureBtn).click()
    return this
  }

  // --- step 3: liveness ---

  startLiveness(): this {
    cy.get(this.sel.captureBtn).click()
    return this
  }

  assertLivenessInstruction(text: string): this {
    cy.get(this.sel.livenessInstruction).should('contain.text', text)
    return this
  }

  // --- shared actions ---

  nextStep(): this {
    cy.get(this.sel.nextBtn).click()
    return this
  }

  retake(): this {
    cy.get(this.sel.retakeBtn).click()
    return this
  }

  // --- assertions ---

  assertSuccess(): this {
    cy.get(this.sel.successBanner).should('be.visible')
    return this
  }

  assertError(message?: string): this {
    cy.get(this.sel.errorBanner).should('be.visible')
    if (message) {
      cy.get(this.sel.errorMessage).should('contain.text', message)
    }
    return this
  }

  assertAtStep(step: number): this {
    cy.get(this.sel.stepIndicator).should('contain.text', `${step}`)
    return this
  }

  assertCameraVisible(): this {
    cy.get(this.sel.cameraPreview).should('be.visible')
    return this
  }
}

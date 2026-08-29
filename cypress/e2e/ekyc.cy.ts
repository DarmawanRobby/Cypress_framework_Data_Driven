import { data, filterIn } from '../support/data'
import type { EkycCase } from '../support/types'
import { EkycPage } from '../pages/EkycPage'
import { Step } from '../support/step'

/**
 * eKYC verification flow — data-driven from data/ekyc/cases.json.
 *
 * Each case mocks the vendor API response (OCR / face-match / liveness) so
 * the spec tests the app's UI behavior per scenario, not the vendor SDK.
 *
 * Image injection uses:
 *   - cy.selectFile()      for file-upload inputs
 *   - fakeCamera()         for getUserMedia (camera capture)
 *   - fakeCameraSequence() for liveness with frame changes
 *
 * TODO: replace EkycPage selectors with your app's actual selectors.
 * TODO: add real fixture images under data/ekyc/ (ktp-front.png, etc.)
 */

const cases = data<EkycCase[]>('ekyc/cases')
const ekyc = new EkycPage()

// --- Group: KTP / ID card OCR ---
const ktpCases = filterIn<EkycCase>('ekyc/cases', (c) => c.step === 'ktp')

describe('eKYC — KTP / OCR', { tags: ['@ekyc', '@regression'] }, () => {
  ktpCases.forEach((tc) => {
    it(`${tc.TCID} — ${tc.desc}`, () => {
      Step('Mock vendor OCR endpoint')
      cy.intercept('POST', tc.mockEndpoint, {
        statusCode: tc.expectSuccess ? 200 : 400,
        body: tc.mockResponse,
      }).as('ocrKtp')

      Step('Inject image and submit')
      if (tc.inputType === 'camera') {
        ekyc.visitWithCamera(tc.fixture.replace('data/', ''))
        ekyc.captureKtp()
      } else {
        ekyc.visit()
        ekyc.uploadKtp(tc.fixture)
      }

      cy.wait('@ocrKtp')

      Step('Verify result')
      if (tc.expectSuccess) {
        ekyc.nextStep()
      } else {
        ekyc.assertError(tc.error ?? undefined)
      }
    })
  })
})

// --- Group: Selfie with KTP ---
const selfieCases = filterIn<EkycCase>('ekyc/cases', (c) => c.step === 'selfie')

describe('eKYC — Selfie dengan KTP', { tags: ['@ekyc', '@regression'] }, () => {
  selfieCases.forEach((tc) => {
    it(`${tc.TCID} — ${tc.desc}`, () => {
      Step('Mock vendor selfie verification')
      cy.intercept('POST', tc.mockEndpoint, {
        statusCode: tc.expectSuccess ? 200 : 400,
        body: tc.mockResponse,
      }).as('verifySelfie')

      Step('Upload selfie')
      ekyc.visit()
      ekyc.uploadSelfie(tc.fixture)

      cy.wait('@verifySelfie')

      Step('Verify result')
      if (tc.expectSuccess) {
        ekyc.nextStep()
      } else {
        ekyc.assertError(tc.error ?? undefined)
      }
    })
  })
})

// --- Group: Liveness detection ---
const livenessCases = filterIn<EkycCase>('ekyc/cases', (c) => c.step === 'liveness')

describe('eKYC — Liveness Detection', { tags: ['@ekyc', '@regression'] }, () => {
  livenessCases.forEach((tc) => {
    it(`${tc.TCID} — ${tc.desc}`, () => {
      Step('Mock vendor liveness endpoint')
      cy.intercept('POST', tc.mockEndpoint, {
        statusCode: tc.expectSuccess ? 200 : 408,
        body: tc.mockResponse,
      }).as('verifyLiveness')

      Step('Start liveness with fake camera')
      // For a real liveness test with frame changes, use:
      //   ekyc.visitWithLiveness(['ekyc/face-center.png', 'ekyc/face-left.png', ...])
      ekyc.visitWithCamera(tc.fixture.replace('data/', ''))
      ekyc.startLiveness()

      cy.wait('@verifyLiveness')

      Step('Verify result')
      if (tc.expectSuccess) {
        ekyc.assertSuccess()
      } else {
        ekyc.assertError(tc.error ?? undefined)
      }
    })
  })
})

// --- Full E2E flow (all 3 steps, happy path) ---
describe('eKYC — Full Flow (happy path)', { tags: ['@ekyc', '@smoke'] }, () => {
  it('EKYC-E2E — KTP → Selfie → Liveness berhasil', () => {
    const ktpHappy = cases.find((c) => c.TCID === 'EKYC-01')!
    const selfieHappy = cases.find((c) => c.TCID === 'EKYC-04')!
    const livenessHappy = cases.find((c) => c.TCID === 'EKYC-06')!

    // Mock all vendor endpoints
    cy.intercept('POST', ktpHappy.mockEndpoint, { body: ktpHappy.mockResponse }).as('ocrKtp')
    cy.intercept('POST', selfieHappy.mockEndpoint, { body: selfieHappy.mockResponse }).as(
      'verifySelfie',
    )
    cy.intercept('POST', livenessHappy.mockEndpoint, { body: livenessHappy.mockResponse }).as(
      'verifyLiveness',
    )

    Step('Step 1: Upload KTP')
    ekyc.visitWithCamera('ekyc/ktp-front.png')
    ekyc.captureKtp()
    cy.wait('@ocrKtp')
    ekyc.nextStep()

    Step('Step 2: Selfie dengan KTP')
    ekyc.uploadSelfie(selfieHappy.fixture)
    cy.wait('@verifySelfie')
    ekyc.nextStep()

    Step('Step 3: Liveness detection')
    ekyc.startLiveness()
    cy.wait('@verifyLiveness')

    Step('Verify eKYC berhasil')
    ekyc.assertSuccess()
  })
})

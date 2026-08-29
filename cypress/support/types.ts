// Row types for data/*.json files, keyed to the dataset each one describes.
// Add one interface per data file as you add data-driven specs — see README.md
// § Data-driven tests. `npm run new:test -- <Name> --data` also appends here.

/** One login test case (data/login.json), driven by TCID. */
export interface LoginCase {
  TCID: string
  desc: string
  username: string
  password: string
  /** Whether this case should reach the logged-in page. */
  expectSuccess: boolean
  /** Expected `#error` text when `expectSuccess` is false. */
  error?: string
}

/** One saucedemo login case (data/saucedemo/users.json), driven by TCID. */
export interface SauceLoginCase {
  TCID: string
  desc: string
  username: string
  password: string
  /** Whether this case should reach /inventory.html. */
  expectSuccess: boolean
  /** Expected `[data-test="error"]` text when `expectSuccess` is false. */
  error?: string
}

/** One eKYC test case (data/ekyc/cases.json), driven by TCID. */
export interface EkycCase {
  TCID: string
  desc: string
  /** Which eKYC step: 'ktp' (OCR), 'selfie' (face match), 'liveness' (blink/turn). */
  step: 'ktp' | 'selfie' | 'liveness'
  /** How the image is provided: 'upload' (file input) or 'camera' (getUserMedia). */
  inputType: 'upload' | 'camera'
  /** Path to the fixture image, relative to project root. */
  fixture: string
  /** Intercept pattern for the vendor API endpoint to mock. */
  mockEndpoint: string
  /** Stubbed response body from the vendor API. */
  mockResponse: Record<string, unknown>
  expectSuccess: boolean
  error: string | null
}

/** Shopping/checkout fixture for the saucedemo E2E (data/saucedemo/checkout.json). */
export interface SauceCheckout {
  /** Product names to add to the cart, as shown on the inventory page. */
  products: string[]
  customer: {
    firstName: string
    lastName: string
    postalCode: string
  }
}

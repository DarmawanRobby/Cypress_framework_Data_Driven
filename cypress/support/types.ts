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

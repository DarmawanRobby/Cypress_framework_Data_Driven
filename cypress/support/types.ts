/** A single test user. */
export interface User {
  /** Stable key used to look up the user, e.g. 'standard', 'lockedOut'. */
  role: string
  username: string
  password: string
  /** Whether this user is expected to reach the inventory page. */
  canLogin: boolean
  /** Expected error message when `canLogin` is false. */
  error?: string
}

/** Roster loaded from data/users.json. */
export type UserRoster = User[]

/** A single login test case (data/login.json), driven by TCID. */
export interface LoginCase {
  TCID: string
  desc: string
  username: string
  password: string
  /** Whether this case should reach the inventory page. */
  expectSuccess: boolean
  /** Expected error message when `expectSuccess` is false. */
  error?: string
}

/** Find a user by role; throws if absent so tests fail loudly on bad data. */
export const byRole = (users: UserRoster, role: string): User => {
  const user = users.find((u) => u.role === role)
  if (!user) throw new Error(`No user with role "${role}" in roster`)
  return user
}

/** One row of data/cart.json — a product to add to the cart. */
export interface CartRow {
  id: string // product slug used in the add-to-cart data-test hook
  name: string // display name shown in the cart
}

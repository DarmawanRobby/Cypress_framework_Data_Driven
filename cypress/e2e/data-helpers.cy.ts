import { data, findIn, filterIn } from '../support/data'
import type { User } from '../support/types'

// Demo: how to read a whole file, get one specific record, and search many.
// Results are printed to the terminal via cy.task('log').
describe('Data helpers (demo)', () => {
  it("data('users') — read the whole file", () => {
    const all = data<User[]>('users')
    cy.task('log', `data('users') → ${all.length} records: [${all.map((u) => u.role).join(', ')}]`)
    expect(all).to.have.length.greaterThan(0)
  })

  it('findIn() — get ONE specific record by field', () => {
    const locked = findIn<User>('users', (u) => u.role === 'lockedOut')
    cy.task('log', `findIn('users', role==lockedOut) → ${locked.username}`)
    expect(locked.username).to.eq('locked_out_user')
  })

  it('filterIn() — search MANY records (by condition)', () => {
    const canLogin = filterIn<User>('users', (u) => u.canLogin)
    cy.task('log', `filterIn('users', canLogin) → [${canLogin.map((u) => u.role).join(', ')}]`)
    expect(canLogin.length).to.be.greaterThan(1)
  })

  it('filterIn() — partial / substring search', () => {
    const glitchy = filterIn<User>('users', (u) => u.username.includes('glitch'))
    cy.task('log', `filterIn('users', username~"glitch") → [${glitchy.map((u) => u.username)}]`)
    expect(glitchy).to.have.length(1)
  })
})
